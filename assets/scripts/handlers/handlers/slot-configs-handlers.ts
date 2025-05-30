import inversify from "inversify";
import { SlotState } from "../../definitions";
import { BetControlStore } from "../stores/bet-control-store";
import { SlotBoardStore } from "../stores/slot-board-store";
const { injectable, inject } = inversify;

@injectable()
export class SlotConfigsHandler {
    @inject(BetControlStore) protected readonly betControlStore: BetControlStore;
    @inject(SlotBoardStore) protected readonly slotBoardStore: SlotBoardStore;

    eventHandleList = [
        {
            name: "gameConfigs",
            handle: this.handleGameConfigs,
        },
    ];

    handleGameConfigs(data: any) {
        const { betLevels, defaultBetLevel } = data;
        if (betLevels === undefined || defaultBetLevel === undefined) {
            return;
        }
        this.betControlStore.setBetLevels(betLevels);
        if (this.betControlStore.stake === 0) {
            this.betControlStore.setStake(defaultBetLevel);
        }
        this.slotBoardStore.slotState = SlotState.READY;
    }
}
