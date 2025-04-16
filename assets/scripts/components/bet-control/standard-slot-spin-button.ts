import { _decorator, Animation, Label, Node, ParticleSystem, sp } from "cc";
import ClassicSpinButton from "./classic-spin-button";
const { ccclass, property } = _decorator;

@ccclass
export default class StandardSlotSpinButton extends ClassicSpinButton {
    @property({ visible: false, override: true })
    autoSpinCountLabel: Label = null;

    @property({ visible: false, override: true })
    spinAnimation: Animation = null;

    @property({ visible: false, override: true })
    spinParticle: ParticleSystem = null;

    @property({ visible: false, override: true })
    freeSpinLabel: Label = null;

    @property({ visible: false, override: true })
    textSpinInFreeSpin: Node = null;

    @property({ visible: false, override: true })
    normalSpinNode: Node = null;

    @property(sp.Skeleton)
    iconSpinSkeleton: sp.Skeleton = null;

    onLoad() {
        this.hideAutoSpin();
    }

    override playAnimationSpin() {
        this.iconSpinSkeleton && this.iconSpinSkeleton.setAnimation(0, "spin", true);
        this.iconSpinSkeleton && this.iconSpinSkeleton.setAnimation(3, "spin-extra", false);
    }

    override playAnimationIdle() {
        this.iconSpinSkeleton && this.iconSpinSkeleton.setAnimation(0, "idle", true);
    }

    override showAutoSpinMode() {}
    override hideAll() {}
    override showNormalMode() {}
}
