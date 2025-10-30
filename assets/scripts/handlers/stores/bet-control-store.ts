import inversify from "inversify";
import mobx from "mobx";
const { injectable, inject } = inversify;

import gc from "@sg/game-client-base";
import { FSBPromotionUIStore } from "db://shared-common-slot/fsb-promotion/scripts/stores/fsb-promotion-ui-store";
import { SLOT_LINES, SlotState } from "../../definitions";
import { SlotBoardStore } from "./slot-board-store";

@injectable()
export class BetControlStore {
    @inject(gc.Rounds.RoundTimeStore) protected readonly roundTimeStore: gc.Rounds.RoundTimeStore;
    @inject(gc.Rounds.RoundStore) protected readonly roundStore: gc.Rounds.RoundStore;

    @inject(gc.GameConfigs.GameConfigStore) protected readonly gameConfigStore: gc.GameConfigs.GameConfigStore;

    @inject(gc.Player.MainPlayerStore) protected readonly mainPlayerStore: gc.Player.MainPlayerStore;

    @inject(gc.GameUserSettings.GameUserSettingHandler)
    protected readonly gameUserSettingHandler: gc.GameUserSettings.GameUserSettingHandler;
    @inject(gc.Notices.NoticeStore) protected readonly noticeStore: gc.Notices.NoticeStore;
    @inject(SlotBoardStore) protected readonly slotBoardStore: SlotBoardStore;
    @inject(FSBPromotionUIStore) protected readonly fsbPromotionUIStore: FSBPromotionUIStore;
    @inject(gc.Connection.ConnectionStore) protected readonly connectionStore: gc.Connection.ConnectionStore;

    constructor() {
        mobx.makeAutoObservable(this);
        setTimeout(() => {
            mobx.reaction(
                () => this.gameConfigStore.chips,
                (chips) => {
                    this.betLevels = chips.map((chip) => +chip);

                    if (this.betLevels.length > 3) {
                        console.warn("Setting chips MUST equal 3");
                        this.betLevels = this.betLevels.slice(0, 3);
                    }
                }
            );
        }, 0);
    }

    betLevels: number[] = [];
    stake = 0;
    freeSpinStake = -1;
    defaultStake = 0;

    totalBetChanged: { value: number } = null;

    get displayStake() {
        if (this.freeSpinEnabled && this.freeSpinStake !== -1) {
            return this.freeSpinStake;
        }

        return this.stake;
    }

    roundId = -1;

    get totalBet() {
        if (this.freeSpinStake !== -1 || this.fsbPromotionUIStore.isFSBPromotionInProgress) {
            return 0;
        }
        return this.displayStake * SLOT_LINES;
    }

    stakeSelectorShow = false;
    stakeSelectorDisabled = false;

    showLineSelection = null;

    didSpin = false;
    triggerAutoSpin = false;
    autoSpinCount = 0;
    autoSpinEnabled = false;
    autoSpinDialogOpenEvent = null;
    autoSpinSelectedValue = 10;
    readonly autoSpinOptions = [10, 30, 50, 80, 100, 200, 500, 1000];

    freeSpinCount = -1;
    freeSpinCountDisplay = -1;

    isFreeSpinEffectCompleted = false;
    get freeSpinEnabled() {
        return this.freeSpinCount > 0;
    }

    get freeSpinEnabledDisplay() {
        return this.freeSpinEnabled && this.freeSpinCountDisplay > -1;
    }

    turboEnabled = false;
    get turboEnabledOnSpin() {
        return this.turboEnabled || this.triggerAutoSpin;
    }

    get stakeIndex() {
        return this.betLevels.indexOf(this.stake);
    }

    get disableIncreaseStake() {
        return this.stakeIndex === this.betLevels.length - 1 || this.stakeIndex === -1 || this.preventChangeBet;
    }

    get disableDecreaseStake() {
        return this.stakeIndex === 0 || this.stakeIndex === -1 || this.preventChangeBet;
    }

