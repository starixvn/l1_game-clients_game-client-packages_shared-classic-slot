import { _decorator, Animation, sp } from "cc";
import { AnimationUtils } from "db://shared-components/shared/utils";
import CallbackAnimation from "./callback-animation";

const { ccclass, property } = _decorator;

@ccclass
export default class CallbackSkeleton extends CallbackAnimation {
    @property({ visible: false, override: true })
    animation: Animation = null;

    @property(sp.Skeleton)
    effect: sp.Skeleton = null;

    protected duration: number;

    onLoad() {
        this.effect.setCompleteListener(() => this.finish());
    }

    setDuration(duration: number) {
        this.duration = duration;
    }

    updateDuration(duration: number) {
        AnimationUtils.updateSpineDuration(this.effect, this.effect.animation, duration);
    }

    play() {
        this.duration && this.updateDuration(this.duration);
        this.effect.setAnimation(0, this.effect.animation, false);
    }
}
