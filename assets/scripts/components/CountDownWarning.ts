import { _decorator, Component, Label, macro, Sprite, Tween, tween } from "cc";
import RawTwoDigitsTimer from "db://shared-components/game/game-timer/scripts/raw-two-digits-timer";
const { ccclass, property } = _decorator;

@ccclass
export default class CountDownWarning extends Component {
    @property(RawTwoDigitsTimer)
    time: RawTwoDigitsTimer = null;

    @property(Label)
    spinCount: Label = null;

    @property
    duration = 3;

    private isShowing = false;
    private checkCancel = () => false;
    private onCancel = () => {};

    onLoad() {
        const txtSpin = this.node.getChildByName("txt_quaytudong");
        const componentSpin = txtSpin.getComponent(Sprite);
        componentSpin && (componentSpin.spriteFrame = null);
    }

    show(spinCount: number, onFinished = () => {}, checkCancel = () => false, onCancel = () => {}) {
        this.spinCount.string = spinCount.toString();
        this.checkCancel = checkCancel;
        this.onCancel = onCancel;
        this.node.active = true;
        this.setTime(this.duration);
        let count = 1;
        this.isShowing = true;
        this.schedule(this.updateInterval, 0.3, macro.REPEAT_FOREVER, 1);
        tween(this.node)
            .repeat(
                this.duration,
                tween()
                    .delay(1)
                    .call(() => {
                        this.setTime(this.duration - count);
                        count++;
                    })
            )
            .call(() => {
                this.unschedule(this.updateInterval);
                this.node.active = false;
                this.isShowing = false;
                onFinished();
            })
            .start();
    }

    updateInterval() {
        if (!this.isShowing) {
            return;
        }

        if (this.checkCancel()) {
            this.onCancel();
            this.unschedule(this.updateInterval);
            Tween.stopAllByTarget(this.node);
            this.node.active = false;
            this.isShowing = false;
        }
    }

    setTime(time: number) {
        // const num = String(time).padStart(2, "0");
        this.time.setTime(time);
    }
}
