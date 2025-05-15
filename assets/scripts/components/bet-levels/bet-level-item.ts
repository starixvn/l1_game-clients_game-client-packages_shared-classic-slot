import { _decorator, Component, Label, Node } from "cc";
const { ccclass, property } = _decorator;

@ccclass
export default class BetLevelItem extends Component {
    @property(Label)
    lblValue: Label = null;

    @property(Node)
    nodeActive: Node = null;

    @property(Node)
    nodeInactive: Node = null;

    private index = 0;

    onStakeChanged = (param: number) => {};

    onClick() {
        this.onStakeChanged(this.index);
    }

    setActive(active: boolean) {
        this.nodeActive.active = active;
        this.nodeInactive.active = !active;
    }

    setData(value: string, index: number) {
        this.lblValue.string = value;
        this.index = index;
    }
}
