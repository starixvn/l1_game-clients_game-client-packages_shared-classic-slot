import gc from "@sg/game-client-base";
import { _decorator, Button, Label, Toggle } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { BetControlStore } from "../../handlers";
import { floatToNumber } from "../../utils/classic-slot-utils";
const { ccclass, property } = _decorator;
const { handle, render } = Observer;

@ccclass("BetControl")
export default class BetControl extends ObserverComponent {
    @property(Label)
    lblStake: Label = null;

    @property(Label)
    lblTotalBet: Label = null;

    @property(Label)
    lblTotalWin: Label = null;

    @property(Toggle)
    toggleAutoSpin: Toggle = null;

    @property(Toggle)
    toggleTurbo: Toggle = null;

    @property(Button)
    btnIncreaseStake: Button = null;

    @property(Button)
    btnDecreaseStake: Button = null;

    @render(BetControlStore, (store) => store.totalBet)
    renderTotalBet(totalBet: number) {
        this.lblTotalBet.string = gc.FormatUtils.numberWithCommas(totalBet);
    }

    @render(BetControlStore, (store) => store.stake)
    renderStake(stake: number) {
        this.lblStake.string = gc.FormatUtils.numberWithCommas(stake);
    }

    @render(BetControlStore, (store) => store.winningBet)
    renderTotalWin(totalWin: number) {
        if (totalWin === 0) {
            this.lblTotalWin.string = "0";
            return;
        }
        floatToNumber({
            from: 0,
            to: totalWin,
            duration: 1,
            progress: (value) => {
                this.lblTotalWin.string = gc.FormatUtils.numberWithCommas(value);
            },
        });
    }

    @handle(BetControlStore, (store, turbo: boolean) => store.setTurbo(turbo))
    onToggleTurbo() {
        return this.toggleTurbo.isChecked;
    }

    onToggleAutoSpin() {
        console.log("onToggleAutoSpin ", this.toggleAutoSpin.isChecked);
    }

    @handle(BetControlStore, (store, show: boolean) => store.setStakeSelectorShow(show))
    showStakeSelector(show: boolean) {
        return show;
    }

    openStakeSelector() {
        this.showStakeSelector(true);
    }

    closeStakeSelector() {
        this.showStakeSelector(false);
    }

    @render(BetControlStore, (store) => store.disableIncreaseStake)
    renderDisableIncreaseStake(disableIncreaseStake: boolean) {
        this.btnIncreaseStake.interactable = !disableIncreaseStake;
    }

    @render(BetControlStore, (store) => store.disableDecreaseStake)
    renderDisableDecreaseStake(disableDecreaseStake: boolean) {
        this.btnDecreaseStake.interactable = !disableDecreaseStake;
    }

    @handle(BetControlStore, (store) => store.quickChangeStake(true))
    onIncreaseStake() {}

    @handle(BetControlStore, (store) => store.quickChangeStake(false))
    onDecreaseStake() {}
}
