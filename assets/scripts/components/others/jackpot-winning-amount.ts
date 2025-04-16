import { _decorator, Sprite } from "cc";
import BigWinAnimation from "./big-win-animation";
const { ccclass, property } = _decorator;

@ccclass
export default class JackpotWinningAmount extends BigWinAnimation {
    @property(Sprite)
    poolSprite: Sprite = null;

    async loadPoolSprite(pool: string) {
        try {
            const prizeTxt = `text-${pool}`;
            //TODO: fix
            // const frame = await GameUtils.loadResourceAsset<SpriteFrame>(`shared/slot-game/textures/jackpot/${prizeTxt}`, SpriteFrame);
            // this.poolSprite.spriteFrame = frame;
        } catch (error) {
            console.log("Failed to load pool image");
        }
    }
}
