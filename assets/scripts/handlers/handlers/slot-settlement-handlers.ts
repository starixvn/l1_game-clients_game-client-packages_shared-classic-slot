import gc from "@sg/game-client-base";
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
            name: "jackpot",
            handle: this.handleJackpot,
        },
    ];

    protected receivedJackpot = false;
    protected processingSettlement = null;

    reset() {
        this.receivedJackpot = false;
    }

    emitJackpot(index: number) {
        this.connectionStore.connection.emit("jackpot", { chest: index });
    }

    async handleJackpot(jackpot: any) {
        console.log("handleJackpot", jackpot);
        this.receivedJackpot = true;
        await this.spinResultSpecialCase(jackpot);
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
        this.slotBoardStore.spinResult = { result, duration: this.slotDurationStore.spinDuration, turbo: this.betControlStore.isTurbo };
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
    }
}
