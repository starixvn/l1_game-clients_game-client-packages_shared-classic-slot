import gc from "@sg/game-client-base";
import { _decorator, Button, Color, Label, Node } from "cc";
import BetHistoryBodyItem from "db://shared-components/game/bet-history/scripts/components/bet-history-body-item";
import { ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
const { ccclass, property } = _decorator;
const { handle } = Observer;

@ccclass("ClassicSlotHistoryItem")
export class ClassicSlotHistoryItem extends BetHistoryBodyItem {
    @property(Label)
    lblLine: Label = null;

    @property(Label)
    lblBet: Label = null;

    @property(Label)
    lblTotalWin: Label = null;

    @property
    textHighlightColor: Color = Color.YELLOW;

    @property
    textNormalColor: Color = Color.WHITE;

    @property(Node)
    jackpotIcon: Node = null;

    @property({ override: true, visible: false })
    lblDate: Label = null;

    @property({ override: true, visible: false })
    lblHour: Label = null;

    @property({ override: true, visible: false })
    btnRound: Button = null;

    @property({ override: true, visible: false })
    result: Node = null;

    @property({ override: true, visible: false })
    lblWinLoss: Label = null;

    betHistoryLog: gc.BetHistory.BetHistoryLog = null;

    setData(data: any) {
        const { betHistoryLog, index } = data;
        this.betHistoryLog = betHistoryLog;

        const { betWin, settlementResult, time, id, bet, totalAmount } = betHistoryLog;
        let win = betWin;
        if (settlementResult.jackpot) {
            win += settlementResult.jackpot.winningAmount;
        }

        this.node.active = true;
        this.nodeBackground.active = index % 2 > 0;
        this.lblTime.string = gc.DateTimeUtils.getStringDateByTime(time);
        this.lblRound.string = id.toString();
        this.lblBet.string = gc.FormatUtils.numberWithCommas(bet);
        this.lblLine.string = "25";
        this.lblTotalStake.string = betHistoryLog.freeSpin ? "0" : gc.FormatUtils.numberWithCommas(totalAmount, 2);
        this.lblTotalWin.string = gc.FormatUtils.numberWithCommas(win, 2, false);

        const color = win > 0 ? this.textHighlightColor : this.textNormalColor;
        ComponentUtils.setNodeColor(this.lblTime.node, color);
        ComponentUtils.setNodeColor(this.lblBet.node, color);
        ComponentUtils.setNodeColor(this.lblLine.node, color);

        this.showJackpotIcon(settlementResult.jackpot);
    }

    protected showJackpotIcon(jackpot) {
        if (jackpot && this.jackpotIcon) {
            this.jackpotIcon.active = true;
        }
    }
}
