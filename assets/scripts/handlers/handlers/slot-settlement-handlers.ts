import gc from "@sg/game-client-base";
import { tween } from "cc";
import { AnimationUtils } from "db://shared-components/shared/utils";
import inversify from "inversify";
import mobx from "mobx";
import { LineData, paylines, SlotNotification, SlotState, SpecialSymbol } from "../../definitions";
import { BetControlStore } from "../stores/bet-control-store";
import { SlotBoardStore } from "../stores/slot-board-store";
import { SlotDurationStore } from "../stores/slot-duration-store";
import { SlotBetHandler } from "./slot-bet-handlers";
import { SlotErrorHandler } from "./slot-error-handler";
const { injectable, inject } = inversify;
@injectable()
export class SlotSettlementHandler {
    @inject(BetControlStore) protected readonly betControlStore: BetControlStore;
    @inject(SlotBoardStore) protected readonly slotBoardStore: SlotBoardStore;
    @inject(SlotDurationStore) protected readonly slotDurationStore: SlotDurationStore;
    @inject(gc.Connection.ConnectionStore) protected readonly connectionStore: gc.Connection.ConnectionStore;
    @inject(SlotBetHandler) protected readonly slotBetHandler: SlotBetHandler;
    @inject(gc.Bet.BetStore) protected readonly betStore: gc.Bet.BetStore;
    @inject(gc.Error.ErrorStore) protected readonly errorStore: gc.Error.ErrorStore;
    @inject(SlotErrorHandler) protected readonly slotErrorHandler: SlotErrorHandler;

    eventHandleList = [
        {
            name: "finish",
            handle: this.handleFinish,
        },
        {
            name: "bonuses",
            handle: this.handleBonuses,
        },
        {
            name: "bonusChest",
            handle: this.handleBonusChest,
        },
        {
            name: "jackpot",
            handle: this.handleJackpot,
        },
        {
            name: "winningJackpot",
            handle: this.handleWinningJackpot,
        },
    ];

    settleTween = null;
    timeoutNextSpin: NodeJS.Timeout;

    constructor() {
        setTimeout(() => {
            mobx.reaction(
                () => this.slotBoardStore.forceStopSettle,
                () => this.finishSettlement()
            );

            mobx.reaction(
                () => this.errorStore.apiError,
                (apiError) => {
                    if (apiError) {
                        this.slotBetHandler.handlePlaceBetFailed();
                    }
                }
            );

            mobx.reaction(
                () => this.betStore.lastReceivedBet,
                (lastReceivedBet) => {
                    if (lastReceivedBet?.value === -1) {
                        this.slotBetHandler.handlePlaceBetFailed();
                    }
                }
            );
        }, 0);
    }

    reset() {
        this.stopSettleTween();
        this.timeoutNextSpin && clearTimeout(this.timeoutNextSpin);
        this.timeoutNextSpin = null;
        this.slotBoardStore.reset();
    }

    requestOpenJackpot(index: number) {
        this.connectionStore.connection.emit("jackpot", { chest: index });
    }

    requestOpenBonus(index: number) {
        this.connectionStore.connection.emit("bonus", { chest: index });
    }

    handleBonusChest(bonusChest: any) {
        this.slotBoardStore.bonusChest = bonusChest;
    }

    handleWinningJackpot(winningJackpot: any) {
        this.slotBoardStore.winningJackpot = winningJackpot;
    }

    async handleJackpot(jackpot: any) {
        await this.spinResultSpecialCase(jackpot);
        this.slotBoardStore.winningItemsOnLines = [
            { payline: jackpot.winningLine, positions: paylines[jackpot.winningLine], symbol: jackpot.symbol },
        ];
        this.slotBoardStore.winningLines = [
            { payline: jackpot.winningLine, positions: paylines[jackpot.winningLine], symbol: jackpot.symbol },
        ];
        this.slotBoardStore.receivedJackpot = { jackpot, duration: this.slotDurationStore.jackpotDuration };
    }

    async handleBonuses(bonuses: any) {
        if (this.slotBoardStore.receivedJackpot) {
            await AnimationUtils.delayTime(this.slotDurationStore.showJackpotWinningAmountDuration);
        } else {
            await this.spinResultSpecialCase(bonuses);
        }

        if (bonuses.bonus) {
            this.slotBoardStore.receivedBonus = { bonus: bonuses.bonus, duration: this.slotDurationStore.bonusDuration };
        }
    }

    async spinResultSpecialCase(data: { roundId: number; result: number[] }) {
        const { roundId, result } = data;
        this.betControlStore.roundId = roundId;
        await this.spin(result);
    }

    protected async spin(result: number[]) {
        return new Promise<void>((resolve) => {
            this.slotBoardStore.slotState = SlotState.SPINNING;
            this.slotBoardStore.spinResult = {
                result,
                duration: this.slotDurationStore.spinDuration,
                turbo: this.betControlStore.turboEnabledOnSpin,
                onComplete: () => {
                    this.slotBoardStore.slotState = SlotState.SPIN_DONE;
                    resolve();
                },
            };
        });
    }

    async handleFinish(finish: any) {
        const { result, settlementResult, betWin, bigWin, roundId, totalOfFreeSpins, betByFreeSpin } = finish;
        const { winningLines, jackpot, bonus, freeSpins } = settlementResult;
        const newFreeSpinCount = freeSpins.count ?? 0;

        this.betControlStore.roundId = roundId;

        await this.spinOrAwait(bonus, jackpot, result);

        this.slotBoardStore.winningItemsOnLines = winningLines;
        this.handleWinningSpecialSymbols(bonus, newFreeSpinCount);

        this.betControlStore.setTotalFreeSpins(totalOfFreeSpins);
        const isSpecialCases = bigWin || newFreeSpinCount > 0 || betByFreeSpin || this.betControlStore.autoSpinEnabled;
        if (!isSpecialCases) {
            this.settleDone();
        }
        if (betWin === 0) {
            this.slotBoardStore.winningBet = betWin;
        }

        this.handleSettleTween(bigWin, newFreeSpinCount, betWin, jackpot, winningLines, freeSpins);
    }

