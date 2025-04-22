import { AnimationUtils } from "db://shared-components/shared/utils";
import inversify from "inversify";
import { BetControlStore } from "../stores/bet-control-store";
import { SlotBoardStore } from "../stores/slot-board-store";
import { SlotDurationStore } from "../stores/slot-duration-store";
const { injectable, inject } = inversify;

@injectable()
export class SlotSettlementHandler {
    @inject(BetControlStore) private betControlStore: BetControlStore;
    @inject(SlotBoardStore) private slotBoardStore: SlotBoardStore;
    @inject(SlotDurationStore) private slotDurationStore: SlotDurationStore;

    eventHandleList = [
        {
            name: "finish",
            handle: this.handleFinish,
        },
        {
            name: "bonuses",
            handle: this.handleBonus,
        },
        {
            name: "jackpot",
            handle: this.handleJackpot,
        },
    ];

    protected receivedJackpot = false;
    protected processingSettlement = null;

    reset() {
        this.receivedJackpot = false;
    }

    handleJackpot(jackpot: any) {
        console.log("handleJackpot", jackpot);
        this.receivedJackpot = true;
        this.spinResultSpecialCase(jackpot);
    }

    handleBonus(bonuses: any) {
        console.log("handleBonus", bonuses);
        if (this.receivedJackpot) {
        } else {
            this.spinResultSpecialCase(bonuses);
        }
    }

    spinResultSpecialCase(data: { roundId: number; result: number[] }) {
        console.log("spinResultSpecialCase", data);
        const { roundId, result } = data;
        this.betControlStore.roundId = roundId;
        this.slotBoardStore.spinResult = { result, duration: this.slotDurationStore.spinDuration, turbo: this.betControlStore.isTurbo };
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
                this.slotBoardStore.spinResult = {
                    result,
                    duration: this.slotDurationStore.spinDuration,
                    turbo: this.betControlStore.isTurbo,
                };

                await AnimationUtils.delayTime(this.slotDurationStore.totalSpinDuration);
            }
        }
    }
}
