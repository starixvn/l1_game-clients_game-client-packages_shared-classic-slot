import gc from "@sg/game-client-base";
import { _decorator, Button, Color, Label, Node, Sprite } from "cc";
import BetHistoryBodyItem from "db://shared-components/game/bet-history/scripts/components/bet-history-body-item";
import { AppUtils, ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import { resourceCaches } from "../../utils/classic-slot-utils";
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
    textHighlightColor: Color = new Color().fromHEX('#EBBC00');

    @property
    textNormalColor: Color = Color.WHITE;

    @property(Node)
    jackpotIcon: Node = null;

    @property({ override: true, visible: false })
    lblWin: Label = null;

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

    override setData(data: any) {
        const { betHistoryLog, index } = data;
        this.betHistoryLog = betHistoryLog;

        const { betWin, settlementResult, time, id, bet, totalAmount } = betHistoryLog;
        let win = betWin;
        if (settlementResult.jackpot) {
            win += settlementResult.jackpot.winningAmount;
        }
        this.node.name = `item-${id}`;
        this.node.active = true;
        this.nodeBackground.active = index % 2 > 0;
        this.lblTime.string = gc.DateTimeUtils.getStringDateByTime(time);
        this.lblRound.string = id.toString();
        this.lblTotalStake.string = betHistoryLog.freeSpin ? "0" : gc.FormatUtils.numberWithCommas(totalAmount, 2);
        this.lblTotalWin.string = gc.FormatUtils.numberWithCommas(win, 2, true);

        const color = win > 0 ? this.textHighlightColor : this.textNormalColor;
        ComponentUtils.setNodeColor(this.lblTime.node, color);

        if (this.lblBet) {
            this.lblBet.string = gc.FormatUtils.numberWithCommas(bet, 2, true);
            ComponentUtils.setNodeColor(this.lblBet.node, color);
        }

        if (this.lblLine) {
            this.lblLine.string = "25";
            ComponentUtils.setNodeColor(this.lblLine.node, color);
        }

        this.showJackpotIcon(settlementResult.jackpot);
    }

    protected showJackpotIcon(jackpot) {
        if (this.jackpotIcon) {
            this.jackpotIcon.active = jackpot;
            jackpot && this.updateJackpotSprite();
        }
    }

    protected updateJackpotSprite() {
        const gameAtlas = resourceCaches.gameAtlas;
        const sprite = this.jackpotIcon.getComponent(Sprite);
        const lang = AppUtils.getLocale();
        const suffix = lang === "vi-VN" ? `-${lang}` : "";
        gameAtlas && (sprite.spriteFrame = gameAtlas.getSpriteFrame(`history-jackpot${suffix}`));
    }
}
