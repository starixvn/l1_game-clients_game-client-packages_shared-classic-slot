import gc from "@sg/game-client-base";
const { MainPlayerStore } = gc.Player;
import { _decorator, Label, Tween } from 'cc';
import { AudioIds } from "db://assets/game/audios/AudioIds";
import { BetControlStore } from "db://shared-classic-slot/scripts/handlers/stores/bet-control-store";
import { SlotBoardStore } from "db://shared-classic-slot/scripts/handlers/stores/slot-board-store";
import { floatToNumber } from "db://shared-classic-slot/scripts/utils/classic-slot-utils";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { ObserverComponent } from 'db://shared-components/shared/common-components/observer-component/scripts/observer-component';
import { setXMode, getXMode } from "db://shared-common-slot/x-mode/scripts/utils/xMode-utils";

import Observer from "observer";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;
@ccclass('PlayerInfo')
export class PlayerInfo extends ObserverComponent {
    @property(Label)
    lblBalance: Label = null;

    @property(Label)
    lblTotalBet: Label = null;

    @property(Label)
    lblTotalWin: Label = null;

    private tweenFloatNumber: Tween = null;

    @render(MainPlayerStore, (store) => store.xMode)
    setXMode(value: number) {
        setXMode(value);
    }

    @render(gc.Player.MainPlayerStore, (store) => store.balance)
    setBalance(value: number) {
        const balance =  gc.FormatUtils.formatXMode(value, getXMode());
        this.lblBalance && (this.lblBalance.string = gc.FormatUtils.truncateFixedDecimals(balance, 6).toString());
    }

    @render(BetControlStore, (store) => store.totalBet)
    renderTotalBet(totalBet: number) {
        this.lblTotalBet.string = gc.FormatUtils.numberWithCommas(totalBet, 6, true);
    }

    @render(SlotBoardStore, (store) => store.winningBet)
    renderTotalWin(totalWin: number) {
        this.tweenFloatNumber && this.tweenFloatNumber.stop();
        if (totalWin === 0) {
            this.lblTotalWin.string = "0";
            return;
        }

        AudioUtils.playSFX(AudioIds.WIN);
        this.tweenFloatNumber = floatToNumber({
            from: 0,
            to: totalWin,
            duration: 0.6,
            progress: (value) => {
                this.lblTotalWin.string = gc.FormatUtils.numberWithCommas(value, 6, true);
            },
        });
    }
}


