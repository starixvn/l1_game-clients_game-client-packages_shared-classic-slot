import { _decorator, Component, Label } from "cc";
const { ccclass, property } = _decorator;

@ccclass
export default class BetLevelItem extends Component {
    @property(Label)
    lblValue: Label = null;

    private index = 0;

    onStakeChanged = (param: number) => {};

    onStakeToggleChanged(event: Event) {
        this.onStakeChanged(this.index);
    }

    setData(value: string, index: number) {
        this.lblValue.string = value;
        this.index = index;
    }
}
