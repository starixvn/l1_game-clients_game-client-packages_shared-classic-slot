

import { _decorator, Label, Node } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { AnimationUtils, ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import { BetControlStore } from "../../handlers/stores/bet-control-store";
const { ccclass, property } = _decorator;
const { observer, render, handle } = Observer;
@ccclass
export class FreespinMessage extends ObserverComponent {
    @property(Node)
    container: Node = null;

    @property(Label)
    lblFreeSpinCount: Label = null;

    normalNode: Node = null;
    lastNode: Node = null;

    onLoad() {
        this.normalNode = this.container.getChildByName("normal");
        this.lastNode = this.container.getChildByName("last");
        this.container.active = false;
        ComponentUtils.setOpacityNode(this.container, 1);
        super.onLoad();
    }

    @render(BetControlStore, (store) => store.freeSpinCountDisplay)
    renderFreeSpinCount(freeSpinCountDisplay: number) {
        this.lblFreeSpinCount.string = freeSpinCountDisplay.toString();

        const isLast = freeSpinCountDisplay === 0;
        this.normalNode.active = !isLast;
        this.lastNode.active = isLast;
    }

    @render(BetControlStore, (store) => store.freeSpinEnabledDisplay)
    renderFreeSpinEnabled(freeSpinEnabled: boolean) {
        if (freeSpinEnabled) {
            AnimationUtils.fadeIn(this.container, 0.3);
        } else {
            AnimationUtils.fadeOut(this.container, 0.3).then(() => {
                this.container.active = false;
            });
        }
    }
}

