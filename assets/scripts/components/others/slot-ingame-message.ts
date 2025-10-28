import gc from "@sg/game-client-base";
import { _decorator, Color, Font, Label, Node, RichText, sys, tween, v3 } from "cc";
import { AutoScrollingContent } from "db://shared-components/shared/common-components/auto-scrolling/auto-scrolling-content";
import { bundleManager } from "db://shared-components/shared/common-components/bundle-manager/bundle-manager";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { SpecialSymbol } from "../../definitions";
import { BetControlStore, SlotBoardStore } from "../../handlers";
import { getSymbolJackpotName, resourceCaches } from "../../utils/classic-slot-utils";
const { ccclass, property } = _decorator;
const { observer, render, handle } = Observer;
@ccclass
export class SlotIngameMessage extends ObserverComponent {
    @property(RichText)
    msgRichText: RichText = null;

    @property(Node)
    nodeTotalWin: Node = null;

    @property
    symbolSize = 75;

    protected keys = ["show_msg_when_spin_desktop", "show_msg_when_spin_phone", "msg_bonus_symbol", "msg_free_spins", "msg_wild"];

    protected filterKeys = [];
    protected currentKeyIndex = 0;
    protected gameConfigOdds: any;
    protected lblTotalWin: Label = null;

    private isWin = false;
    private nodeAutoScrollingContent: Node = null;

    onLoad() {
        const { noticeTextColor } = resourceCaches.colorJson;
        this.msgRichText.fontColor = new Color().fromHEX(noticeTextColor);
        this.updateFilterKeys();
        this.lblTotalWin = this.nodeTotalWin.getChildByName("value").getComponent(Label);
        this.loadFontTotalWin();
        super.onLoad();
    }

    private scheduleChangeMessages() {
        const delay = this.intervalChangeMessage();
        this.unschedule(this.scheduleChangeMessages);
        this.scheduleOnce(this.scheduleChangeMessages, delay);
    }

    generateImageKeys() {
        const jackpotEnabled = resourceCaches.jackpotEnabled;
        const spriteMap = {
            bonus_symbol: "symbol-8",
            free_spin_symbol: "symbol-7",
            symbol_10: jackpotEnabled ? getSymbolJackpotName() : "symbol-10",
            wild_symbol: "symbol-9",
        };
        const keys = {};
        Object.keys(spriteMap).forEach((key) => {
            keys[key] = `<img src='${spriteMap[key]}' height=${this.symbolSize} align=center />`;
        });
        return keys;
    }

    updateMessageContent(msg: string) {
        this.msgRichText.string = msg;
    }

    @render(gc.GameConfigs.GameConfigStore, (store) => store.odds)
    renderGameOdd(odds: any) {
        if (!odds[SpecialSymbol.BONUS] || !odds[SpecialSymbol.FREESPIN]) {
            return;
        }
        this.gameConfigOdds = odds;

        this.scheduleChangeMessages();
    }

    getMinOdds(odds: any) {
        return Object.keys(odds)
            .filter((key) => odds[key] > 0)
            .map((key) => +key)
            .sort((a, b) => a - b)[0];
    }

    intervalChangeMessage() {
        const options = {
            ...this.generateImageKeys(),
            bonus_odds: this.getMinOdds(this.gameConfigOdds[SpecialSymbol.BONUS]),
            free_spin_odds: this.getMinOdds(this.gameConfigOdds[SpecialSymbol.FREESPIN]),
        };

        // Use sequential index instead of random
        const index = this.currentKeyIndex % this.filterKeys.length;
        this.currentKeyIndex++;

        this.updateMessageContent(gc.Translator.t(`Classicslot.${this.filterKeys[index]}`, options));

        const scrollDuration = this.updateScrolling();
        return Math.max(scrollDuration, 5);
    }

    private updateFilterKeys(excludeFirstMsgInGame = false) {
        const ignoreKey = !sys.isMobile ? "phone" : "desktop";
        const keys = this.keys.filter((key) => !key.includes(ignoreKey));
        this.filterKeys = excludeFirstMsgInGame ? keys.slice(1) : keys;
    }

    @render(BetControlStore, (store) => store.excludeFirstMsgInGame)
    renderExcludeFirstMsgInGame(excludeFirstMsgInGame: boolean) {
        this.updateFilterKeys(excludeFirstMsgInGame);
    }

    private updateScrolling() {
        return this.node.getComponentsInChildren(AutoScrollingContent)[0].updateScrolling();
    }

    async loadFontTotalWin() {
        try {
            const fontBitmap = await bundleManager.loadResourcesAsset("fonts/font-win-money", Font);
            this.lblTotalWin.font = fontBitmap;
        } catch (e) {}
    }

    async showTotalWin(value: number) {
        this.lblTotalWin.string = gc.FormatUtils.numberWithCommas(value, 2);
        this.updateScrolling();

        this.nodeTotalWin.scale = v3(1, 1, 1).multiplyScalar(0.3);
        tween(this.nodeTotalWin)
            .to(0.3, { scale: v3(1, 1, 1).multiplyScalar(1.2) }, { easing: "backOut" })
            .to(0.1, { scale: v3(1, 1, 1) }, { easing: "sineOut" })
            .start();
    }

    @render(SlotBoardStore, (store) => store.winningBet, { fireImmediately: false })
    renderWinningBet(winningBet: number) {
        this.isWin = winningBet > 0;
        this.nodeTotalWin.active = this.isWin;
        this.msgRichText.node.active = !this.isWin;
        if (this.isWin) {
            this.unschedule(this.scheduleChangeMessages);
            this.showTotalWin(winningBet);
        } else {
            this.scheduleChangeMessages();
        }
    }
}
