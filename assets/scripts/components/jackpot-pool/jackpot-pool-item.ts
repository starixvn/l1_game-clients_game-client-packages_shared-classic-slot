import gc from "@sg/game-client-base";
import { _decorator, Component, Label, Tween, tween } from "cc";
import Observer from "observer";
const { ccclass, property } = _decorator;
const { render } = Observer;

@ccclass
export default class JackpotPoolItem extends Component {
    @property(Label)
    lblValue: Label = null;

    private readonly objectTween = { value: -1 };

    setValue(value: number) {
        if (this.objectTween.value === value) {
            return;
        }
        const animated = this.objectTween.value !== -1;
        if (animated) {
            Tween.stopAllByTarget(this.objectTween);
            tween(this.objectTween)
                .to(0.4, { value }, {
                    onUpdate: (target) => {
                        this.updateLabel(target.value);
                    },
                })
                .call(() => {
                    this.updateLabel(value);
                })
                .start();
        } else {
            this.objectTween.value = value;
            this.updateLabel(value);
        }
    }

    private updateLabel(value: number) {
        this.lblValue.string = gc.FormatUtils.numberWithCommas(value, 2, false);
    }
}
