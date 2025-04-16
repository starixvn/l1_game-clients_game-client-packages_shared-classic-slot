import { _decorator, Animation, Label, ParticleSystem, sp } from "cc";
import ClassicSpinButton from "./ClassicSpinButton";
const { ccclass, property } = _decorator;

@ccclass
export default class ClassicSpinButtonWithSpine extends ClassicSpinButton {
    @property({ visible: false, override: true })
    autoSpinCountLabel: Label = null;

    @property({ visible: false, override: true })
    spinAnimation: Animation = null;

    @property({ visible: false, override: true })
    spinParticle: ParticleSystem = null;

    @property(sp.Skeleton)
    iconSpinSkeleton: sp.Skeleton = null;

    onLoad() {
        this.hideAutoSpin();
    }

    override playAnimationSpin() {
        this.iconSpinSkeleton && this.iconSpinSkeleton.setAnimation(0, "active", true);
    }

    override playAnimationIdle() {
        this.iconSpinSkeleton && this.iconSpinSkeleton.setAnimation(0, "idle", true);
    }
}
