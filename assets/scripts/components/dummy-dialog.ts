import { _decorator } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { SlotUIHandler } from "../handlers/handlers/slot-ui-handler";
import { DialogName } from "../utils/classic-slot-utils";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;

@ccclass
export default class DummyDialog extends ObserverComponent {
    onClick() {
        this.triggerEvent();
    }

    @handle(SlotUIHandler, (store) => store.triggerDialogOpen({ name: DialogName.DUMMY_DIALOG }))
    triggerEvent() {}
}
