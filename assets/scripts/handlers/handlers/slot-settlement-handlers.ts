import gc from "@sg/game-client-base";
import { tween } from "cc";
import { AnimationUtils } from "db://shared-components/shared/utils";
import inversify from "inversify";
import { LineData, paylines } from "../../definitions";
import { BetControlStore } from "../stores/bet-control-store";
import { SlotBoardStore } from "../stores/slot-board-store";
import { SlotDurationStore } from "../stores/slot-duration-store";
const { injectable, inject } = inversify;
@injectable()
export class SlotSettlementHandler {
    @inject(BetControlStore) private betControlStore: BetControlStore;
    @inject(SlotBoardStore) private slotBoardStore: SlotBoardStore;
    @inject(SlotDurationStore) private slotDurationStore: SlotDurationStore;
    @inject(gc.Connection.ConnectionStore) private connectionStore: gc.Connection.ConnectionStore;

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

    protected receivedJackpot = false;
    protected processingSettlement = null;

    settleTween = null;

    reset() {
        this.receivedJackpot = false;
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
        this.receivedJackpot = true;
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
        if (this.receivedJackpot) {
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

        this.betControlStore.roundId = roundId;
        if (bonus.count > 0) {
            await AnimationUtils.delayTime(this.slotDurationStore.showTotalBonusAmountDuration);
        } else {
            if (jackpot) {
                await AnimationUtils.delayTime(this.slotDurationStore.showJackpotWinningAmountDuration);
            } else {
                // this.updateFreeSpinCount();
                await this.spin(result);
            }
        }

        this.slotBoardStore.winningItems = winningLines;
        const highlightSpecialSymbols = [];
        if (bonus.count > 0) {
            highlightSpecialSymbols.push(+bonus.symbol);
        }
        if (freeSpins.count > 0) {
            highlightSpecialSymbols.push(+freeSpins.symbol);
        }
        this.slotBoardStore.highlightSpecialSymbols = highlightSpecialSymbols;

        this.betControlStore.setTotalFreeSpins(totalOfFreeSpins);
        const needWaitEffect = bigWin || freeSpins.count > 0 || betByFreeSpin || this.betControlStore.autoSpinEnabled;
        if (!needWaitEffect) {
            // this.main.updateModeSpinButton(this.main.isFreeSpin());
            this.finishSettlement();
        }
        if (betWin === 0) {
            // this.main.updateWinningBetLabel(betWin);
            //TODO : update winning bet label
            this.betControlStore.winningBet = betWin;
        }
        this.handlePayline(jackpot, betWin, winningLines, bigWin, freeSpins);
    }

    protected showWinningLines(betWin: number, bigWin: boolean, jackpot: any, winningLines: LineData[]) {
        if (betWin > 0) {
            if (!bigWin) {
                this.betControlStore.winningBet = betWin;
            }
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

    handlePayline(jackpot: any, betWin: number, winningLines: LineData[], bigWin: boolean, freeSpins: any) {
        const delayTime = betWin > 0 && !bigWin ? this.slotDurationStore.winningDuration : this.slotDurationStore.noWinningDuration;
        const notWinBigEffect = freeSpins.count === 0 && !bigWin;

        if (notWinBigEffect) {
            // this.main.showMessageDisplay(SlotNotification.SETTLED);
        }
        this.settleTween = tween(this)
            .delay(delayTime)
            .call(async () => {
                this.showWinningLines(betWin, bigWin, jackpot, winningLines);
                if (bigWin) {
                    const duration = this.slotDurationStore.bigWinDuration;
                    const showBigWinValue = this.slotDurationStore.showBigWinValueDuration;
                    const delayShowBigWinValue = this.slotDurationStore.delayShowBigWinValue;
                    this.slotBoardStore.receivedBigWin = {
                        amount: betWin,
                        bigWin,
                        duration,
                        showBigWinValue,
                        delayShowBigWinValue,
                    };
                    const delayToUpdateWinningBet = showBigWinValue + delayShowBigWinValue;
                    const delayToEndBigWin = duration - delayToUpdateWinningBet;
                    await AnimationUtils.delayTime(delayToUpdateWinningBet);
                    this.betControlStore.winningBet = betWin;
                    await AnimationUtils.delayTime(delayToEndBigWin);
                }

                if (!notWinBigEffect) {
                    // this.main.showMessageDisplay(SlotNotification.SETTLED);
                }

                if (freeSpins.count > 0) {
                    // this.main.updateDisplaySpinButtons();
                    this.slotBoardStore.highlightSpecialSymbols = [+freeSpins.symbol];

                    this.slotBoardStore.receivedFreeSpins = { freeSpins, duration: this.slotDurationStore.freespinDuration };
                    await AnimationUtils.delayTime(this.slotDurationStore.freespinDuration);
                    this.betControlStore.freeSpinCount = freeSpins.count;
                } else {
                    // this.main.updateModeSpinButton(this.main.isFreeSpin());
                }

                this.finishSettlement();
                this.checkSpinNextRound(freeSpins);
            })
            .start();
    }

    stopSettleTween() {
        if (this.settleTween) {
            this.settleTween.stop();
        }
    }

    protected finishSettlement() {
        // this.main.isAnimatingResult = false;
        // this.main.clearHoldActionFlag();
        // this.main.activeButtons();
    }

    protected checkSpinNextRound(freeSpins: any) {
        // this.main.updateBottomMessageStatus();
        // this.main.showMessageDisplay(SlotNotification.SETTLED);
        // this.main.waitingSpinResult = false;
        // if (!this.main.gotApiError()) {
        //     const isAutoSpinMode = this.main.isAutoSpinMode();
        //     const stillAutoSpin = this.main.stillAutoSpin();
        //     const autoSpin = isAutoSpinMode && stillAutoSpin;
        //     if (freeSpins.count > 0 || autoSpin || this.main.isFreeSpin()) {
        //         this.main.spin();
        //     } else if (isAutoSpinMode && !stillAutoSpin && !this.main.isShowAutoSpinSettingDialog) {
        //         this.main.createAutoSpinDialog();
        //         this.main.autoOpenAutoSpinDialog = true;
        //     } else {
        //         if (!this.main.isShowAutoSpinSettingDialog) {
        //             this.main.resetStateButtons();
        //         }
        //     }
        // }
    }
}
