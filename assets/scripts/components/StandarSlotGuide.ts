import { _decorator } from "cc";
import GameUtils from "../../common/GameUtils";
import { buildGameGuideUrl } from "../../common/helpers/UrlHelper";
import WebViewGuide from "../../common/webview-guide/WebViewGuide";
const { ccclass, property } = _decorator;

@ccclass
export default class StandarSlotGuide extends WebViewGuide {
    enableJackpot = false;

    initURL(
        gameId: number,
        language: string,
        configStake: { minBet: number; maxBet: number; used: boolean },
        isInPromotionTime: boolean,
        fractionalOddsFormat = false,
        specialDirection = ""
    ) {
        const domain = buildGameGuideUrl();
        const displayName = GameUtils.getGameNameString(gameId);

        const url = `${domain}/${language}?gId=${gameId}&displayName=${displayName}&jackpot=${this.enableJackpot}&t=${
            this.themeName
        }&p=${isInPromotionTime}&f=c&v=${Date.now()}&fof=${fractionalOddsFormat}`;

        this.url = url;
    }
}
