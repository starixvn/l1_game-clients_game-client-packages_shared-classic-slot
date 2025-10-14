import gc from "@sg/game-client-base";
import { _decorator, instantiate, Prefab } from "cc";
import { WarningCmp } from "db://shared-components/shared/common-components/notice/scripts/warning-cmp";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { BetControlStore } from "../../handlers/stores/bet-control-store";
const { ccclass, property } = _decorator;
const { observer, render, handle } = Observer;
@ccclass
export class SlotWarningContainer extends ObserverComponent {
    @property(Prefab)
    totalBetNoticePrefab: Prefab = null;

    @render(BetControlStore, (store) => store.totalBetChanged, { fireImmediately: false })
    renderTotalBetChanged(totalBetChanged: { value: number }) {
        if (totalBetChanged) {
            const node = instantiate(this.totalBetNoticePrefab);
            this.node.addChild(node);
            const warningCmp = node.getComponent(WarningCmp);
            warningCmp.setData(gc.FormatUtils.numberWithCommas(totalBetChanged.value, 2, true));
        }
    }
}