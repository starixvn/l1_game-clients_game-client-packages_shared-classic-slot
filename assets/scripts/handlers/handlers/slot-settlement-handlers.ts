import gc from "@sg/game-client-base";
import { tween } from "cc";
import { FSBPromotionUIHandler } from "db://shared-common-slot/fsb-promotion/scripts/handlers/fsb-promotion-ui-handler";
import { FreeSpinsPromotionEvents, FSBPromotionUIStore } from "db://shared-common-slot/fsb-promotion/scripts/stores/fsb-promotion-ui-store";
import { AnimationUtils, FunctionUtils } from "db://shared-components/shared/utils";
import inversify from "inversify";
import mobx from "mobx";
import { LineData, paylines, SlotGameServiceMessage, SlotNotification, SlotState, SpecialSymbol } from "../../definitions";
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
    @inject(gc.Auth.AuthHandlers.GetBalance) protected readonly getBalanceHandler: gc.Auth.AuthHandlers.GetBalance;
    @inject(gc.Player.MainPlayerStore) protected readonly mainPlayerStore: gc.Player.MainPlayerStore;
    @inject(FSBPromotionUIHandler) protected readonly fsbPromotionUIHandler: FSBPromotionUIHandler;
    @inject(FSBPromotionUIStore) protected readonly fsbPromotionUIStore: FSBPromotionUIStore;

    eventHandleList = [
        {
            name: SlotGameServiceMessage.Settlement,
            handle: this.handleFinish,
        },
        {
            name: SlotGameServiceMessage.Bonuses,
            handle: this.handleBonuses,
        },
        {
            name: SlotGameServiceMessage.BonusChest,
            handle: this.handleBonusChest,
        },
        {
            name: SlotGameServiceMessage.Jackpot,
            handle: this.handleJackpot,
        },
        {
            name: SlotGameServiceMessage.WinningJackpot,
            handle: this.handleWinningJackpot,
        },
        {
            name: SlotGameServiceMessage.FreeSpins,
            handle: this.handleFreeSpins,
        },
    ];

    settleTween = null;
    timeoutNextSpin: NodeJS.Timeout;

    constructor() {
        setTimeout(() => {
            mobx.reaction(
                () => this.slotBoardStore.forceStopSettle,
                () => this.stopSettleTween()
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

    clearSettlement() {
        this.stopSettleTween();
        this.slotBoardStore.clearSettlement();
    }

    requestOpenJackpot(index: number) {
        this.connectionStore.connection.emit("jackpot", { chest: index });
    }

    requestOpenBonus(index: number) {
        this.connectionStore.connection.emit("bonus", { chest: index });
    }

    handleBonusChest(bonusChest: any) {
        bonusChest.amount = Math.round(bonusChest.amount * this.mainPlayerStore.xMode * 100) / 100;
        this.slotBoardStore.bonusChest = bonusChest;
    }

    handleWinningJackpot(winningJackpot: any) {
        this.slotBoardStore.winningJackpot = {
            winnerName: winningJackpot.winnerName,
            pool: winningJackpot.pool,
            amount: gc.NumberUtils.getValueByCurrency(winningJackpot.amount, this.mainPlayerStore.rate),
        };
    }

    async handleJackpot(jackpot: any) {
        await this.spinResultSpecialCase(jackpot);
        if (this.slotBoardStore.hasInterruption) {
            this.onFinishSettlement(0);
            return;
        }
        this.slotBoardStore.winningItemsOnLines = [
            { payline: jackpot.winningLine, positions: paylines[jackpot.winningLine], symbol: jackpot.symbol },
        ];
        this.slotBoardStore.winningLines = [
            { payline: jackpot.winningLine, positions: paylines[jackpot.winningLine], symbol: jackpot.symbol },
        ];

        !this.slotBoardStore.hasInterruption && await this.showEffectJackpot(jackpot);
        !this.slotBoardStore.hasInterruption && await this.showJackpotGame(jackpot);
        if (this.slotBoardStore.hasInterruption) {
            this.onFinishSettlement(0);
        }
    }

    showJackpotGame(jackpot: any) {
        return new Promise<void>((resolve) => {
            this.slotBoardStore.showJackpotGame =
                { jackpot, duration: this.slotDurationStore.jackpotDuration, onComplete: resolve };
        });
    }

    showEffectJackpot(jackpot: any) {
        return new Promise<void>((resolve) => {
            this.slotBoardStore.receivedJackpot =
                { jackpot, duration: this.slotDurationStore.jackpotDuration, onComplete: resolve };
        });
    }

    async handleBonuses(bonuses: any) {
        if (this.slotBoardStore.receivedJackpot) {
            await AnimationUtils.delayTime(this.slotDurationStore.showJackpotWinningAmountDuration);
        } else {
            await this.spinResultSpecialCase(bonuses);
        }
        if (bonuses.bonus) {
            !this.slotBoardStore.hasInterruption && await this.showEffectBonus(bonuses.bonus);
            !this.slotBoardStore.hasInterruption && await this.showBonusDialog(bonuses.bonus);
        }
        if (this.slotBoardStore.hasInterruption) {
            this.onFinishSettlement(0);
        }
    }

    showBonusDialog(bonus: any) {
        return new Promise<void>((resolve) => {
            this.slotBoardStore.showBonusDialog = { bonus, duration: this.slotDurationStore.bonusDuration, onComplete: resolve };
        });
    }

    showEffectBonus(bonus: any) {
        return new Promise<void>((resolve) => {
            this.slotBoardStore.receivedBonus = { bonus, duration: this.slotDurationStore.bonusDuration, onComplete: resolve };
        });
    }

    async spinResultSpecialCase(data: { roundId: number; result: number[] }) {
        const { roundId, result } = data;
        this.betControlStore.roundId = roundId;
        await this.spin(result);
    }

    protected async spin(result: number[]) {
        return new Promise<void>((resolve) => {
            this.betControlStore.decreaseFreeSpinCount();
            this.slotBoardStore.slotState = SlotState.SPINNING;
            this.fsbPromotionUIStore.isSpinningFSB = true;
            this.slotBoardStore.spinResult = {
                result,
                duration: this.slotDurationStore.spinDuration,
                turbo: this.betControlStore.turboEnabledOnSpin,
                onComplete: () => {
                    this.slotBoardStore.slotState = SlotState.SPIN_DONE;
                    this.fsbPromotionUIStore.isSpinningFSB = false;
                    resolve();
                },
            };
        });
    }

    handleUpdateBalance(changeUserBalance: boolean) {
        if (changeUserBalance) {
            this.getBalanceHandler.handle();
        }
    }

    async handleFinish(finish: any) {
        const { result, settlementResult, betWin, bigWin, roundId, totalOfFreeSpins, betByFreeSpin } = finish;
        const currentBetWin = Math.round(betWin * this.mainPlayerStore.xMode * 100) / 100;
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
        if (currentBetWin === 0) {
            this.updateWinningBet(currentBetWin);
        }
        if (this.slotBoardStore.hasInterruption) {
            this.onFinishSettlement(currentBetWin);
        } else {
            this.handleSettleTween(bigWin, newFreeSpinCount, currentBetWin, jackpot, winningLines, freeSpins);
        }
    }

    protected updateWinningBet(betWin: number) {
        this.slotBoardStore.winningBet = betWin;
        this.getBalanceHandler.handle();
    }

    protected handleSettleTween(bigWin: any, newFreeSpinCount: any, betWin: number, jackpot: any, winningLines: any, freeSpins: any) {
        const gotFreeSpin = newFreeSpinCount > 0;
        const bigWinOrGotFreeSpin = bigWin || gotFreeSpin;
        if (!bigWinOrGotFreeSpin) {
            this.slotBoardStore.bottomMessageState = SlotNotification.SETTLED;
        }
        const showResultBoardDuration =
            betWin > 0 && !bigWin ? this.slotDurationStore.winningDuration : this.slotDurationStore.noWinningDuration;

        const sequenceTweens = [];
        if (!gotFreeSpin || this.betControlStore.turboEnabledOnSpin) {
            sequenceTweens.push(tween().call(() => this.showWinningLines(betWin, bigWin, jackpot, winningLines)));
            sequenceTweens.push(tween().delay(showResultBoardDuration));
            if (bigWin) {
                sequenceTweens.push(this.createTweenShowBigWin(betWin, bigWin));
            }
        }
        if (bigWinOrGotFreeSpin) {
            sequenceTweens.push(
                tween().call(() => {
                    this.slotBoardStore.bottomMessageState = SlotNotification.SETTLED;
                })
            );
        }
        if (gotFreeSpin) {
            sequenceTweens.push(this.createTweenShowFreeSpins(freeSpins));
        }

        this.settleTween = tween(this)
            .sequence(...sequenceTweens)
            .call(() => {
                this.onFinishSettlement(betWin);
            })
            .start();
    }

    protected onFinishSettlement(betWin: number) {
        this.betControlStore.syncFreeSpinCount();
        if (this.betControlStore.freeSpinEnabled) {
            this.betControlStore.setFreeSpinStake(this.betControlStore.stake);
        }
        this.finishSettlement();
        this.fsbPromotionUIHandler.updateTotalWin({ win: betWin, totalFreeSpins: this.betControlStore.freeSpinCount });
        this.slotBoardStore.resetToReady();
        const isEndGameError = this.slotErrorHandler.handleEndGameApiError();

        if (!isEndGameError) {
            this.checkSpinNextRound();
        }
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
            .delay(this.slotDurationStore.freespinDuration + this.slotDurationStore.transitionDuration)
            .call(() => {
                this.betControlStore.setFreeSpinStake(this.betControlStore.stake);
                this.betControlStore.syncFreeSpinCount();
            });
    }

    createTweenShowBigWin(betWin: number, bigWin: boolean) {
        const transitionDuration = this.slotDurationStore.transitionDuration;
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
            .delay(transitionDuration + delayToUpdateWinningBet)
            .call(() => this.updateWinningBet(betWin))
            .delay(delayToEndBigWin);
    }

    protected showWinningLines(betWin: number, bigWin: boolean, jackpot: any, winningLines: LineData[]) {
        if (betWin > 0 && !bigWin) {
            this.updateWinningBet(betWin);
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

        this.timeoutNextSpin && clearTimeout(this.timeoutNextSpin);
        this.timeoutNextSpin = null;
    }

    protected settleDone() {
        this.slotBoardStore.slotState = SlotState.SETTLED;
    }

    protected finishSettlement() {
        this.clearSettlement();
    }

    protected async checkSpinNextRound() {
        if (this.betControlStore.freeSpinEnabled) {
            this.scheduleNextSpin(() => {
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
        if (this.fsbPromotionUIStore.isShowFreeSpinMessage) {
            this.fsbPromotionUIHandler.changeUIPendingEvent(FreeSpinsPromotionEvents.OPEN_PROMOTION_INFO);
        }
        this.betControlStore.isFreeSpinEffectCompleted = true;
        this.fsbPromotionUIHandler.tryShowEndedPopup();
        if (this.fsbPromotionUIStore.isShowFreeSpinMessage) {
            this.fsbPromotionUIHandler.openPromotionInfo();
            this.fsbPromotionUIHandler.setShowFreeSpinMessage(false);
            await FunctionUtils.waitUntil(() => this.fsbPromotionUIStore.isFSBInfoReady, 100, 10000).catch(() => { });
        }
        this.checkToSpinNextFSB();
    }

    checkToSpinNextFSB() {
        if (this.fsbPromotionUIStore.canSpinNextFSB) {
            this.fsbPromotionUIHandler.tryConsumeFSB();
            this.slotBetHandler.callBet();
        }
    }

    protected scheduleNextSpin(action: () => void) {
        if (this.betControlStore.isReadyBet) {
            const delayDuration = 1000;
            this.slotBoardStore.slotState = SlotState.AUTO_SPIN;
            this.timeoutNextSpin = setTimeout(() => {
                action();
            }, delayDuration);
        }
    }

    handleFreeSpins(freeSpins: { total: number; bet: number; promotionId?: string }) {
        const total = freeSpins.total;
        if (total > 0) {
            this.betControlStore.setFreeSpinStake(freeSpins.bet);
            this.betControlStore.setTotalFreeSpins(total);
            this.betControlStore.syncFreeSpinCount();
            if (freeSpins.promotionId) {
                this.fsbPromotionUIStore.resumedFSBPromotion = true;
            }

            this.scheduleNextSpin(() => {
                this.slotBetHandler.callBet();
            });
        }
    }
}
