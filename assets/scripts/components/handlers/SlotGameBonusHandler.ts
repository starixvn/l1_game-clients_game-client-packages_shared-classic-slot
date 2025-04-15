import DataHandler from "../../_base/handlers/DataHandler";
import SlotGameBase from "../SlotGameBase";

export default class SlotGameBonusHandler implements DataHandler {
    constructor(protected readonly main: SlotGameBase) {}

    handle(data: any) {
        if (data.bonusChest) {
            this.main.onOpenBonusChest(data.bonusChest);
        }
    }
}
