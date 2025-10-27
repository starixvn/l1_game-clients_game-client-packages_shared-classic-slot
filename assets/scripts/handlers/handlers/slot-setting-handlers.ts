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
    @inject(gc.Player.MainPlayerStore) protected readonly mainPlayerStore: gc.Player.MainPlayerStore;
    @inject(gc.App.AppStore) protected readonly appStore: gc.App.AppStore;
    @inject(gc.GameConfiguration.GameConfigurationHandler) gameConfigurationHandler: gc.GameConfiguration.GameConfigurationHandler;

    constructor() {
        setTimeout(() => {
            mobx.when(() => this.mainPlayerStore.UID !== 0 && this.mainPlayerStore.currencyGroup !== "", () => {
                mobx.reaction(
                    () => this.gameUserSettingStore.tempStorage,
                    (trigger) => {
                        this.reactionTempStorage(trigger);
                    }
                );
                if (this.appStore.isClearStorage) {
                    StorageManager.remove(this.getStorageKey());
                };
                this.loadTempStorage();
                mobx.reaction(() => this.appStore.isClearStorage, () => {
                    StorageManager.remove(this.getStorageKey());
                    this.loadTempStorage();
                });
            });

            this.gameConfigurationHandler.handle();
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

    getStorageKey() {
        return `${localStorageKeys.gameUserSetting}-${this.mainPlayerStore.UID}-${this.mainPlayerStore.currencyGroup}`;
    }

    loadTempStorage() {
        const data = StorageManager.get(this.getStorageKey()) as IGameUserSetting;
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
        StorageManager.set(this.getStorageKey(), currentSetting);
    }
}
