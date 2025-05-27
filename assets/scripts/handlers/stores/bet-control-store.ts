import inversify from "inversify";
import mobx from "mobx";
const { injectable, inject } = inversify;

import gc from "@sg/game-client-base";
import { SLOT_LINES } from "../../definitions";

@injectable()
export class BetControlStore {
    @inject(gc.Rounds.RoundTimeStore) protected readonly roundTimeStore: gc.Rounds.RoundTimeStore;
    @inject(gc.Rounds.RoundStore) protected readonly roundStore: gc.Rounds.RoundStore;

    @inject(gc.GameConfigs.GameConfigStore) protected readonly gameConfigStore: gc.GameConfigs.GameConfigStore;

    @inject(gc.Player.MainPlayerStore) protected readonly mainPlayerStore: gc.Player.MainPlayerStore;

    @inject(gc.GameUserSettings.GameUserSettingHandler)
    protected readonly gameUserSettingHandler: gc.GameUserSettings.GameUserSettingHandler;

    constructor() {
        mobx.makeAutoObservable(this);
        setTimeout(() => {
            this.onLoadStorage();
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

    roundId = -1;

    get totalBet() {
        return this.stake * SLOT_LINES;
    }

    interactableBet = false;

    stakeSelectorShow = false;
    stakeSelectorDisabled = false;

    showLineSelection = null;

    triggerAutoSpin = true;
    autoSpinCount = 0;
    autoSpinEnabled = false;
    autoSpinDialogOpenEvent = null;
    autoSpinSelectedValue = 10;
    readonly autoSpinOptions = [10, 30, 50, 80, 100, 200, 500, 1000];

    freeSpinCount = 0;
    get freeSpinEnabled() {
        return this.freeSpinCount > 0;
    }

    turboEnabled = false;

    get stakeIndex() {
        return this.betLevels.indexOf(this.stake);
    }

    get disableIncreaseStake() {
        return this.stakeIndex === this.betLevels.length - 1 || this.stakeIndex === -1;
    }

    get disableDecreaseStake() {
        return this.stakeIndex === 0 || this.stakeIndex === -1;
    }

    setStake(stake: number) {
        this.stake = stake;
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
        } else {
            if (index === 0) {
                return;
            }
            this.stake = this.betLevels[index - 1];
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

    setTotalFreeSpins(totalFreeSpins: number) {
        this.freeSpinCount = totalFreeSpins;
    }

    setTurbo(turbo: boolean) {
        this.turboEnabled = turbo;
    }

    acceptAutoSpinValue(autoSpinCount: number) {
        this.autoSpinCount = autoSpinCount;
        this.autoSpinSelectedValue = autoSpinCount;
        this.autoSpinEnabled = true;
    }

    decreaseAutoSpinCount() {
        if (this.autoSpinCount === 0) {
            return false;
        }
        this.autoSpinCount--;
        return true;
    }

    cancelAutoSpin() {
        this.autoSpinEnabled = false;
    }

    onLoadStorage() {
        const data = gc.StorageManager.get(gc.localStorageKeys.gameUserSetting);
        if (data) {
        }
    }

    clearFreeSpins() {
        this.freeSpinCount = 0;
    }
}
