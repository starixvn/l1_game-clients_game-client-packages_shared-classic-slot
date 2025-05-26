import gc from "@sg/game-client-base";
import { _decorator } from "cc";
import WebViewGuide from "db://shared-components/game/game-guide/scripts/web-view-guide";
import Observer from "observer";

const { ccclass, property } = _decorator;
const { observer, render, handle } = Observer;

@ccclass
export class ClassicSlotGuide extends WebViewGuide {
    private level = 0;
    private coin = 0;

    @handle(gc.GameGuide.GameGuideHandlers.GetGuideURL)
    initUrl(specialDirection = "", scrollToId = "") {
        const theme = "classic-slot-template";
        return { theme, specialDirection, scrollToId };
    }

    // @render(BetControlStore, (store) => store.betLevel)
    // getBetLevel(betLevel: number) {
    //     this.level = betLevel;
    // }

    // @render(BetControlStore, (store) => store.coinValue)
    // getCoin(coin: number) {
    //     this.coin = coin;
    // }

    sendDataToIframe(gameConfigs: gc.GameConfigs.GameConfigStore) {
        const guideUrl = gc.UrlUtils.getSubDomain(this.url);
        this.onWebViewLoaded = () => {
            const configsWithBetInfo = {
                ...gameConfigs,
                // coin: this.coin,
                // level: this.level,
            };
            (document.getElementById("webview") as HTMLIFrameElement)?.contentWindow?.postMessage(
                JSON.stringify(configsWithBetInfo),
                guideUrl
            );
        };
    }
}
