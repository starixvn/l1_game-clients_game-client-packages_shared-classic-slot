import { _decorator, Sprite, SpriteFrame } from "cc";
import { bundleManager } from "db://shared-components/shared/common-components/bundle-manager/bundle-manager";
import { CLASSIC_SLOT_BUNDLE } from "../../utils/classic-slot-utils";
import BigWinAnimation from "./big-win-animation";
const { ccclass, property } = _decorator;

@ccclass
export default class JackpotWinningAmount extends BigWinAnimation {
    @property(Sprite)
    poolSprite: Sprite = null;

    async loadPoolSprite(pool: string) {
        try {
            const prizeTxt = `text-${pool}`;
            const frame = await bundleManager.loadAssetsFromBundle<SpriteFrame>(
                CLASSIC_SLOT_BUNDLE,
                `images/jackpot/${prizeTxt}/spriteFrame`,
                SpriteFrame,
                null
            );
            this.poolSprite.spriteFrame = frame;
        } catch (error) {
            console.log("Failed to load pool image");
        }
    }
}
