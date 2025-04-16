import { _decorator, Node, Prefab, sp } from "cc";
import GameUtils from "../../common/GameUtils";
import { uiManager } from "../../managers/GameUIManager";
import SlotReelItem from "./SlotReelItem";
const { ccclass, property } = _decorator;

@ccclass
export default class StandardSlotReelItem extends SlotReelItem {
    @property({ type: Prefab, visible: false, override: true })
    itemPrefabs: Prefab[] = [];

    @property
    premultipliedAlpha = false;

    onLoad() {
        super.onLoad();
    }

    public addWinningEffect() {
        const cache = uiManager.prefabCache.slotWinningAnimation[this.gameId] || {};
        const spine = this.winningEffect.getComponent(sp.Skeleton);
        spine.skeletonData = cache;
        spine.premultipliedAlpha = this.premultipliedAlpha;
        spine.setAnimation(0, "highlight", true);
    }

    public replaceItem(index: number, duration = 0) {
        const symbolsCache = uiManager.prefabCache.slotSymbols[this.gameId] || {};
        const gameAtlasCache = uiManager.prefabCache.gameAtlas[this.gameId];

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
        GameUtils.updateSpineDuration(this.effectSpine, "highlight", duration);
    }
}
