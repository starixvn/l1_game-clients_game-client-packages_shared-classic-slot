import { _decorator, Animation, Label, Node, ParticleSystem } from "cc";
import SpinButton from "./SpinButton";
const { ccclass, property } = _decorator;

enum SpinAnimationType {
    IDLE = 0,
    SPIN,
}
@ccclass
export default class ClassicSpinButton extends SpinButton {
    @property(Node)
    normalSpinNode: Node = null;

    @property(Label)
    freeSpinLabel: Label = null;

    @property(Node)
    textSpinInFreeSpin: Node = null;

    @property(Animation)
    spinAnimation: Animation = null;

    @property(ParticleSystem)
    spinParticle: ParticleSystem = null;

    hideAll() {
        this.normalSpinNode.active = false;
        this.setVisibilityFreeSpinLabel(false);
        this.needShowAutoSpin && (this.autoSpinCountLabel.node.parent.active = false);
    }

    setVisibilityFreeSpinLabel(show: boolean) {
        this.freeSpinLabel && (this.freeSpinLabel.node.parent.active = show);
    }

    showFreeSpinMode() {
        this.hideAll();
        this.setVisibilityFreeSpinLabel(true);
    }

    override showAutoSpinMode() {
        if (this.needShowAutoSpin) {
            this.hideAll();
            this.autoSpinCountLabel.node.parent.active = true;
        } else {
            this.setVisibilityFreeSpinLabel(false);
            this.normalSpinNode.active = true;
        }
    }

    override showNormalMode() {
        this.hideAll();
        this.normalSpinNode.active = true;
    }

    setFreeSpinValue(value: number) {
        this.freeSpinLabel && (this.freeSpinLabel.string = value.toString());
    }

    showTextSpinInFreeSpin(show: boolean) {
        this.textSpinInFreeSpin && (this.textSpinInFreeSpin.active = show);
    }

    protected playAnimation(index: number) {
        if (!this.spinAnimation) {
            return;
        }
        const clips = this.spinAnimation.clips;
        if (clips.length === 0 || index >= clips.length) {
            return;
        }
        this.spinAnimation.play(clips[index].name);
    }

    protected playParticleSpin() {
        this.spinParticle && this.spinParticle.play();
    }

    override playAnimationSpin() {
        this.playParticleSpin();
        this.playAnimation(SpinAnimationType.SPIN);
    }

    override playAnimationIdle() {
        this.playAnimation(SpinAnimationType.IDLE);
    }

    override playAnimationSpinTurbo() {}
}
