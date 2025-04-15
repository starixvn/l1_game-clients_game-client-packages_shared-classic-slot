import { _decorator, Color, Component, Label, Node } from "cc";
import { shortenName } from "../../common/helpers/NicknameHelper";
import { userManager } from "../../common/user/UserManager";
import { getStringDateByTime } from "./../../common/helpers/DateTimeHelper";
import { numberWithCommas } from "./../../common/helpers/NumberHelper";
const { ccclass, property } = _decorator;

@ccclass
export default class SlotGameTopWinnerItem extends Component {
    @property(Node)
    bg: Node = null;

    @property(Label)
    time: Label = null;

    @property(Label)
    player: Label = null;

    @property(Label)
    amount: Label = null;

    @property(Label)
    win: Label = null;

    @property(Color)
    highlightColor: Color = null;

    public gameConfigs;

    setData(player: any, index: number, showBigWin: boolean) {
        const isLoginUser = userManager.isLoginUser(player.name);
        this.bg.active = index % 2 > 0;
        this.time.string = getStringDateByTime(player.time);
        this.player.string = isLoginUser ? player.name : shortenName(player.name);
        this.setOtherValues(player, showBigWin);
        if (isLoginUser) {
            this.setTextColor(this.highlightColor ? this.highlightColor : Color.YELLOW);
        }
    }

    setTextColor(color: Color) {
        this.time.node.color = color;
        this.player.node.color = color;
        this.amount.node.color = color;
        this.win.node.color = color;
    }

    setOtherValues(player: any, showBigWin: boolean) {
        const { freeSpin, totalAmount, winningAmount, bet } = player;

        if (showBigWin) {
            this.amount.string = freeSpin ? "Free Spin" : numberWithCommas(totalAmount, 1);
        } else {
            this.amount.string = bet;
        }

        this.win.string = numberWithCommas(winningAmount, 2);
    }
}
