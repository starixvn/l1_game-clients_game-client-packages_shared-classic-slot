import gc from "@sg/game-client-base";
import { _decorator, Component, Label } from "cc";
import Observer from "observer";
const { ccclass, property } = _decorator;
const { render } = Observer;

@ccclass
export default class JackpotPoolItem extends Component {
    @property(Label)
    lblValue: Label = null;

    setValue(value: number) {
        this.lblValue.string = gc.FormatUtils.numberWithCommas(value, 2, false);
    }
}
