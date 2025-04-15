import { _decorator, Sprite, SpriteFrame } from "cc";
import GameUtils from "../../common/GameUtils";
import BigWinAnimation from "./BigWinAnimation";
const { ccclass, property } = _decorator;

@ccclass
export default class JackpotWinningAmount extends BigWinAnimation {
    @property(Sprite)
    poolSprite: Sprite = null;

    async loadPoolSprite(pool: string) {
        try {
            const prizeTxt = `text-${pool}`;
            const frame = await GameUtils.loadResourceAsset<SpriteFrame>(`shared/slot-game/textures/jackpot/${prizeTxt}`, SpriteFrame);
            this.poolSprite.spriteFrame = frame;
        } catch (error) {
            console.log("Failed to load pool image");
        }
    }
}
