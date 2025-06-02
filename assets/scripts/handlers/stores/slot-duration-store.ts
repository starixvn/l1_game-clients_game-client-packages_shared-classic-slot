import inversify from "inversify";
import mobx from "mobx";
const { injectable, inject } = inversify;

import gc from "@sg/game-client-base";
import { SlotGameBaseConfigs } from "../../config/slot-game-base-configs";
import { StandardSlotGameConfigs } from "../../config/standard-slot-game-configs";
import { BetControlStore } from "./bet-control-store";

@injectable()
export class SlotDurationStore {
    @inject(gc.Rounds.RoundTimeStore) protected readonly roundTimeStore: gc.Rounds.RoundTimeStore;
    @inject(gc.Rounds.RoundStore) protected readonly roundStore: gc.Rounds.RoundStore;

    @inject(gc.GameConfigs.GameConfigStore) protected readonly gameConfigStore: gc.GameConfigs.GameConfigStore;

    @inject(gc.Player.MainPlayerStore) protected readonly mainPlayerStore: gc.Player.MainPlayerStore;

    @inject(gc.GameUserSettings.GameUserSettingHandler)
    protected readonly gameUserSettingHandler: gc.GameUserSettings.GameUserSettingHandler;

    @inject(BetControlStore) protected readonly betControlStore: BetControlStore = null!;

    constructor() {
        mobx.makeAutoObservable(this);
    }

    config = new StandardSlotGameConfigs();

    setConfig(config: SlotGameBaseConfigs) {
        this.config = config;
    }

    get configDuration() {
        return this.betControlStore.turboEnabled ? this.config.turboMode : this.config.normalMode;
    }

    get spinDuration() {
        return this.configDuration.spinDuration;
    }

    get winningDuration() {
        return this.configDuration.winningDuration;
    }

    get noWinningDuration() {
        return this.configDuration.noWinningDuration;
    }

    get freespinDuration() {
        return this.configDuration.freespinDuration;
    }

    get bonusDuration() {
        return this.configDuration.bonusDuration;
    }

    get jackpotDuration() {
        return this.configDuration.jackpotDuration;
    }

    get bigWinDuration() {
        return this.configDuration.bigWinDuration;
    }

    get showBigWinValueDuration() {
        return this.configDuration.showBigWinValueDuration;
    }

    get delayShowBigWinValue() {
        return this.configDuration.delayShowBigWinValue;
    }

    get showTotalBonusAmountDuration() {
        return this.config.showTotalBonusAmountDuration;
    }

    get showJackpotWinningAmountDuration() {
        return this.config.showJackpotWinningAmountDuration;
    }

    get totalSpinDuration() {
        const reelCount = 5;
        const reelDelayTime = 0.075;
        const totalDelay = this.betControlStore.turboEnabled ? 0 : reelDelayTime * (reelCount - 1);
        return this.spinDuration * (reelCount - 1) + totalDelay;
    }
}
