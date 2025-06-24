import { _decorator } from "cc";
import { NodeContainer } from "db://shared-components/shared/common-components/node-container/node-container";
import Observer from "observer";
import { BetControlStore, SlotUIHandler } from "../../handlers";
import { DialogName } from "../../utils/classic-slot-utils";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;

@ccclass
export default class LineSelectionContainer extends NodeContainer {
    @render(BetControlStore, (store) => store.showLineSelection)
    protected renderWinningLine(showLineSelection: any) {
        if (showLineSelection) {
            this.createNode();
            this.triggerEvent();
        }
    }

    @handle(SlotUIHandler, (store) => store.triggerDialogOpen({ name: DialogName.LINE_SELECTION }))
    triggerEvent() {}
}
