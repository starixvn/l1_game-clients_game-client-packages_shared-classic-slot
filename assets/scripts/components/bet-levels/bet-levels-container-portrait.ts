import { _decorator, tween, v3 } from "cc";
import { AnimationUtils, ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import BetLevelsContainer from "./bet-levels-container";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;
@ccclass
export default class BetLevelsContainerPortrait extends BetLevelsContainer {
    @property
    columnsCount = 3;

    protected calculateContainerHeight() {
        const itemsOfColumn = Math.ceil(this.betLevels.length / this.columnsCount);
        const height = itemsOfColumn * this.itemHeight + (itemsOfColumn + 1) * this.marginBetweenItems;

        ComponentUtils.setNodeTransform(this.containerNode, { height });
    }

    protected async onHide() {
        const duration = 0.4;
        AnimationUtils.stopFade(this.node);
        AnimationUtils.fadeOut(this.node, duration);
        tween(this.node)
            .to(duration, { scale: v3(0, 0, 0) }, { easing: "backIn" })
            .call(() => {
                this.onHidden();
            })
            .start();
    }

    protected onShow() {
        this.node.active = true;
        const duration = 0.4;
        AnimationUtils.fadeIn(this.node, duration);
        this.node.scale = v3(0, 0, 0);
        tween(this.node)
            .to(duration, { scale: v3(1, 1, 1) }, { easing: "backOut" })
            .start();
    }
}
