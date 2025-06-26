import { _decorator } from "cc";
import { InGameMenu } from "db://shared-components/game/in-game-menu/scripts/components/in-game-menu";
import Observer from "observer";
import { SlotUIHandler } from "../handlers/handlers/slot-ui-handler";
import { SlotUIStore } from "../handlers/stores/slot-ui-store";
import { DialogName } from "../utils/classic-slot-utils";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;

@ccclass
export default class SlotIngameMenu extends InGameMenu {
    @render(SlotUIStore, (store) => store.dialogOpenEvent, { fireImmediately: false })
    renderDialogOpenEvent(dialogOpenEvent: { name: string }) {
        if (dialogOpenEvent.name !== DialogName.IN_GAME_MENU) {
            this.expandableNode.collapse();
        }
    }

    onClickExpand() {
        super.onClickExpand();
        this.triggerEvent();
    }

    @handle(SlotUIHandler, (store) => store.triggerDialogOpen({ name: DialogName.IN_GAME_MENU }))
    triggerEvent() {}
}
