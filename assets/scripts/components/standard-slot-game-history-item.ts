import { _decorator, Sprite } from "cc";
import { getLocale } from "../../common/auth/SessionManager";
import { uiManager } from "../../managers/GameUIManager";
import SlotGameHistoryItem from "./SlotGameHistoryItem";
const { ccclass, property } = _decorator;

@ccclass
export default class StandardSlotGameHistoryItem extends SlotGameHistoryItem {
    setData(betLog, index, gameId) {
        super.setData(betLog, index, gameId);

        const { betWin, settlementResult } = betLog;
        let win = betWin;
        const { jackpot } = settlementResult;
        if (jackpot) {
            win += settlementResult.jackpot.winningAmount;
            this.updateJackpotSprite(jackpot, gameId);
        }
        this.win.node.color = win > 0 ? this.textHighlightColor : this.textNormalColor;
    }

    protected showJackpotIcon(jackpot) {
        if (jackpot) {
            this.jackpotIcon.active = true;
        } else {
            this.jackpotIcon.active = false;
        }
    }

    private updateJackpotSprite(jackpot, gameId) {
        const gameAtlas = uiManager.prefabCache.gameAtlas[gameId];
        const sprite = this.jackpotIcon.getComponent(Sprite);
        const lang = getLocale();
        const suffix = lang === "vi-VN" ? `.${lang}` : "";
        gameAtlas && (sprite.spriteFrame = gameAtlas.getSpriteFrame(`history-jackpot${suffix}`));
    }
}
