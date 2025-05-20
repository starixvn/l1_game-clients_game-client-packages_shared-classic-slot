import inversify from "inversify";
import mobx from "mobx";
const { injectable, inject } = inversify;

import gc from "@sg/game-client-base";

export interface JackpotPool {
    pool: string;
    amount: number;
}

@injectable()
export class JackpotPoolStore {
    @inject(gc.GameConfigs.GameConfigStore) protected readonly gameConfigStore: gc.GameConfigs.GameConfigStore;

    constructor() {
        mobx.makeAutoObservable(this);
    }

    jackpotPools: Record<string, JackpotPool> = {};
}
