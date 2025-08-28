import "reflect-metadata";
//rest
import gc from "@sg/game-client-base";
import { Container } from "inversify";
import { stub } from "jest-auto-stub";
import * as mobx from "mobx";
import { SlotSettingHandlers } from "../../assets/scripts/handlers/handlers/slot-setting-handlers";
import { BetControlStore } from "../../assets/scripts/handlers/stores/bet-control-store";

// Mock dependencies
jest.mock("mobx", () => ({
    ...jest.requireActual("mobx"),
    reaction: jest.fn(),
}));

jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        GameUserSettings: {
            ...actualGc.GameUserSettings,
            GameUserSettingStore: jest.fn().mockImplementation(() => ({
                tempStorage: null, // Mocked property
            })),
            GameUserSettingAction: {
                Save: "Save",
                Load: "Load",
            },
        },
        StorageManager: {
            get: jest.fn(),
            set: jest.fn(),
        },
        localStorageKeys: {
            gameUserSetting: "gameUserSetting_test_key",
        },
    };
});

jest.mock("../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(() => ({
        turboEnabled: false,
        stake: 0,
        setStake: jest.fn(),
    })),
}));

describe("SlotSettingHandlers", () => {
    let container: Container;
    let slotSettingHandlers: SlotSettingHandlers;
    let mockGameUserSettingStore: jest.Mocked<gc.GameUserSettings.GameUserSettingStore>;
    let mockBetControlStore: jest.Mocked<BetControlStore>;
    let mockStorageManagerGet: jest.SpyInstance;
    let mockStorageManagerSet: jest.SpyInstance;
    let mockMobxReaction: jest.SpyInstance;

    beforeEach(() => {
        jest.useFakeTimers();
        container = new Container();

        // Bindings
        const MockedGameUserSettingStore = jest.requireMock("@sg/game-client-base").GameUserSettings.GameUserSettingStore;
        mockGameUserSettingStore = new MockedGameUserSettingStore() as jest.Mocked<gc.GameUserSettings.GameUserSettingStore>;

        const MockedBetControlStore = jest.requireMock("../../assets/scripts/handlers/stores/bet-control-store").BetControlStore;
        mockBetControlStore = new MockedBetControlStore() as jest.Mocked<BetControlStore>;

        container.bind(gc.GameUserSettings.GameUserSettingStore).toConstantValue(mockGameUserSettingStore);
        container.bind(BetControlStore).toConstantValue(mockBetControlStore);
        container.bind(SlotSettingHandlers).toSelf();

        // Get instances
        slotSettingHandlers = container.get(SlotSettingHandlers);

        // Manually assign mocked dependencies to ensure they are set on the instance
        // This helps if Inversify's property injection timing interacts unexpectedly with setTimeout/fake timers.
        (slotSettingHandlers as any).betControlStore = mockBetControlStore;
        (slotSettingHandlers as any).gameUserSettingStore = mockGameUserSettingStore;
        (slotSettingHandlers as any).mainPlayerStore = stub<gc.Player.MainPlayerStore>({
            UID: 123,
            currencyGroup: "CASH_USD",
        });

        // Spy on StorageManager methods
        mockStorageManagerGet = jest.spyOn(gc.StorageManager, "get");
        mockStorageManagerSet = jest.spyOn(gc.StorageManager, "set");
        mockMobxReaction = jest.spyOn(mobx, "reaction");
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers(); // Clear timers
    });

    describe("constructor", () => {
        it("should call loadTempStorage and setup mobx.reaction after a timeout", () => {
            // Instance is created in beforeEach, advance timers to trigger setTimeout
            jest.advanceTimersByTime(0);

            // Check if loadTempStorage was called (it's called inside the constructor's setTimeout)
            // We will spy on loadTempStorage directly if possible, or check its effects
            expect(mockStorageManagerGet).toHaveBeenCalledWith(slotSettingHandlers.getStorageKey()); // Indirectly checks loadTempStorage

            // Check if mobx.reaction was called
            expect(mockMobxReaction).toHaveBeenCalledTimes(1);
            expect(mockMobxReaction).toHaveBeenCalledWith(
                expect.any(Function), // () => this.gameUserSettingStore.tempStorage
                expect.any(Function) // (trigger) => { this.reactionTempStorage(trigger); }
            );
        });
    });

    describe("reactionTempStorage", () => {
        let reactionTempStorageSpy: jest.SpyInstance;
        let saveTempStorageSpy: jest.SpyInstance;
        let loadTempStorageSpy: jest.SpyInstance;

        beforeEach(() => {
            // Need to spy on methods of the actual instance
            // @ts-ignore
            saveTempStorageSpy = jest.spyOn(slotSettingHandlers, "saveTempStorage");
            // @ts-ignore
            loadTempStorageSpy = jest.spyOn(slotSettingHandlers, "loadTempStorage");
        });

        it("should call saveTempStorage when action is Save", () => {
            slotSettingHandlers.reactionTempStorage({
                action: gc.GameUserSettings.GameUserSettingAction.Save,
            } as gc.GameUserSettings.GameUserSettingTrigger);
            expect(saveTempStorageSpy).toHaveBeenCalledTimes(1);
            expect(loadTempStorageSpy).not.toHaveBeenCalled();
        });

        it("should call loadTempStorage when action is Load", () => {
            slotSettingHandlers.reactionTempStorage({
                action: gc.GameUserSettings.GameUserSettingAction.Load,
            } as gc.GameUserSettings.GameUserSettingTrigger);
            expect(loadTempStorageSpy).toHaveBeenCalledTimes(1);
            expect(saveTempStorageSpy).not.toHaveBeenCalled();
        });

        it("should do nothing for other actions", () => {
            slotSettingHandlers.reactionTempStorage({ action: "OtherAction" } as any);
            expect(saveTempStorageSpy).not.toHaveBeenCalled();
            expect(loadTempStorageSpy).not.toHaveBeenCalled();
        });

        it("should do nothing if trigger is null", () => {
            slotSettingHandlers.reactionTempStorage(null as any);
            expect(saveTempStorageSpy).not.toHaveBeenCalled();
            expect(loadTempStorageSpy).not.toHaveBeenCalled();
        });

        it("should do nothing if trigger action is undefined", () => {
            slotSettingHandlers.reactionTempStorage({} as gc.GameUserSettings.GameUserSettingTrigger);
            expect(saveTempStorageSpy).not.toHaveBeenCalled();
            expect(loadTempStorageSpy).not.toHaveBeenCalled();
        });
    });

    describe("loadTempStorage", () => {
        it("should load settings from StorageManager and apply them to BetControlStore if data exists", () => {
            const mockSettings = { turbo: true, stake: 100 };
            mockStorageManagerGet.mockReturnValue(mockSettings);

            // @ts-ignore
            slotSettingHandlers.loadTempStorage();

            expect(mockStorageManagerGet).toHaveBeenCalledWith(slotSettingHandlers.getStorageKey());
            expect(mockBetControlStore.turboEnabled).toBe(true);
            expect(mockBetControlStore.setStake).toHaveBeenCalledWith(100);
        });

        it("should set default settings in BetControlStore if no data exists in StorageManager", () => {
            mockStorageManagerGet.mockReturnValue(null);

            // @ts-ignore
            slotSettingHandlers.loadTempStorage();

            expect(mockStorageManagerGet).toHaveBeenCalledWith(slotSettingHandlers.getStorageKey());
            expect(mockBetControlStore.turboEnabled).toBe(false);
            expect(mockBetControlStore.setStake).toHaveBeenCalledWith(0);
        });
    });

    describe("saveTempStorage", () => {
        it("should save current settings from BetControlStore to StorageManager", () => {
            mockBetControlStore.turboEnabled = true;
            mockBetControlStore.stake = 200;

            // @ts-ignore
            slotSettingHandlers.saveTempStorage();

            const expectedSettings = {
                turbo: true,
                stake: 200,
            };
            expect(mockStorageManagerSet).toHaveBeenCalledWith(slotSettingHandlers.getStorageKey(), expectedSettings);
        });
    });
});
