import gc from "@sg/game-client-base";
import inversify from "inversify";
import { BetControlStore } from "../stores/bet-control-store";
import { SlotBoardStore } from "../stores/slot-board-store";
import { SlotDurationStore } from "../stores/slot-duration-store";
const { injectable, inject } = inversify;
@injectable()
export class SlotJackpotPoolsHandler {
    @inject(BetControlStore) private betControlStore: BetControlStore;
    @inject(SlotBoardStore) private slotBoardStore: SlotBoardStore;
    @inject(SlotDurationStore) private slotDurationStore: SlotDurationStore;
    @inject(gc.Connection.ConnectionStore) private connectionStore: gc.Connection.ConnectionStore;

    eventHandleList = [
        {
            name: "jackpotPool",
            handle: this.handleJackpotPool,
        },
        {
            name: "jackpotPools",
            handle: this.handleJackpotPools,
        },
    ];

    handleJackpotPool(jackpotPool: any) {
        console.log("handleJackpotPool", jackpotPool);
    }

    handleJackpotPools(jackpotPools: any) {
        console.log("handleJackpotPools", jackpotPools);
    }
}
