import inversify from "inversify";
import mobx from "mobx";
const { injectable, inject } = inversify;

import gc from "@sg/game-client-base";

export interface TopWinner {
    freeSpin: boolean;
    name: string;
    totalAmount: number;
    baseTotalAmount: number;
    winningAmount: number;
    baseWinningAmount: number;
    time: string;
    exchangeRateId: number;
    rate: number;
    exchangeRateCode: {
        [key: string]: number;
    };
}

export interface JackpotWinner {
    time: string;
    name: string;
    pool: string;
    winningAmount: number;
    exchangeRateId: number;
    exchangeRateCode: {
        [key: string]: number;
    };
}

export interface Winner {
    name: string;
    time: string;
    winningAmount: number;
    exchangeRateId: number;
    exchangeRateCode: {
        [key: string]: number;
    };

    freeSpin?: boolean;
    totalAmount?: number;
    baseTotalAmount?: number;
    baseWinningAmount?: number;
    rate?: number;
    pool?: string;
}

export interface WinnersData {
    page: number;
    pageSize: number;
    total: number;
    winners: Winner[];
}

@injectable()
export class TopWinnersStore {
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

    data: WinnersData = null;
}
