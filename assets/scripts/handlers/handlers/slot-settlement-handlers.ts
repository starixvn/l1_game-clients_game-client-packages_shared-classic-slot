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
    ];

    handleFinish(finish: any) {
        console.log("handleFinish", finish);
        const { result, settlementResult, betWin, bigWin, roundId, totalOfFreeSpins, betByFreeSpin } = finish;
        const { winningLines, jackpot, bonus, freeSpins } = settlementResult;

        this.betControlStore.roundId = roundId;
        if (bonus.count > 0) {
            // await this.waitingHandleSpecialCase(this.main.slotGameConfigs.showTotalBonusAmountDuration);
        } else {
            if (jackpot) {
                // await this.waitingHandleSpecialCase(this.main.slotGameConfigs.showJackpotWinningAmountDuration);
            } else {
                // this.updateFreeSpinCount();
                this.slotBoardStore.spinResult = { result, duration: this.slotDurationStore.spinDuration };
            }
        }
    }

    handleBonus(data: any) {
        console.log("handleBonus", data);
    }
}
