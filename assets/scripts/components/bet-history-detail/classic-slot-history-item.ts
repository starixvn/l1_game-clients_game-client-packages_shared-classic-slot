import gc from "@sg/game-client-base";
import { _decorator, Color, Label, Node } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
const { ccclass, property } = _decorator;
const { handle } = Observer;

@ccclass("ClassicSlotHistoryItem")
export class ClassicSlotHistoryItem extends ObserverComponent {
    @property(Node)
    bg: Node = null;

    @property(Label)
    time: Label = null;

    @property(Label)
    roundID: Label = null;

    @property(Label)
    lblBet: Label = null;

    @property(Label)
    lblLine: Label = null;

    @property(Label)
    lblTotalBet: Label = null;

    @property(Label)
    lblTotalWin: Label = null;

    @property
    textHighlightColor: Color = Color.YELLOW;

    @property
    textNormalColor: Color = Color.WHITE;

    @property(Node)
    jackpotIcon: Node = null;

    betHistoryLog: gc.BetHistory.BetHistoryLog = null;

    setData(data: any) {
        const { betLog, index } = data;
        this.betHistoryLog = betLog;

        const { betWin, settlementResult, time, id, bet, totalAmount } = betLog;
        let win = betWin;
        if (settlementResult.jackpot) {
            win += settlementResult.jackpot.winningAmount;
        }

        this.node.active = true;
        this.bg.active = index % 2 > 0;
        this.time.string = gc.DateTimeUtils.getStringDateByTime(time);
        this.roundID.string = id.toString();
        this.lblBet.string = gc.FormatUtils.numberWithCommas(bet);
        this.lblLine.string = "25";
        this.lblTotalBet.string = betLog.freeSpin ? "0" : gc.FormatUtils.numberWithCommas(totalAmount, 2);
        this.lblTotalWin.string = gc.FormatUtils.numberWithCommas(win, 2, false);

        const color = win > 0 ? this.textHighlightColor : this.textNormalColor;
        ComponentUtils.setNodeColor(this.time.node, color);
        ComponentUtils.setNodeColor(this.lblBet.node, color);
        ComponentUtils.setNodeColor(this.lblLine.node, color);

        this.showJackpotIcon(settlementResult.jackpot);
    }

    protected showJackpotIcon(jackpot) {
        if (jackpot && this.jackpotIcon) {
            this.jackpotIcon.active = true;
        }
    }

    @handle(gc.BetHistory.BetDetailsHandlers)
    openTicketDetail() {
        this.playSoundClick();
        return this.betHistoryLog;
    }

    @handle(gc.Audios.AudioHandler, (handle, id: string) => handle.playSFX(id))
    playSoundClick() {
        return gc.Audios.AudioIds.CLICK;
    }
}
