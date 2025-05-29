import "reflect-metadata";
//rest
import gc from "@sg/game-client-base";
import { Container } from "inversify";
import { SlotSettingHandlers } from "../../assets/scripts/handlers/handlers/slot-setting-handlers";
import { BetControlStore } from "../../assets/scripts/handlers/stores/bet-control-store";

const { GameUserSettingAction } = gc.GameUserSettings;
const { localStorageKeys } = gc;

// Mock BetControlStore
jest.mock("../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(() => ({
        turboEnabled: false,
        stake: 0,
        setStake: jest.fn(),
    })),
}));

// Mock GameUserSettingStore and StorageManager from @sg/game-client-base
jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    // Ensure no 'actualMobx' or 'mobx.observable' is used here.
    // Reactivity is handled in beforeEach.
    return {
        // ...actualGc,
        GameUserSettings: {
            ...actualGc.GameUserSettings,
            GameUserSettingStore: jest.fn().mockImplementation(() => {
                // Return a PLAIN object. MobX is applied in beforeEach.
                return {
                    tempStorage: null as { action: string; [key: string]: any } | null,
                    // any other properties GameUserSettingStore might have that are accessed
                };
            }),
            GameUserSettingAction: actualGc.GameUserSettings.GameUserSettingAction,
        },
        StorageManager: {
            get: jest.fn(),
            set: jest.fn(),
        },
        localStorageKeys: actualGc.localStorageKeys,
    };
});

