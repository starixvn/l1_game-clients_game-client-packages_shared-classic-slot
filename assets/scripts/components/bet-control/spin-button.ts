import { _decorator, Button, Component, Label } from "cc";
const { ccclass, property } = _decorator;

@ccclass
export default abstract class SpinButton extends Component {
    @property(Button)
    spinButton: Button = null;

    @property(Label)
    autoSpinCountLabel: Label = null;

    needShowAutoSpin = true;

    hideAutoSpin() {
        this.needShowAutoSpin = false;
    }

    setAutoSpinCount(count: number) {
        this.needShowAutoSpin && (this.autoSpinCountLabel.string = count.toString());
    }

    active() {
        this.spinButton.interactable = true;
    }

    deactive() {
        this.spinButton.interactable = false;
    }

    abstract playAnimationSpin();

    abstract playAnimationSpinTurbo();

    abstract playAnimationIdle();

    abstract showAutoSpinMode();

    abstract showNormalMode();
}
