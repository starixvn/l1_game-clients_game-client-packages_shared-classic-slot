import { _decorator } from "cc";
import { ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import BetLevelsContainer from "./bet-levels-container";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;
@ccclass
export default class BetLevelsContainerPortrait extends BetLevelsContainer {
    @property
    columnsNumber = 3;

    protected calculateContainerHeight() {
        const itemsOfColumn = Math.ceil(this.betLevels.length / this.columnsNumber);
        console.log("itemsOfColumn", itemsOfColumn);
        const height = itemsOfColumn * this.itemHeight + (itemsOfColumn + 1) * this.marginBetweenItems;

        ComponentUtils.setNodeTransform(this.containerNode, { height });
    }
}
