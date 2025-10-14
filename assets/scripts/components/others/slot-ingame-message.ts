

import gc from "@sg/game-client-base";
import { _decorator, Color, RichText, sys, tween, v3 } from "cc";
import { AutoScrollingContent } from "db://shared-components/shared/common-components/auto-scrolling/auto-scrolling-content";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import _ from "lodash";
import Observer from "observer";
import { SpecialSymbol } from "../../definitions";
import { SlotBoardStore } from "../../handlers";
import { getSymbolJackpotName, resourceCaches } from "../../utils/classic-slot-utils";
const { ccclass, property } = _decorator;
const { observer, render, handle } = Observer;
@ccclass
export class SlotIngameMessage extends ObserverComponent {
    @property(RichText)
    msgRichText: RichText = null;

    protected keys = [
        "show_msg_when_spin_desktop",
        "show_msg_when_spin_phone",
        "msg_bonus_symbol",
        "msg_free_spins",
        "msg_wild",
    ];

    protected filterKeys = [];
    protected currentKey = "";
    protected gameConfigOdds: any;

    onLoad() {
        const { noticeTextColor } = resourceCaches.colorJson;
        this.msgRichText.fontColor = new Color().fromHEX(noticeTextColor);

        const ignoreKey = !sys.isMobile ? "phone" : "desktop";
        this.filterKeys = this.keys.filter(key => !key.includes(ignoreKey));
        super.onLoad();
    }

    private scheduleChangeMessages() {
        const delay = this.intervalChangeMessage();
        this.scheduleOnce(this.intervalChangeMessage, delay);
    }

    generateImageKeys() {
        const jackpotEnabled = resourceCaches.jackpotEnabled;
        const spriteMap = {
            "bonus_symbol": "symbol-8",
            "free_spin_symbol": "symbol-7",
            "symbol_10": jackpotEnabled ? getSymbolJackpotName() : "symbol-10",
            "wild_symbol": "symbol-9"
        };
        const keys = {}
        Object.keys(spriteMap).forEach(key => {
            keys[key] = `<img src='${spriteMap[key]}' />`;
        });
        return keys;
    }

    updateMessageContent(msg: string) {
        this.msgRichText.string = msg;
    }

    @render(gc.GameConfigs.GameConfigStore, (store) => store.odds)
    renderGameOdd(odds: any) {
        if (!odds) {
            return;
        }
        this.gameConfigOdds = odds;

        this.unschedule(this.intervalChangeMessage);
        this.scheduleChangeMessages();
    }

    getMinOdds(odds: any) {
        return Object.keys(odds)
            .filter(key => odds[key] > 0)
            .map(key => +key)
            .sort((a, b) => a - b)[0];
    }

    intervalChangeMessage() {
        const options = {
            ...this.generateImageKeys(),
            bonus_odds: this.getMinOdds(this.gameConfigOdds[SpecialSymbol.BONUS]),
            free_spin_odds: this.getMinOdds(this.gameConfigOdds[SpecialSymbol.FREESPIN]),
        };
        const keys = this.filterKeys.filter(key => key !== this.currentKey);
        const index = _.random(keys.length - 1);
        this.currentKey = keys[index];
        this.updateMessageContent(gc.Translator.t(`Classicslot.${this.currentKey}`, options));

        const scrollDuration = this.updateScrolling();
        return Math.max(scrollDuration, 5);
    }

    private updateScrolling() {
        return this.node.getComponent(AutoScrollingContent).updateScrolling();
    }

    showTotalWin(value: number) {
        const color = "FFFC00";
        const msg = `${gc.Translator.t(`Common.total_win`)}: <color=${color}>${value}</color>`;
        this.updateMessageContent(msg);
        this.updateScrolling();

        this.msgRichText.node.position = v3(0, 0, 0);
        this.msgRichText.node.scale = v3(1, 1, 1).multiplyScalar(0.3);
        tween(this.msgRichText.node)
            .to(0.3, { scale: v3(1, 1, 1).multiplyScalar(1.2) }, { easing: "backOut" })
            .to(0.1, { scale: v3(1, 1, 1) }, { easing: "sineOut" })
            .start()
    }

    @render(SlotBoardStore, (store) => store.winningBet)
    renderWinningBet(winningBet: number) {
        if (winningBet > 0) {
            this.unschedule(this.intervalChangeMessage);
            this.showTotalWin(winningBet);
        } else {
            this.scheduleChangeMessages();
        }
    }
}