    protected handleSettleTween(bigWin: any, newFreeSpinCount: any, betWin: any, jackpot: any, winningLines: any, freeSpins: any) {
        const bigWinOrGotFreeSpin = bigWin || newFreeSpinCount > 0;
        if (!bigWinOrGotFreeSpin) {
            this.slotBoardStore.bottomMessageState = SlotNotification.SETTLED;
        }
        const showResultBoardDuration =
            betWin > 0 && !bigWin ? this.slotDurationStore.winningDuration : this.slotDurationStore.noWinningDuration;

        const sequenceTweens = [];
        sequenceTweens.push(tween().call(() => this.showWinningLines(betWin, bigWin, jackpot, winningLines)));
        sequenceTweens.push(tween().delay(showResultBoardDuration));
        if (bigWin) {
            sequenceTweens.push(this.createTweenShowBigWin(betWin, bigWin));
        }
        if (bigWinOrGotFreeSpin) {
            sequenceTweens.push(
                tween().call(() => {
                    this.slotBoardStore.bottomMessageState = SlotNotification.SETTLED;
                })
            );
        }
        if (newFreeSpinCount > 0) {
            sequenceTweens.push(this.createTweenShowFreeSpins(freeSpins));
        }

        this.settleTween = tween(this)
            .sequence(...sequenceTweens)
            .call(() => {
                this.finishSettlement();
                this.slotErrorHandler.handleEndGameApiError();
                this.checkSpinNextRound();
            })
            .start();
    }

    private handleWinningSpecialSymbols(bonus: any, newFreeSpinCount: any) {
        const highlightSpecialSymbols = [];
        if (bonus.count > 0) {
            highlightSpecialSymbols.push(SpecialSymbol.BONUS);
        }
        if (newFreeSpinCount > 0) {
            highlightSpecialSymbols.push(SpecialSymbol.FREESPIN);
        }
        this.slotBoardStore.highlightSpecialSymbols = highlightSpecialSymbols;
    }

    protected async spinOrAwait(bonus: any, jackpot: any, result: any) {
        if (bonus.count > 0) {
            await AnimationUtils.delayTime(this.slotDurationStore.showTotalBonusAmountDuration);
        } else {
            if (jackpot) {
                await AnimationUtils.delayTime(this.slotDurationStore.showJackpotWinningAmountDuration);
            } else {
                await this.spin(result);
            }
        }
    }

    createTweenShowFreeSpins(freeSpins: any) {
        return tween()
            .call(() => {
                this.slotBoardStore.highlightSpecialSymbols = [SpecialSymbol.FREESPIN];
                this.slotBoardStore.receivedFreeSpins = { freeSpins, duration: this.slotDurationStore.freespinDuration };
            })
            .delay(this.slotDurationStore.freespinDuration)
            .call(() => this.betControlStore.syncFreeSpinCount());
    }

    createTweenShowBigWin(betWin: number, bigWin: boolean) {
        const duration = this.slotDurationStore.bigWinDuration;
        const showBigWinValue = this.slotDurationStore.showBigWinValueDuration;
        const delayShowBigWinValue = this.slotDurationStore.delayShowBigWinValue;

        const delayToUpdateWinningBet = showBigWinValue + delayShowBigWinValue;
        const delayToEndBigWin = duration - delayToUpdateWinningBet;
        return tween()
            .call(() => {
                this.slotBoardStore.receivedBigWin = {
                    amount: betWin,
                    bigWin,
                    duration,
                    showBigWinValue,
                    delayShowBigWinValue,
                };
            })
            .delay(delayToUpdateWinningBet)
            .call(() => (this.slotBoardStore.winningBet = betWin))
            .delay(delayToEndBigWin);
    }

    protected showWinningLines(betWin: number, bigWin: boolean, jackpot: any, winningLines: LineData[]) {
        if (betWin > 0 && !bigWin) {
            this.slotBoardStore.winningBet = betWin;
        }

        const lines: LineData[] = [];
        if (jackpot) {
            lines.push({
                payline: jackpot.winningLine,
                positions: jackpot.positions,
                symbol: jackpot.symbol,
            });
        }
        lines.push(...winningLines);
        this.slotBoardStore.winningLines = lines;
    }

    stopSettleTween() {
        if (this.settleTween) {
            this.settleTween.stop();
            this.settleTween = null;
        }
    }

    protected settleDone() {
        this.slotBoardStore.slotState = SlotState.SETTLED;
    }

    protected finishSettlement() {
        this.reset();
    }

    protected checkSpinNextRound() {
        if (this.betControlStore.freeSpinEnabled) {
            this.scheduleNextSpin(() => {
                this.betControlStore.decreaseFreeSpinCount();
                this.slotBetHandler.callBet();
            });
            return;
        }

        this.betControlStore.clearFreeSpins();
        if (this.betControlStore.autoSpinEnabled) {
            this.scheduleNextSpin(() => this.slotBetHandler.actionAutoSpin());
            return;
        }

        if (this.betControlStore.triggerAutoSpin) {
            this.scheduleNextSpin(() => this.slotBetHandler.callBet());
        }
    }

    protected scheduleNextSpin(action: () => void) {
        const delayDuration = 1000;
        this.timeoutNextSpin = setTimeout(() => {
            action();
        }, delayDuration);
    }
}
