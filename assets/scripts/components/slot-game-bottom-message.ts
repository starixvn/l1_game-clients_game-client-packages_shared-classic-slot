import { _decorator, Component, Label, sys } from "cc";
import { shuffle } from "lodash-es";

export enum SlotNotification {
    BEFORESPIN = 0,
    SPINNING = 1,
    SETTLED = 2,
    TUMBLEWIN = 3,

    FREESPINS = 4,
}
const { ccclass, property } = _decorator;

@ccclass
export default class SlotGameBottomMessage extends Component {
    @property(Label)
    msgText: Label = null;

    isTurboMode = false;
    isAutoSpin = false;
    autoSpinCount = 0;
    isFreeSpin = false;
    freeSpinCount = 0;
    isTrialMode = false;
    private normalSettledMsg = ["FromSettleToSpin1", "FromSettleToSpin2", "FromSettleToSpin3"];
    private turboSettledMsg = ["FromSettleToSpin1", "FromSettleToSpin2"];

    private currentRoundType: number;
    private currentPlayMode: boolean;
    onLoad() {
        this.showMessages(SlotNotification.BEFORESPIN);
        this.shuffleSettleMessage();
    }

    shuffleSettleMessage() {
        this.normalSettledMsg = shuffle(this.normalSettledMsg);
        this.turboSettledMsg = shuffle(this.turboSettledMsg);
    }

    showMessages(roundType: SlotNotification) {
        if (this.isFreeSpin || this.freeSpinCount > 0) {
            this.currentRoundType = -1;
            this.showFreeSpinCount(this.freeSpinCount);
            return;
        }
        if (this.isAutoSpin) {
            this.currentRoundType = -1;
            this.showAutoSpinCount();
            return;
        }

        if (roundType === this.currentRoundType) {
            if (this.currentPlayMode === this.isTrialMode) {
                return;
            }
        }
        this.currentRoundType = roundType;
        this.currentPlayMode = this.isTrialMode;
        let msg: string;
        switch (roundType) {
            case SlotNotification.SPINNING:
                msg = GameUtils.getText(`messages.roundSettleMsg`);
                break;
            case SlotNotification.BEFORESPIN:
                msg = this.showBeforeSpinMessage();
                break;
            case SlotNotification.TUMBLEWIN:
                msg = GameUtils.getText(`messages.winTumbleMsg`);
                break;
            case SlotNotification.SETTLED:
                msg = this.randomSettledMessages();
                break;
        }
        msg && this.updateMessageContent(GameUtils.capitalizeWordIntoString(msg));
    }

    updateMessageContent(msg: string) {
        this.msgText.string = msg;
    }

    protected showFreeSpinCount(amount: number) {
        this.updateMessageContent(GameUtils.getText(`ui.free_spin_left_amount`, { amount }));
    }

    protected showAutoSpinCount() {
        const msg = GameUtils.getText(`ui.autoSpinLeft`);
        this.updateMessageContent(GameUtils.capitalizeWordIntoString(`${msg} ${this.autoSpinCount}`));
    }

    protected showBeforeSpinMessage() {
        if (this.isTrialMode) {
            return GameUtils.getText(`messages.${this.turboSettledMsg[_.random(this.turboSettledMsg.length - 1)]}`);
        } else {
            const deviceSuffix = sys.isMobile ? "Phone" : "Desktop";
            return GameUtils.getText(`messages.showMsgWhenSpin${deviceSuffix}`);
        }
    }

    protected randomSettledMessages() {
        const items = this.isTurboMode || this.isTrialMode ? this.turboSettledMsg : this.normalSettledMsg;
        return GameUtils.getText(`messages.${items[_.random(items.length - 1)]}`);
    }

    updateColor(textColor: string, highlightColor: string) {
        //empty
    }
}
