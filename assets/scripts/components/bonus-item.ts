import gc from "@sg/game-client-base";
import { _decorator, Component, Label } from "cc";
const { ccclass, property } = _decorator;

@ccclass
export default class BonusItem extends Component {
    @property(Animation)
    openChestAnimation: Animation = null;

    @property(Label)
    value: Label = null;

    open(value: number) {
        this.openChestAnimation && this.openChestAnimation.play();

        if (value > 0) {
            this.value.string = gc.FormatUtils.numberWithCommas(value);
        }
    }
}
