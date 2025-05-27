import inversify from "inversify";
import { SlotState } from "../../definitions";
import { BetControlStore } from "../stores/bet-control-store";
import { SlotBoardStore } from "../stores/slot-board-store";
const { injectable, inject } = inversify;

@injectable()
export class SlotConfigsHandler {
    @inject(BetControlStore) private betControlStore: BetControlStore;
    @inject(SlotBoardStore) private slotBoardStore: SlotBoardStore;

    eventHandleList = [
        {
            name: "gameConfigs",
            handle: this.handleGameConfigs,
        },
    ];

    handleGameConfigs(data: any) {
        console.log("handleGameConfigs", data);
        const { betLevels, defaultBetLevel } = data;
        this.betControlStore.setBetLevels(betLevels);
        if (this.betControlStore.stake === 0) {
            this.betControlStore.setStake(defaultBetLevel);
        }
        this.slotBoardStore.slotState = SlotState.READY;
    }
}
