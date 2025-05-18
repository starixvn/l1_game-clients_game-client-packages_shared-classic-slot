import gc from "@sg/game-client-base";
import { tween } from "cc";
import { AnimationUtils } from "db://shared-components/shared/utils";
import inversify from "inversify";
import { LineData, paylines, SlotState, SpecialSymbol } from "../../definitions";
import { BetControlStore } from "../stores/bet-control-store";
import { SlotBoardStore } from "../stores/slot-board-store";
import { SlotDurationStore } from "../stores/slot-duration-store";
import { SlotBetHandler } from "./slot-bet-handlers";
const { injectable, inject } = inversify;
@injectable()
export class SlotSettlementHandler {
    @inject(BetControlStore) private betControlStore: BetControlStore;
    @inject(SlotBoardStore) private slotBoardStore: SlotBoardStore;
    @inject(SlotDurationStore) private slotDurationStore: SlotDurationStore;
    @inject(gc.Connection.ConnectionStore) private connectionStore: gc.Connection.ConnectionStore;
    @inject(SlotBetHandler) private slotBetHandler: SlotBetHandler;

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

    reset() {
        this.stopSettleTween();
        this.slotBoardStore.reset();
    }

    requestOpenJackpot(index: number) {
        this.connectionStore.connection.emit("jackpot", { chest: index });
    }

    requestOpenBonus(index: number) {
        this.connectionStore.connection.emit("bonus", { chest: index });
    }

    handleBonusChest(bonusChest: any) {
        console.log("handleBonusChest", bonusChest);
        this.slotBoardStore.bonusChest = bonusChest;
    }

    handleWinningJackpot(winningJackpot: any) {
        console.log("handleWinningJackpot", winningJackpot);
        this.slotBoardStore.winningJackpot = winningJackpot;
    }

    async handleJackpot(jackpot: any) {
        console.log("handleJackpot", jackpot);
        await this.spinResultSpecialCase(jackpot);
        this.slotBoardStore.winningItems = [
            { payline: jackpot.winningLine, positions: paylines[jackpot.winningLine], symbol: jackpot.symbol },
        ];
        this.slotBoardStore.winningLines = [
            { payline: jackpot.winningLine, positions: paylines[jackpot.winningLine], symbol: jackpot.symbol },
        ];
        this.slotBoardStore.receivedJackpot = { jackpot, duration: this.slotDurationStore.jackpotDuration };
    }

    async handleBonuses(bonuses: any) {
        console.log("handleBonuses", bonuses);
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
        console.log("spinResultSpecialCase", data);
        const { roundId, result } = data;
        this.betControlStore.roundId = roundId;
        await this.spin(result);
    }

    protected async spin(result: number[]) {
        this.slotBoardStore.slotState = SlotState.SPINNING;
        this.slotBoardStore.spinResult = {
            result,
            duration: this.slotDurationStore.spinDuration,
            turbo: this.betControlStore.turboEnabled,
        };
        await AnimationUtils.delayTime(this.slotDurationStore.totalSpinDuration);
    }

    async handleFinish(finish: any) {
        console.log("handleFinish", finish);
        const { result, settlementResult, betWin, bigWin, roundId, totalOfFreeSpins, betByFreeSpin } = finish;
        const { winningLines, jackpot, bonus, freeSpins } = settlementResult;
        const newFreeSpinCount = freeSpins.count ?? 0;

        this.betControlStore.roundId = roundId;

        //TODO : check again case jackpot and bonus
        if (bonus.count > 0) {
            await AnimationUtils.delayTime(this.slotDurationStore.showTotalBonusAmountDuration);
        } else {
            if (jackpot) {
                await AnimationUtils.delayTime(this.slotDurationStore.showJackpotWinningAmountDuration);
            } else {
                await this.spin(result);
            }
        }

        this.slotBoardStore.winningItems = winningLines;
        const highlightSpecialSymbols = [];
        if (bonus.count > 0) {
            highlightSpecialSymbols.push(SpecialSymbol.BONUS);
        }
        if (newFreeSpinCount > 0) {
            highlightSpecialSymbols.push(SpecialSymbol.FREESPIN);
        }
        this.slotBoardStore.highlightSpecialSymbols = highlightSpecialSymbols;

        this.betControlStore.setTotalFreeSpins(totalOfFreeSpins);
        const isSpecialCases = bigWin || newFreeSpinCount > 0 || betByFreeSpin || this.betControlStore.autoSpinEnabled;
        if (!isSpecialCases) {
            this.settleDone();
        }
        if (betWin === 0) {
            this.betControlStore.winningBet = betWin;
        }

        const bigWinOrGotFreeSpin = bigWin || newFreeSpinCount > 0;
        if (!bigWinOrGotFreeSpin) {
            // this.main.showMessageDisplay(SlotNotification.SETTLED);
        }
        const showResultBoardDuration =
            betWin > 0 && !bigWin ? this.slotDurationStore.winningDuration : this.slotDurationStore.noWinningDuration;

        const sequenceTweens = [];
        sequenceTweens.push(tween().delay(showResultBoardDuration));
        sequenceTweens.push(tween().call(() => this.showWinningLines(betWin, bigWin, jackpot, winningLines)));
        if (bigWin) {
            sequenceTweens.push(this.createTweenShowBigWin(betWin, bigWin));
        }
        if (bigWinOrGotFreeSpin) {
            sequenceTweens.push(
                tween().call(() => {
                    // this.showMessageDisplay(SlotNotification.SETTLED);
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
                this.checkSpinNextRound();
            })
            .start();
    }

    createTweenShowFreeSpins(freeSpins: any) {
        return tween()
            .call(() => {
                this.slotBoardStore.highlightSpecialSymbols = [SpecialSymbol.FREESPIN];
                this.slotBoardStore.receivedFreeSpins = { freeSpins, duration: this.slotDurationStore.freespinDuration };
            })
            .delay(this.slotDurationStore.freespinDuration)
            .call(() => (this.betControlStore.freeSpinCount = freeSpins.count));
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
            .call(() => (this.betControlStore.winningBet = betWin))
            .delay(delayToEndBigWin)
            .start();
    }

    protected showWinningLines(betWin: number, bigWin: boolean, jackpot: any, winningLines: LineData[]) {
        if (betWin > 0 && !bigWin) {
            this.betControlStore.winningBet = betWin;
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
        this.slotBoardStore.reset();
        this.slotBoardStore.slotState = SlotState.READY;
    }

    protected checkSpinNextRound() {
        if (this.betControlStore.freeSpinCount > 0) {
            this.slotBetHandler.callBet();
        } else {
            if (this.betControlStore.autoSpinEnabled) {
                this.slotBetHandler.actionAutoSpin();
            } else {
                if (this.betControlStore.triggerAutoSpin) {
                    setTimeout(() => {
                        this.slotBetHandler.callBet();
                    }, 1000);
                }
            }
        }
    }
}
