import inversify from "inversify";

import gc from "@sg/game-client-base";
import mobx from "mobx";
import { BetControlStore } from "../stores/bet-control-store";
const { injectable, inject } = inversify;

const { GameUserSettingAction } = gc.GameUserSettings;
const { StorageManager, localStorageKeys } = gc;

interface IGameUserSetting {
    turbo: boolean;
    stake: number;
}

@injectable()
export class SlotSettingHandlers {
    @inject(gc.GameUserSettings.GameUserSettingStore) protected readonly gameUserSettingStore: gc.GameUserSettings.GameUserSettingStore;
    @inject(BetControlStore) protected readonly betControlStore: BetControlStore;
    constructor() {
        setTimeout(() => {
            this.loadTempStorage();
            mobx.reaction(
                () => this.gameUserSettingStore.tempStorage,
                (trigger) => {
                    this.reactionTempStorage(trigger);
                }
            );
        }, 0);
    }

    reactionTempStorage(trigger: gc.GameUserSettings.GameUserSettingTrigger) {
        switch (trigger?.action) {
            case GameUserSettingAction.Save:
                this.saveTempStorage();
                break;
            case GameUserSettingAction.Load:
                this.loadTempStorage();
                break;
        }
    }

    loadTempStorage() {
        const data = StorageManager.get(localStorageKeys.gameUserSetting) as IGameUserSetting;
        if (data) {
            this.betControlStore.turboEnabled = data.turbo;
            this.betControlStore.setStake(data.stake);
        } else {
            this.betControlStore.turboEnabled = false;
            this.betControlStore.setStake(0);
        }
    }

    saveTempStorage() {
        const currentSetting = {
            turbo: this.betControlStore.turboEnabled,
            stake: this.betControlStore.stake,
        };
        StorageManager.set(localStorageKeys.gameUserSetting, currentSetting);
    }
}
