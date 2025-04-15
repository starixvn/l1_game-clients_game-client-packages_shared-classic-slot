import GameUtils from "../../../common/GameUtils";
import DataHandler from "../../_base/handlers/DataHandler";
import SlotGameBase, { LineData } from "../SlotGameBase";
import { SlotNotification } from "../SlotGameBottomMessage";

export default class SlotGameSettlementHandler implements DataHandler {
    private receivedJackpot = false;
    constructor(protected readonly main: SlotGameBase) {}

    async handle(data: any) {
        if (data.apiError) {
            this.handleApiError(data);
            this.main.isFinishedRound = true;
        }
        if (data.jackpot) {
            if (this.main.isSpinnedAction) {
                this.receivedJackpot = true;
                await this.handleNewJackpot(data.jackpot);
            }
        }

        if (data.bonuses) {
            if (this.main.isSpinnedAction) {
                if (this.receivedJackpot) {
                    await this.waitingHandleSpecialCase(this.main.slotGameConfigs.showJackpotWinningAmountDuration);
                }
                this.handleBonuses(data.bonuses);
            }
        }

        if (data.jackpotError) {
            this.main.showMiniWarning(data.jackpotError);
        }

        if (data.finish) {
            if (this.main.isSpinnedAction) {
                await this.handleFinish(data.finish);
                this.main.isFinishedRound = true;
                this.main.isSpinnedAction = false;
                this.receivedJackpot = false;
            }
        }
    }

    handleApiError(data: any) {
        const error = data.apiError;
        const gameId = error.gameTypeId;
        if (gameId === this.main.gameId && this.main.waitingSpinResult && !data.endBet) {
            this.main.cacheApiError = error;
        } else {
            this.main.currentMiniPanel.handleAPIError(error);
            this.main.resetStateButtons();
        }
    }

    async handleBonuses(bonuses: any) {
        !this.receivedJackpot && (await this.spinResultSpecialCase(bonuses));
        await this.handleBonus(bonuses.bonus);
    }

    async handleNewJackpot(jackpot: any) {
        await this.spinResultSpecialCase(jackpot);
        await this.main.handleNewJackpot(jackpot);
    }

    async spinResultSpecialCase(data: { roundId: number; result: number[] }) {
        this.beforeSpin();
        this.updateFreeSpinCount();

        const { roundId, result } = data;
        this.main.setGameRound(roundId);

        await this.main.setDataAndSpin(result);
    }

    updateFreeSpinCount() {
        this.main.setTotalFreeSpins(this.main.totalFreeSpins - 1);
        this.main.updateDisplaySpinButtons();
    }

    beforeSpin() {
        this.main.deactiveButtons();
        this.main.spinButton.showTextSpinInFreeSpin(false);
        this.main.showProcessingWarning(false);
        this.main.isAnimatingResult = true;
    }

    async handleFinish(finish: any) {
        this.beforeSpin();
        const { result, settlementResult, betWin, bigWin, roundId, totalOfFreeSpins, betByFreeSpin } = finish;
        const { winningLines, jackpot, bonus, freeSpins } = settlementResult;

        this.main.setGameRound(roundId);
        if (bonus.count > 0) {
            await this.waitingHandleSpecialCase(this.main.slotGameConfigs.showTotalBonusAmountDuration);
        } else {
            if (jackpot) {
                await this.waitingHandleSpecialCase(this.main.slotGameConfigs.showJackpotWinningAmountDuration);
            } else {
                this.updateFreeSpinCount();
                await this.main.setDataAndSpin(result);
            }
        }

        !this.main.isAccelerate && (await GameUtils.asyncExecute(this.main?.node, this.handleJackpot(jackpot)));

        this.main.showWinningItems(winningLines);
        if (bonus.count > 0) {
            this.main.showHighlightSpecialSymbols(+bonus.symbol);
        }
        if (freeSpins.count > 0) {
            this.main.showHighlightSpecialSymbols(+freeSpins.symbol);
        }

        this.main.setTotalFreeSpins(totalOfFreeSpins);
        const needWaitEffect = bigWin || freeSpins.count > 0 || betByFreeSpin || this.main.holdActionButton.isAutoAction;
        if (!needWaitEffect) {
            this.main.updateModeSpinButton(this.main.isFreeSpin());
            this.finishAnimationResult();
        }
        if (betWin === 0) {
            this.main.updateWinningBetLabel(betWin);
        }
        this.handlePayline(jackpot, betWin, winningLines, bigWin, freeSpins);
    }

