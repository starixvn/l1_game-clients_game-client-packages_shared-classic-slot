import inversify from "inversify";
import { BetControlStore } from "../stores/bet-control-store";
const { injectable, inject } = inversify;

@injectable()
export class SlotConfigsHandler {
    @inject(BetControlStore) private betControlStore: BetControlStore;

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
        this.betControlStore.setStake(defaultBetLevel);
    }
}
