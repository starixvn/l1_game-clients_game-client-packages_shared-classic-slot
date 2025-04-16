import { _decorator, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import { numberWithCommas } from "../../common/helpers/NumberHelper";
const { ccclass, property } = _decorator;

@ccclass
export default class SlotGameTicketDetailItem extends Component {
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

    @property(Node)
    backhground: Node = null;

    setData(data: {
        order: number;
        paylineSprite: SpriteFrame;
        symbolsSprite: SpriteFrame;
        amount: string;
        payout: string;
        bet: string;
        win: string;
    }) {
        const { order, paylineSprite, symbolsSprite, amount, payout, bet, win } = data;
        this.order.string = order.toString();
        this.payline.spriteFrame = paylineSprite;
        this.symbol.spriteFrame = symbolsSprite;
        this.amount.string = amount;
        this.payout.string = payout;
        this.bet.string = bet !== "" ? numberWithCommas(bet, 2) : "";
        this.win.string = win !== "" ? numberWithCommas(win, 2) : "";
        this.backhground.active = (order - 1) % 2 > 0;
    }
}
