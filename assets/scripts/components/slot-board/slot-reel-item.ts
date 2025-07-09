const { ccclass, property } = _decorator;
import { _decorator, Component, Node, sp, Sprite, v3 } from "cc";
import { AnimationUtils } from "db://shared-components/shared/utils/utils";
import { resourceCaches } from "../../utils/classic-slot-utils";
@ccclass
export default class SlotReelItem extends Component {
    @property(Node)
    content: Node = null;

    @property(Node)
    winningEffect: Node = null;

    @property(sp.Skeleton)
    effectSpine: sp.Skeleton = null;

    @property(Node)
    blurSymbol: Node = null;

    @property
    premultipliedAlpha = false;

    public index = -1;
    public gameId: number;

    onLoad() {
        this.showWinningEffect(false);
        if (this.blurSymbol) {
            AnimationUtils.setOpacityNode(this.blurSymbol, 1);
            this.blurSymbol.active = false;
        }
    }

    setItem(index: number) {
        if (index === this.index) {
            return;
        }
        this.index = index;
        this.replaceItem(index);
    }

    private playEffectSpine() {
        if (this.effectSpine) {
            this.effectSpine.setAnimation(0, this.effectSpine.animation, false);
        }
    }

    handleBlurAnim(isShowBlurSymbol: boolean) {
        if (!this.effectSpine || !this.blurSymbol) {
            return;
        }

        this.blurSymbol.active = isShowBlurSymbol;
        this.effectSpine.node.active = !isShowBlurSymbol;
        if (isShowBlurSymbol) {
            AnimationUtils.setOpacityNode(this.blurSymbol, 255);
            AnimationUtils.setOpacityNode(this.effectSpine.node, 1);
            this.blurSymbol.scale = v3(1 / 1.5, 1, 1).multiplyScalar(1.5);
            // AnimationUtils.fadeIn(this.blurSymbol, 0.3);
            // AnimationUtils.fadeOut(this.effectSpine.node, 0.3);
        } else {
            AnimationUtils.setOpacityNode(this.blurSymbol, 1);
            AnimationUtils.setOpacityNode(this.effectSpine.node, 255);
            // AnimationUtils.fadeIn(this.effectSpine.node, 0.3);
            // AnimationUtils.fadeOut(this.blurSymbol, 0.3);
        }
    }

    public addWinningEffect() {
        const cache = resourceCaches.slotWinningAnimation || {};
        const spine = this.winningEffect.getComponent(sp.Skeleton);
        spine.skeletonData = cache;
        spine.premultipliedAlpha = this.premultipliedAlpha;
        spine.setAnimation(0, "highlight", true);
    }

    public replaceItem(index: number, duration = 0) {
        const symbolsCache = resourceCaches.slotSymbols || {};
        const gameAtlasCache = resourceCaches.gameAtlas;

        if (this.effectSpine) {
            const anim = "idle";
            let spriteFrame = gameAtlasCache.getSpriteFrame(`symbol-${index}-blur`);

            if (symbolsCache[index].isJackpot) {
                spriteFrame = gameAtlasCache.getSpriteFrame(`symbol-${index}.jackpot-blur`);
            }

            this.blurSymbol.getComponent(Sprite).spriteFrame = spriteFrame;
            this.effectSpine.skeletonData = symbolsCache[index].symbol;
            this.effectSpine.premultipliedAlpha = this.premultipliedAlpha;
            this.effectSpine.setAnimation(0, anim, true);
        }
    }

    showWinningEffect(show: boolean) {
        this.winningEffect.active = show;
        if (this.effectSpine) {
            const anim = show ? "highlight" : "idle";
            this.effectSpine.setAnimation(0, anim, true);
        }
        this.showMoreEffect(this.effectSpine.node, show);
    }

    showMoreEffect(node: Node, show: boolean) {
        const effectNode = node.getChildByName("winningEffect");
        if (effectNode) {
            effectNode.active = show;
        }
    }

    updateDuration(duration: number) {
        AnimationUtils.updateSpineDuration(this.effectSpine, "highlight", duration);
    }
}
