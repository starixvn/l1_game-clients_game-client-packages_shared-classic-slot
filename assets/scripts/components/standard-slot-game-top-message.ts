import { _decorator, Sprite, SpriteAtlas } from "cc";
import SlotGameTopMessage from "./SlotGameTopMessage";
const { ccclass, property } = _decorator;

@ccclass
export default class StandardSlotGameTopMessage extends SlotGameTopMessage {
    mainAtlas: SpriteAtlas;

    @property(Sprite)
    iconMultiplier: Sprite = null;

    updateTopMessage() {
        this.iconMultiplier.spriteFrame = this.mainAtlas.getSpriteFrame("symbol-13");
        super.updateTopMessage();
    }
}
