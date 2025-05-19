import inversify from "inversify";
import mobx from "mobx";
const { injectable, inject } = inversify;

import gc from "@sg/game-client-base";
import { SlotNotification, SlotState } from "../../definitions";

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
        setTimeout(() => {}, 0);
    }

    spinResult: { result: number[]; duration: number; turbo: boolean } = { result: [], duration: 0, turbo: false };

    receivedBonus = null;
    receivedJackpot = null;
    receivedFreeSpins = null;
    receivedBigWin = null;
    winningJackpot = null;
    bonusChest = null;
    winningItems = [];
    winningLines = [];
    highlightSpecialSymbols = [];

    slotState = SlotState.NOT_READY;
    forceStopSettle = null;

    winningBet = 0;

    get isReadyBet() {
        return this.slotState === SlotState.READY || this.slotState === SlotState.SETTLED;
    }

    bottomMessageState = SlotNotification.READY;

    reset() {
        this.receivedBonus = null;
        this.receivedJackpot = null;
        this.receivedFreeSpins = null;
        this.receivedBigWin = null;
        this.winningItems = [];
        this.winningLines = [];
        this.highlightSpecialSymbols = [];
        this.winningJackpot = null;
        this.bonusChest = null;
        this.slotState = SlotState.READY;
    }
}
