import { _decorator, Component, Label, Node, Sprite } from "cc";
import { formatStringXMode } from "db://shared-common-slot/x-mode/scripts/utils/xMode-utils";
const { ccclass, property } = _decorator;

@ccclass("ClassicSlotBaseBetDetailLogItem")
export class ClassicSlotBaseBetDetailLogItem extends Component {
    @property(Node)
    bg: Node = null;

    @property(Label)
    order: Label = null;

    @property(Sprite)
    payline: Sprite = null;

    @property(Sprite)
    symbol: Sprite = null;

    @property(Label)
    amount: Label = null;

    @property(Label)
    payout: Label = null;

    @property(Label)
    bet: Label = null;

    @property(Label)
    win: Label = null;

    setData(data: any) {
        const { order, paylineSprite, symbolsSprite, amount, payout, bet, win } = data;
        if (this.order) {
            this.order.string = order.toString();
        }
        this.payline.spriteFrame = paylineSprite;
        this.symbol.spriteFrame = symbolsSprite;
        this.amount.string = amount;
        this.payout.string = payout;
        if (this.bet) {
            this.bet.string = bet !== "" ? formatStringXMode(bet) : "";
        }
        this.win.string = win !== "" ? formatStringXMode(win) : "";
        this.bg.active = order % 2 > 0;
    }
}