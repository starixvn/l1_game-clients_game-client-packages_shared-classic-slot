import inversify from "inversify";
import mobx from "mobx";
const { injectable, inject } = inversify;

import gc from "@sg/game-client-base";
import { LineData, SlotNotification, SlotState } from "../../definitions";

@injectable()
export class SlotBoardStore {
    @inject(gc.Rounds.RoundTimeStore) protected readonly roundTimeStore: gc.Rounds.RoundTimeStore;
    @inject(gc.Rounds.RoundStore) protected readonly roundStore: gc.Rounds.RoundStore;

    @inject(gc.GameConfigs.GameConfigStore) protected readonly gameConfigStore: gc.GameConfigs.GameConfigStore;

    @inject(gc.Player.MainPlayerStore) protected readonly mainPlayerStore: gc.Player.MainPlayerStore;

    @inject(gc.GameUserSettings.GameUserSettingHandler)
    protected readonly gameUserSettingHandler: gc.GameUserSettings.GameUserSettingHandler;

    constructor() {
        mobx.makeAutoObservable(this);
    }

    spinResult: { result: number[]; duration: number; turbo: boolean; onComplete: () => void } = {
        result: [],
        duration: 0,
        turbo: false,
        onComplete: () => {},
    };

    receivedBonus = null;
    receivedJackpot = null;
    receivedFreeSpins = null;
    receivedBigWin = null;
    winningJackpot = null;
    bonusChest = null;
    winningItemsOnLines = [];
    winningLines: LineData[] = [];
    highlightSpecialSymbols = [];

    slotState = SlotState.NOT_READY;
    forceStopSettle = null;

    winningBet = 0;
    spinTime = 0;

    bottomMessageState = SlotNotification.READY;

    clearSettlement() {
        this.receivedBonus = null;
        this.receivedJackpot = null;
        this.receivedFreeSpins = null;
        this.receivedBigWin = null;

        this.highlightSpecialSymbols = [];
        this.winningJackpot = null;
        this.bonusChest = null;
    }

    resetToReady() {
        this.slotState = SlotState.READY;
    }

    resetOnNewSpin() {
        this.forceStopSettle = {};

        this.clearSettlement();

        this.winningItemsOnLines = [];
        this.winningLines = [];
        this.winningBet = 0;

        this.slotState = SlotState.BET;
        this.bottomMessageState = SlotNotification.SPINNING;
    }

    updateSpinTime(time: number) {
        this.spinTime = time;
    }
}
