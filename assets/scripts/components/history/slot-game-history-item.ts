// import { _decorator, Color, Component, Label, Node } from "cc";
// import { getStringDateByTime } from "./../../common/helpers/DateTimeHelper";
// import { numberWithCommas } from "./../../common/helpers/NumberHelper";
// const { ccclass, property } = _decorator;

// @ccclass
// export default class SlotGameHistoryItem extends Component {
//     @property(Node)
//     bg: Node = null;

//     @property(Label)
//     time: Label = null;

//     @property(Label)
//     roundID: Label = null;

//     @property(Label)
//     bet: Label = null;

//     @property(Label)
//     payLines: Label = null;

//     @property(Label)
//     totalAmount: Label = null;

//     @property(Label)
//     win: Label = null;

//     @property(Node)
//     jackpotIcon: Node = null;

//     @property
//     textHighlightColor: Color = new Color(Color.YELLOW);

//     @property
//     textNormalColor: Color = new Color(Color.WHITE);

//     @property
//     enableHighlightBg = false;

//     @property({
//         visible: function (this: SlotGameHistoryItem) {
//             return this.enableHighlightBg;
//         },
//     })
//     bgHighlightColor: Color = Color.WHITE;

//     data: any = null;

//     public showTicketDetail = (data: any) => {
//         // do nohting
//     };

//     openTicketDetail() {
//         FunctionUtils.playClick();
//         this.showTicketDetail(this.data);
//     }

//     setData(betLog, index, gameId) {
//         const { betWin, settlementResult, time, id, paylines, bet, totalAmount } = betLog;
//         let win = betWin;
//         if (settlementResult.jackpot) {
//             win += settlementResult.jackpot.winningAmount;
//         }

//         this.node.active = true;
//         this.bg.active = index % 2 > 0;
//         this.time.string = getStringDateByTime(time);
//         this.roundID.string = id;
//         this.payLines.string = paylines.length;
//         this.bet.string = numberWithCommas(bet, 2);
//         this.totalAmount.string = betLog.freeSpin ? "0" : numberWithCommas(totalAmount, 2);
//         this.win.string = numberWithCommas(win, 2);
//         this.data = betLog;

//         const highlight = win > 0;
//         const highlightColor = highlight ? this.textHighlightColor : this.textNormalColor;
//         this.time.node.color = highlightColor;
//         this.payLines.node.color = highlightColor;
//         this.bet.node.color = highlightColor;
//         if (this.enableHighlightBg && highlight) {
//             this.bg.active = true;
//             this.bg.color = this.bgHighlightColor;
//         }

//         this.showJackpotIcon(settlementResult.jackpot);
//     }

//     protected showJackpotIcon(jackpot) {
//         if (jackpot && this.jackpotIcon) {
//             this.jackpotIcon.active = true;
//         }
//     }
// }
