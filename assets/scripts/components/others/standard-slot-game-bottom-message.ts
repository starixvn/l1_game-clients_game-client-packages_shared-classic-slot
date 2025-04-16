import { _decorator, Label, RichText } from "cc";
import { ComponentUtils } from "db://shared-components/shared/utils";
import SlotGameBottomMessage from "./slot-game-bottom-message";
const { ccclass, property } = _decorator;

@ccclass
export default class StandardSlotGameBottomMessage extends SlotGameBottomMessage {
    @property({ type: Label, visible: false, override: true })
    msgText: Label = null;

    @property(RichText)
    msgRichText: RichText = null;

    highlightColor: string;

    updateMessageContent(msg: string) {
        this.msgRichText.string = msg.toUpperCase();
    }

    protected showFreeSpinCount(amount: number) {
        const amountFormatting = `<color=${this.highlightColor}>${amount}</color>`;
        //TODO: fix
        // const msg = GameUtils.getText(`ui.free_spin_left_amount`).toUpperCase();
        // this.msgRichText.string = msg.replace(`%{amount}`.toUpperCase(), amountFormatting);
    }

    updateColor(textColor: string, highlightColor: string) {
        ComponentUtils.setNodeColor(this.msgRichText.node, textColor);
        this.highlightColor = highlightColor;
    }
}