    waitingHandleSpecialCase(totalDuration: number): Promise<void> {
        return new Promise((resolve, reject) => {
            cc.tween(this.main)
                .delay(totalDuration) //show total bonus in bonus dialog
                .call(resolve)
                .start();
        });
    }

    handleJackpot(jackpot: any): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (jackpot) {
                this.main.showLine(jackpot.winningLine + 1);
                this.main.slotBoard.showWinningEffect(jackpot.positions, jackpot.symbol);

                await this.main.showEffectJackpot(jackpot.winningAmount);
            }
            resolve();
        });
    }

    finishAnimationResult() {
        this.main.isAnimatingResult = false;
        this.main.clearHoldActionFlag();
        this.main.activeButtons();
    }

    showWinningLines(betWin: number, bigWin: boolean, jackpot: any, winningLines: LineData[], delayTime: number) {
        if (betWin > 0) {
            if (!bigWin) {
                this.main.showWinningBet(betWin);
            }
        }

        const lines: LineData[] = [];
        if (jackpot) {
            lines.push({
                payline: jackpot.winningLine,
                positions: jackpot.positions,
                symbol: jackpot.symbol
            });
        }
        lines.push(...winningLines);
        this.main.showWinningLines(lines, delayTime);
    }

    handlePayline(jackpot: any, betWin: number, winningLines: LineData[], bigWin: boolean, freeSpins: any) {
        const delayTime = betWin > 0 && !bigWin ? this.main.getCustomDuration("win") : this.main.getCustomDuration("lose");
        const notWinBigEffect = freeSpins.count === 0 && !bigWin;

        this.main.settleTween = cc
            .tween(this.main)
            .call(() => {
                this.showWinningLines(betWin, bigWin, jackpot, winningLines, delayTime);
                if (notWinBigEffect) {
                    this.main.showMessageDisplay(SlotNotification.SETTLED);
                }
            })
            .delay(delayTime)
            .call(async () => {
                if (bigWin) {
                    await this.main.showEffectBigWin(betWin);
                }

                if (!notWinBigEffect) {
                    this.main.showMessageDisplay(SlotNotification.SETTLED);
                }

                if (freeSpins.count > 0) {
                    this.main.updateDisplaySpinButtons();
                    this.main.showHighlightSpecialSymbols(+freeSpins.symbol);
                    await this.main.showEffectFreeSpin();
                } else {
                    this.main.updateModeSpinButton(this.main.isFreeSpin());
                }

                this.finishAnimationResult();
                this.checkSpinNextRound(freeSpins);
            })
            .start();
    }

    checkSpinNextRound(freeSpins: any) {
        this.main.updateBottomMessageStatus();
        this.main.showMessageDisplay(SlotNotification.SETTLED);
        this.main.waitingSpinResult = false;
        if (!this.main.gotApiError()) {
            const isAutoSpinMode = this.main.isAutoSpinMode();
            const stillAutoSpin = this.main.stillAutoSpin();
            const autoSpin = isAutoSpinMode && stillAutoSpin;

            if (freeSpins.count > 0 || autoSpin || this.main.isFreeSpin()) {
                this.main.spin();
            } else if (isAutoSpinMode && !stillAutoSpin && !this.main.isShowAutoSpinSettingDialog) {
                this.main.createAutoSpinDialog();
                this.main.autoOpenAutoSpinDialog = true;
            } else {
                if (!this.main.isShowAutoSpinSettingDialog) {
                    this.main.resetStateButtons();
                }
            }
        }
    }

    async handleBonus(bonus: number) {
        if (bonus) {
            await GameUtils.asyncExecute(this.main?.node, this.main.showEffectBonus(bonus));
        }
    }
}
