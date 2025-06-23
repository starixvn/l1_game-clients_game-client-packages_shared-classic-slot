import gc from "@sg/game-client-base";
import { _decorator, Button, Label, sp, Toggle, Tween } from "cc";
import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { ChangeNodeColor } from "db://shared-components/shared/common-components/change-node-color";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import { BetControlStore, SlotBetHandler } from "../../handlers";
import { SlotBoardStore } from "../../handlers/stores/slot-board-store";
import { floatToNumber, resourceCaches } from "../../utils/classic-slot-utils";
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

    @property(sp.Skeleton)
    spineEffectWin: sp.Skeleton = null;

    @property(Toggle)
    toggleAutoSpin: Toggle = null;

    @property(Toggle)
    toggleTurbo: Toggle = null;

    @property(Button)
    btnIncreaseStake: Button = null;

    @property(Button)
    btnDecreaseStake: Button = null;

    @property(Button)
    btnShowStakeSelector: Button = null;

    @property(Button)
    btnOpenAutoSpin: Button = null;

    tweenFloatNumber: Tween = null;

    onLoad() {
        this.updateColor();
        super.onLoad();
    }

    updateColor() {
        const { bottomAreaTextColor, bottomAreaNumberColor, bottomAreaButtonBorderColor, bottomAreaWinAmountColor } =
            resourceCaches.colorJson;

        this.getComponentsInChildren(ChangeNodeColor).forEach((comp) => {
            const labelComp = comp.getComponent(Label);
            if (labelComp) {
                const isLocalizedLabel = comp.node.getComponent("LocalizedLabel");
                comp.updateColor(isLocalizedLabel ? bottomAreaTextColor : bottomAreaNumberColor);
            } else {
                comp.updateColor(bottomAreaButtonBorderColor);
            }
        });

        ComponentUtils.setNodeColor(this.lblTotalWin.node, bottomAreaWinAmountColor);
    }

    @render(BetControlStore, (store) => store.totalBet)
    renderTotalBet(totalBet: number) {
        this.lblTotalBet.string = gc.FormatUtils.numberWithCommas(totalBet);
    }

    @render(BetControlStore, (store) => store.stake)
    renderStake(stake: number) {
        this.lblStake.string = gc.FormatUtils.numberWithCommas(stake);
    }

    @render(SlotBoardStore, (store) => store.winningBet)
    renderTotalWin(totalWin: number) {
        this.tweenFloatNumber && this.tweenFloatNumber.stop();
        if (totalWin === 0) {
            this.lblTotalWin.string = "0";
            this.hideWinEffect();
            return;
        }

        AudioUtils.playSFX(AudioIds.WIN);
        this.playWinEffect();
        this.tweenFloatNumber = floatToNumber({
            from: 0,
            to: totalWin,
            duration: 0.6,
            progress: (value) => {
                this.lblTotalWin.string = gc.FormatUtils.numberWithCommas(value);
            },
        });
    }

    protected playWinEffect() {
        this.spineEffectWin.node.active = true;
        this.spineEffectWin.setAnimation(0, "coin", false);
    }

    protected hideWinEffect() {
        this.spineEffectWin.node.active = false;
    }

    @handle(BetControlStore, (store, turbo: boolean) => store.setTurbo(turbo))
    onToggleTurbo() {
        AudioUtils.playClick();
        return this.toggleTurbo.isChecked;
    }

    @render(BetControlStore, (store) => store.turboEnabled)
    renderToggleTurbo(turboEnabled: boolean) {
        if (turboEnabled !== this.toggleTurbo.isChecked) {
            this.toggleTurbo.isChecked = turboEnabled;
        }
    }

    @render(BetControlStore, (store) => store.autoSpinEnabled)
    renderToggleAutoSpin(autoSpinEnabled: boolean) {
        this.toggleAutoSpin.isChecked = autoSpinEnabled;
    }

    @handle(SlotBetHandler, (store) => store.handleClickAutoSpin())
    onAutoSpinClick() {
        AudioUtils.playClick();
    }

    @handle(BetControlStore, (store, show: boolean) => store.setStakeSelectorShow(show))
    showStakeSelector(show: boolean) {
        return show;
    }

    openStakeSelector() {
        AudioUtils.playClick();
        this.showStakeSelector(true);
    }

    closeStakeSelector() {
        AudioUtils.playClick();
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
    onIncreaseStake() {
        AudioUtils.playClick();
    }

    @handle(BetControlStore, (store) => store.quickChangeStake(false))
    onDecreaseStake() {
        AudioUtils.playClick();
    }

    @handle(SlotBetHandler, (handler) => handler.showLineSelection())
    showLineSelection() {
        AudioUtils.playClick();
    }

    @render(SlotBoardStore, (store) => store.isReadyBet)
    renderCascadingState(isReadyBet: boolean) {
        this.btnShowStakeSelector.interactable = isReadyBet;
    }

    @render(SlotBoardStore, (store) => store.preventOpenAutoSpin)
    renderPreventOpenAutoSpin(preventOpenAutoSpin: boolean) {
        this.btnOpenAutoSpin.interactable = !preventOpenAutoSpin;
    }
}