    get isReadyBet() {
        return (this.slotBoardStore.slotState === SlotState.READY
            || this.slotBoardStore.slotState === SlotState.SETTLED
            || this.slotBoardStore.slotState === SlotState.AUTO_SPIN)
            && this.connectionStore.isConnected;
    }

    get preventOpenAutoSpin() {
        return (!this.isReadyBet && !this.autoSpinEnabled) || this.freeSpinEnabled || this.fsbPromotionUIStore.isFSBPromotionInProgress;
    }

    get preventChangeBet() {
        const preventStates = [SlotState.SPINNING, SlotState.SPIN_DONE];
        return (
            !this.isReadyBet ||
            preventStates.includes(this.slotBoardStore.slotState) ||
            this.autoSpinEnabled ||
            this.freeSpinEnabled ||
            this.fsbPromotionUIStore.isFSBPromotionInProgress
        );
    }

    get disableSpinButton() {
        return (
            this.autoSpinEnabled ||
            (this.didSpin && this.freeSpinEnabled) ||
            this.slotBoardStore.slotState === SlotState.SPINNING ||
            this.slotBoardStore.slotState === SlotState.NOT_READY ||
            this.slotBoardStore.slotState === SlotState.SPIN_DONE
        );
    }

    get isUsedFSBPromotionBonus() {
        return this.freeSpinCount <= 0 && this.isFreeSpinEffectCompleted;
    }

    get excludeFirstMsgInGame() {
        return (
            this.autoSpinEnabled ||
            this.freeSpinEnabled ||
            this.fsbPromotionUIStore.isFSBPromotionInProgress ||
            this.slotBoardStore.slotState === SlotState.SPINNING
        );
    }

    setStake(stake: number) {
        this.stake = stake;
    }

    triggerTotalBetChange() {
        this.totalBetChanged = { value: this.totalBet };
    }

    setFreeSpinStake(stake: number) {
        this.freeSpinStake = stake;
    }

    quickChangeStake(increase: boolean) {
        const index = this.stakeIndex;
        if (index === -1) {
            return;
        }

        if (increase) {
            if (index === this.betLevels.length - 1) {
                return;
            }
            this.stake = this.betLevels[index + 1];
            this.triggerTotalBetChange();
        } else {
            if (index === 0) {
                return;
            }
            this.stake = this.betLevels[index - 1];
            this.triggerTotalBetChange();
        }
    }

    setStakeSelectorShow(showStakeSelector: boolean) {
        this.stakeSelectorShow = showStakeSelector;
    }

    setStakeSelectorDisabled(disabled: boolean) {
        this.stakeSelectorDisabled = disabled;
    }

    setBetLevels(betLevels: number[]) {
        this.betLevels = betLevels;
    }

    setDefaultStake(defaultStake: number) {
        this.defaultStake = defaultStake;
    }

    resetDefaultStake() {
        this.stake = this.defaultStake;
    }

    setTotalFreeSpins(totalFreeSpins: number) {
        this.freeSpinCount = totalFreeSpins;
    }

    syncFreeSpinCount() {
        this.freeSpinCountDisplay = this.freeSpinCount;
    }

    decreaseFreeSpinCount() {
        this.freeSpinCountDisplay--;
    }

    setTurbo(turbo: boolean) {
        if (this.turboEnabled !== turbo) {
            const msg = turbo ? gc.Translator.gameTranslate("enable_turbo_mode") : gc.Translator.gameTranslate("disable_turbo_mode");
            this.noticeStore.addWarning(msg.toUpperCase());
        }

        this.turboEnabled = turbo;
    }

    acceptAutoSpinValue(autoSpinCount: number) {
        this.autoSpinCount = autoSpinCount;
        this.autoSpinSelectedValue = autoSpinCount;
        this.autoSpinEnabled = true;
    }

    decreaseAutoSpinCount() {
        if (this.autoSpinCount <= 0) {
            return false;
        }
        this.autoSpinCount--;
        return true;
    }

    cancelAutoSpin() {
        this.autoSpinEnabled = false;
    }

    clearFreeSpins() {
        this.freeSpinCount = -1;
        this.freeSpinCountDisplay = -1;
        this.freeSpinStake = -1;
    }
}
