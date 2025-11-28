import gc from "@sg/game-client-base";
import { _decorator, Node } from "cc";
import { NodeContainer } from "db://shared-components/shared/common-components/node-container/node-container";
import Observer from "observer";
import { ClassicSlotBetDetail } from "./classic-slot-bet-detail";
const { ccclass } = _decorator;
const { render } = Observer;


@ccclass("ClassicSlotBetDetailContainer")
export class ClassicSlotBetDetailContainer extends NodeContainer {
    protected detailNode: Node = null;

    @render(gc.BetHistory.BetDetailHistoryStore, (store) => store.model, { fireImmediately: false })
    showBetDetailPopup(model: gc.BetHistory.BetDetailModel) {
        if (!model) {
            return;
        }

        if (!this.detailNode || !this.detailNode.isValid) {
            this.detailNode = this.createNode();
        }
        this.detailNode.getComponent(ClassicSlotBetDetail).showBetDetail(model);
    }
}
