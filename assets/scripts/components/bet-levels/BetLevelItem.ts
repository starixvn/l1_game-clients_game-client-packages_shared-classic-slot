import { _decorator, Component, Label } from "cc";
const { ccclass, property } = _decorator;

@ccclass
export default class BetLevelItem extends Component {
    @property(Label)
    lblValue: Label = null;

    private index = 0;

    onClickListener = {
        onStakeToggleChanged: (event, param) => {},
    };

    onStakeToggleChanged(event: Event) {
        this.onClickListener.onStakeToggleChanged(event, this.index);
    }

    setData(value: string, index: number) {
        this.lblValue.string = value;
        this.index = index;
    }
}
