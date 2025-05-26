import gc from "@sg/game-client-base";
import { _decorator } from "cc";
import { NodeContainer } from "db://shared-components/shared/common-components/node-container/node-container";
import Observer from "observer";
import { ClassicSlotBetDetail } from "./classic-slot-bet-detail";
const { ccclass, property } = _decorator;
const { handle, render } = Observer;

@ccclass("ClassicSlotBetDetailContainer")
export class ClassicSlotBetDetailContainer extends NodeContainer {
    @render(gc.BetHistory.BetDetailHistoryStore, (store) => store.model, { fireImmediately: false })
    showBetDetailPopup(model: gc.BetHistory.BetDetailModel) {
        if (!model) {
            return;
        }

        const detail = this.createNode().getComponent(ClassicSlotBetDetail);
        detail.showBetDetail(model);
    }
}
