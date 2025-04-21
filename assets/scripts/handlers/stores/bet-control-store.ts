import inversify from "inversify";
import mobx from "mobx";
const { injectable, inject } = inversify;

import gc from "@sg/game-client-base";

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

    readonly linesCount = 25;

    get totalBet() {
        return this.stake * this.linesCount;
    }

    totalWin = 0;
    readonly betChoice = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    autoSpinCount = 0;
    isAutoSpin = false;
    freeSpinCount = 0;
    isFreeSpin = false;
    isTurbo = false;

    interactableBet = false;

    setStake(stake: number) {
        this.stake = stake;
    }

    setBetLevels(betLevels: number[]) {
        this.betLevels = betLevels;
    }

    onLoadStorage() {
        const data = gc.StorageManager.get(gc.localStorageKeys.gameUserSetting);
        if (data) {
        }
    }
}
