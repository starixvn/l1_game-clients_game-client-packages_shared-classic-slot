import gc from "@sg/game-client-base";
import { _decorator, Component, Label, Node, Sprite } from "cc";
import Observer from "observer";
const { ccclass, property } = _decorator;
const { handle } = Observer;

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
        this.order.string = order.toString();
        this.payline.spriteFrame = paylineSprite;
        this.symbol.spriteFrame = symbolsSprite;
        this.amount.string = amount;
        this.payout.string = payout;
        this.bet.string = bet !== "" ? gc.FormatUtils.numberWithCommas(bet, 2) : "";
        this.win.string = win !== "" ? gc.FormatUtils.numberWithCommas(win, 2) : "";
        this.bg.active = (order - 1) % 2 > 0;
    }
}
