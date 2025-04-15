import { uiManager } from "../../../managers/GameUIManager";
import { InternalEvents } from "../../../managers/InternalEvents";
import DataHandler from "../../_base/handlers/DataHandler";
import SlotGameBase from "../SlotGameBase";

export default class SlotGameJackpotHandler implements DataHandler {
    constructor(protected readonly main: SlotGameBase) {}

    handle(data: any) {
        if (data.jackpotPool) {
            this.main.updatePoolData(data.jackpotPool);
        }

        if (data.jackpotPools) {
            uiManager.emitter.emit(InternalEvents.RECEIVED_JACKPOT_POOLS_IN_GAME, data.jackpotPools);
            data.jackpotPools.forEach((pool: any) => this.main.updatePoolData(pool));
        }

        if (data.winningJackpot) {
            this.main.onOpenJackpotChest && this.main.onOpenJackpotChest(data.winningJackpot);
        }
    }
}
