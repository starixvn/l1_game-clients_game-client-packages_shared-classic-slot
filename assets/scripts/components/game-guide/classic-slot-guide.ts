import gc from "@sg/game-client-base";
import { _decorator } from "cc";
import WebViewGuide from "db://shared-components/game/game-guide/scripts/web-view-guide";
import Observer from "observer";

const { ccclass, property } = _decorator;
const { observer, render, handle } = Observer;

@ccclass
export class ClassicSlotGuide extends WebViewGuide {
    @handle(gc.GameGuide.GameGuideHandlers.GetGuideURL)
    initUrl(specialDirection = "", scrollToId = "") {
        const theme = "classic-slot-template";
        return { theme, specialDirection, scrollToId };
    }

    sendDataToIframe(gameConfigs: gc.GameConfigs.GameConfigStore) {
        const guideUrl = gc.UrlUtils.getSubDomain(this.url);
        this.onWebViewLoaded = () => {
            const configsWithBetInfo = {
                ...gameConfigs,
            };
            (document.getElementById("webview") as HTMLIFrameElement)?.contentWindow?.postMessage(
                JSON.stringify(configsWithBetInfo),
                guideUrl
            );
        };
    }
}
