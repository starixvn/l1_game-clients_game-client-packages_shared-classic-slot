import gc from "@sg/game-client-base";
import { _decorator, Color, JsonAsset, RichText, sys } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { random } from "lodash-es";
import Observer from "observer";
import { SlotNotification } from "../../definitions";
import { BetControlStore } from "../../handlers/stores/bet-control-store";
import { SlotBoardStore } from "../../handlers/stores/slot-board-store";
const { ccclass, property } = _decorator;
const { observer, render, handle } = Observer;

@ccclass
export class SlotGameBottomMessage extends ObserverComponent {
    @property(RichText)
    msgRichText: RichText = null;

    @property(JsonAsset)
    colorInfo: JsonAsset = null;
    highlightColor: string;
    private isTurboMode = false;
    private colorConfig: any;
    private state = "";
    private autoSpinCount = 0;
    private freeSpinCount = 0;
    private autoSpinEnabled = false;
    private freeSpinEnabled = false;
    onLoad() {
        this.colorConfig = this.colorInfo.json;
        this.highlightColor = this.colorConfig.noticeHighlightTextColor;
        this.msgRichText.fontColor = new Color().fromHEX(this.colorConfig.noticeTextColor);
        super.onLoad();
    }

    updateMessageContent(msg: string) {
        this.msgRichText.string = msg.toUpperCase();
    }

    protected showFreeSpinCount(amount: number) {
        const amountFormatting = `<color=${this.highlightColor}>${amount}</color>`;
        const msg = gc.Translator.gameTranslate(`free_spin_left_amount`).toUpperCase();
        this.msgRichText.string = msg.replace(/%{amount}/i, amountFormatting);
    }

    protected showAutoSpinCount(autoSpinCount: number) {
        const msg = gc.Translator.gameTranslate(`auto_spin_left`);
        this.updateMessageContent(`${msg} ${autoSpinCount}`);
    }

    @render(SlotBoardStore, (store) => store.bottomMessageState)
    renderBottomMessage(bottomMessageState: string) {
        this.state = bottomMessageState;
        this.updateMessage();
    }

    updateMessage() {
        if (this.freeSpinEnabled) {
            this.showFreeSpinCount(this.freeSpinCount);
            return;
        }

        if (this.autoSpinEnabled) {
            this.showAutoSpinCount(this.autoSpinCount);
            return;
        }

        switch (this.state) {
            case SlotNotification.READY:
                this.handleMessageBeforeSpin();
                break;
            case SlotNotification.SPINNING:
                this.updateMessageContent(gc.Translator.gameTranslate(`round_settle_msg`));
                break;
            case SlotNotification.SETTLED:
                this.handleMessageSettled();
                break;
            // case SlotNotification.AUTO_SPIN:
            //     this.showAutoSpinCount(this.autoSpinCount);
            //     break;
            // case SlotNotification.FREESPINS:
            //     this.showFreeSpinCount(this.freeSpinCount);
            //     break;
            default:
                break;
        }
    }

    @render(BetControlStore, (store) => store.turboEnabled)
    renderTurboMode(turboMode: boolean) {
        this.isTurboMode = turboMode;
    }

    handleMessageBeforeSpin() {
        const deviceSuffix = sys.isMobile ? "phone" : "desktop";
        this.updateMessageContent(gc.Translator.gameTranslate(`show_msg_when_spin_${deviceSuffix}`));
    }

    handleMessageSettled() {
        const index = this.randomMsgIndex();
        this.updateMessageContent(gc.Translator.gameTranslate(`from_settle_to_spin${index}`));
    }

    randomMsgIndex() {
        if (this.isTurboMode) {
            return random(1, 2);
        }
        return random(1, 3);
    }

    @render(BetControlStore, (store) => store.freeSpinCount)
    setFreeSpinsCount(freeSpinCount: number) {
        this.freeSpinCount = freeSpinCount;
        this.updateMessage();
    }

    @render(BetControlStore, (store) => store.autoSpinCount)
    setRoundsAutoplayMsg(autoSpinCount: number) {
        this.autoSpinCount = autoSpinCount;
        this.updateMessage();
    }

    @render(BetControlStore, (store) => store.autoSpinEnabled)
    renderAutoSpinEnabled(autoSpinEnabled: boolean) {
        this.autoSpinEnabled = autoSpinEnabled;
        this.updateMessage();
    }

    @render(BetControlStore, (store) => store.freeSpinEnabled)
    renderFreeSpinEnabled(freeSpinEnabled: boolean) {
        this.freeSpinEnabled = freeSpinEnabled;
        this.updateMessage();
    }
}