describe("SlotSettingHandlers", () => {
    let container: Container;
    let settingHandlers: SlotSettingHandlers;
    let betControlStore: jest.Mocked<BetControlStore>;
    let gameUserSettingStore: jest.Mocked<gc.GameUserSettings.GameUserSettingStore>;
    // mockStorageManager can be used if direct interaction with StorageManager static methods is needed for assertions
    // let mockStorageManager: jest.Mocked<typeof gc.StorageManager>;

    beforeEach(() => {
        container = new Container();

        // Bind dependencies
        container.bind(SlotSettingHandlers).toSelf();
        container
            .bind(BetControlStore)
            .toConstantValue(new (jest.requireMock("../../assets/scripts/handlers/stores/bet-control-store").BetControlStore)());

        const MockedGameUserSettingStore = jest.requireMock("@sg/game-client-base").GameUserSettings.GameUserSettingStore;
        const gameUserSettingStoreInstance = new MockedGameUserSettingStore();

        // REMOVED: Attempt to make tempStorage observable as MobX functions are not available
        // const localMobx = jest.requireActual("mobx");
        // localMobx.extendObservable(gameUserSettingStoreInstance, {
        //     tempStorage: null,
        // });
        // Ensure tempStorage still exists on the mock if needed by the component, even if not observable
        if (gameUserSettingStoreInstance.tempStorage === undefined) {
            gameUserSettingStoreInstance.tempStorage = null;
        }

        container.bind(gc.GameUserSettings.GameUserSettingStore).toConstantValue(gameUserSettingStoreInstance);

        // Get instances
        settingHandlers = container.get(SlotSettingHandlers);
        betControlStore = container.get(BetControlStore) as jest.Mocked<BetControlStore>;
        gameUserSettingStore = container.get(
            gc.GameUserSettings.GameUserSettingStore
        ) as jest.Mocked<gc.GameUserSettings.GameUserSettingStore>;

        Object.assign(settingHandlers, {
            betControlStore,
            gameUserSettingStore,
        });

        jest.useFakeTimers();
        // Reset mocks for StorageManager if they are called in beforeEach or multiple tests
        (gc.StorageManager.get as jest.Mock).mockClear().mockImplementation(() => null); // Default to no data
        (gc.StorageManager.set as jest.Mock).mockClear();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks(); // This will also clear StorageManager mocks
    });

    describe("initialization", () => {
        it("should call loadTempStorage on initialization by advancing timers", () => {
            // Spy on the method of the actual instance being tested
            const loadTempStorageSpy = jest.spyOn(settingHandlers, "loadTempStorage");
            // CascadingSlotSettingHandlers constructor sets up a reaction that calls loadTempStorage.
            // We need to re-instantiate or ensure the reaction is triggered for this test if it was already done in beforeEach.
            // For simplicity, let's assume the reaction is triggered by gameUserSettingStore changing, or by advancing timers after setup.

            // Simulate the condition that triggers loadTempStorage if it's via reaction
            // Or, if it's a direct call in constructor or an init method called after timeout:
            jest.advanceTimersByTime(0); // Trigger setTimeout(..., 0)

            expect(loadTempStorageSpy).toHaveBeenCalled();
        });
    });

    describe("loadTempStorage", () => {
        it("should load settings from storage when data exists", () => {
            const mockData = {
                turbo: true,
                stake: 100,
            };
            (gc.StorageManager.get as jest.Mock).mockReturnValue(mockData);
            // betControlStore.setStake is already a jest.fn() from the mock

            settingHandlers.loadTempStorage();

            expect(gc.StorageManager.get).toHaveBeenCalledWith(gc.localStorageKeys.gameUserSetting);
            expect(betControlStore.turboEnabled).toBe(true);
            expect(betControlStore.setStake).toHaveBeenCalledWith(100);
        });

        it("should set default values when no data exists in storage", () => {
            (gc.StorageManager.get as jest.Mock).mockReturnValue(null); // Ensure it returns null for this test

            settingHandlers.loadTempStorage();

            // Assuming default turbo is false and default stake is 0 as per BetControlStore mock
            expect(betControlStore.turboEnabled).toBe(false);
            expect(betControlStore.setStake).toHaveBeenCalledWith(0);
        });
    });

    describe("saveTempStorage", () => {
        it("should save current settings to storage", () => {
            betControlStore.turboEnabled = true;
            betControlStore.stake = 200;

            settingHandlers.saveTempStorage();

            expect(gc.StorageManager.set).toHaveBeenCalledWith(gc.localStorageKeys.gameUserSetting, {
                turbo: true,
                stake: 200,
            });
        });
    });

    // ADDED: Test suite for tempStorage reaction
    describe("reaction to gameUserSettingStore tempStorage changes", () => {
        it("should call saveTempStorage when tempStorage action is Save", () => {
            const saveTempStorageSpy = jest.spyOn(settingHandlers, "saveTempStorage");

            // MODIFIED: Removed mobx.runInAction as mobx is not available
            gameUserSettingStore.tempStorage = { action: GameUserSettingAction.Save };
            // Advance timers if the reaction is debounced or uses setTimeout
            // jest.advanceTimersByTime(0); // Uncomment if SlotSettingHandlers uses timers for reaction

            expect(saveTempStorageSpy).toHaveBeenCalled();
        });

        it("should call loadTempStorage when tempStorage action is Load", () => {
            const loadTempStorageSpy = jest.spyOn(settingHandlers, "loadTempStorage");

            // MODIFIED: Removed mobx.runInAction
            gameUserSettingStore.tempStorage = { action: GameUserSettingAction.Load };
            // jest.advanceTimersByTime(0); // Uncomment if needed

            expect(loadTempStorageSpy).toHaveBeenCalled();
        });

        it("should not trigger save or load for an unknown tempStorage action", () => {
            const saveTempStorageSpy = jest.spyOn(settingHandlers, "saveTempStorage");
            const loadTempStorageSpy = jest.spyOn(settingHandlers, "loadTempStorage");

            // MODIFIED: Removed mobx.runInAction
            gameUserSettingStore.tempStorage = { action: "SOME_UNKNOWN_ACTION" as any };
            // jest.advanceTimersByTime(0); // Uncomment if needed

            expect(saveTempStorageSpy).not.toHaveBeenCalled();
            expect(loadTempStorageSpy).not.toHaveBeenCalled();
        });

        it("should not trigger save or load if tempStorage is set to null", () => {
            const saveTempStorageSpy = jest.spyOn(settingHandlers, "saveTempStorage");
            const loadTempStorageSpy = jest.spyOn(settingHandlers, "loadTempStorage");

            // MODIFIED: Removed mobx.runInAction for initial setup
            gameUserSettingStore.tempStorage = { action: GameUserSettingAction.Save };
            saveTempStorageSpy.mockClear(); // Clear calls from initial setup
            loadTempStorageSpy.mockClear();

            // MODIFIED: Removed mobx.runInAction
            gameUserSettingStore.tempStorage = null;
            // jest.advanceTimersByTime(0); // Uncomment if needed

            expect(saveTempStorageSpy).not.toHaveBeenCalled();
            expect(loadTempStorageSpy).not.toHaveBeenCalled();
        });
    });
});
