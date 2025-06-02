import "reflect-metadata";
//rest
import { Container } from "inversify";
import * as mobx from "mobx";

import gc from "@sg/game-client-base";
import { StandardSlotGameConfigs } from "../../../assets/scripts/config/standard-slot-game-configs";
import { BetControlStore } from "../../../assets/scripts/handlers/stores/bet-control-store";
import { SlotDurationStore } from "../../../assets/scripts/handlers/stores/slot-duration-store";

// Mock dependencies
jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        Rounds: {
            ...actualGc.Rounds,
            RoundTimeStore: jest.fn().mockImplementation(() => ({})),
            RoundStore: jest.fn().mockImplementation(() => ({})),
        },
        GameConfigs: {
            ...actualGc.GameConfigs,
            GameConfigStore: jest.fn().mockImplementation(() => ({})),
        },
        Player: {
            ...actualGc.Player,
            MainPlayerStore: jest.fn().mockImplementation(() => ({})),
        },
        GameUserSettings: {
            ...actualGc.GameUserSettings,
            GameUserSettingHandler: jest.fn().mockImplementation(() => ({})),
        },
    };
});

jest.mock("../../../assets/scripts/handlers/stores/bet-control-store", () => {
    return {
        BetControlStore: jest.fn().mockImplementation(() => {
            // Make the mock store itself (or at least its relevant properties) observable
            return mobx.observable({
                turboEnabled: false, // Default mock value
            });
        }),
    };
});

describe("SlotDurationStore", () => {
    let container: Container;
    let slotDurationStore: SlotDurationStore;
    let mockBetControlStore: jest.Mocked<BetControlStore>;
    // Mocks for other gc dependencies can be added here if needed for specific tests

    beforeEach(() => {
        container = new Container();

        // Create mock instances for gc components
        const MockedRoundTimeStore = jest.requireMock("@sg/game-client-base").Rounds.RoundTimeStore;
        const mockRoundTimeStoreInstance = new MockedRoundTimeStore();
        container.bind(gc.Rounds.RoundTimeStore).toConstantValue(mockRoundTimeStoreInstance);

        const MockedRoundStore = jest.requireMock("@sg/game-client-base").Rounds.RoundStore;
        const mockRoundStoreInstance = new MockedRoundStore();
        container.bind(gc.Rounds.RoundStore).toConstantValue(mockRoundStoreInstance);

        const MockedGameConfigStore = jest.requireMock("@sg/game-client-base").GameConfigs.GameConfigStore;
        const mockGameConfigStoreInstance = new MockedGameConfigStore();
        container.bind(gc.GameConfigs.GameConfigStore).toConstantValue(mockGameConfigStoreInstance);

        const MockedMainPlayerStore = jest.requireMock("@sg/game-client-base").Player.MainPlayerStore;
        const mockMainPlayerStoreInstance = new MockedMainPlayerStore();
        container.bind(gc.Player.MainPlayerStore).toConstantValue(mockMainPlayerStoreInstance);

        const MockedGameUserSettingHandler = jest.requireMock("@sg/game-client-base").GameUserSettings.GameUserSettingHandler;
        const mockGameUserSettingHandlerInstance = new MockedGameUserSettingHandler();
        container.bind(gc.GameUserSettings.GameUserSettingHandler).toConstantValue(mockGameUserSettingHandlerInstance);

        // Create mock instance for BetControlStore
        const MockedBetControlStore = jest.requireMock("../../../assets/scripts/handlers/stores/bet-control-store").BetControlStore;
        const mockBetControlStoreInstance = new MockedBetControlStore();
        container.bind(BetControlStore).toConstantValue(mockBetControlStoreInstance);

        // Bind SlotDurationStore to self
        container.bind(SlotDurationStore).toSelf();

        // Get instances from container
        slotDurationStore = container.get(SlotDurationStore);
        mockBetControlStore = container.get(BetControlStore) as jest.Mocked<BetControlStore>;

        Object.assign(slotDurationStore, {
            betControlStore: mockBetControlStore,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(slotDurationStore).toBeDefined();
    });

    describe("config and configDuration", () => {
        it("should set and get config", () => {
            const mockConfig = new StandardSlotGameConfigs();
            mockConfig.normalMode.spinDuration = 100;
            slotDurationStore.setConfig(mockConfig);
            expect(slotDurationStore.config).toBe(mockConfig);
        });

        it("should return normalMode config when turbo is disabled", () => {
            const mockConfig = new StandardSlotGameConfigs();
            mockConfig.normalMode.spinDuration = 100;
            mockConfig.turboMode.spinDuration = 50;
            slotDurationStore.setConfig(mockConfig);
            mockBetControlStore.turboEnabled = false;
            expect(slotDurationStore.configDuration).toBe(mockConfig.normalMode);
        });

        it("should return turboMode config when turbo is enabled", () => {
            const mockConfig = new StandardSlotGameConfigs();
            mockConfig.normalMode.spinDuration = 100;
            mockConfig.turboMode.spinDuration = 50;
            slotDurationStore.setConfig(mockConfig);
            mockBetControlStore.turboEnabled = true;
            expect(slotDurationStore.configDuration).toBe(mockConfig.turboMode);
        });
    });

    describe("duration getters", () => {
        let mockConfig: StandardSlotGameConfigs;

        beforeEach(() => {
            mockConfig = new StandardSlotGameConfigs();
            // Assign distinct values for testing
            mockConfig.normalMode = {
                spinDuration: 100,
                winningDuration: 200,
                noWinningDuration: 50,
                freespinDuration: 300,
                bonusDuration: 400,
                jackpotDuration: 500,
                bigWinDuration: 600,
                showBigWinValueDuration: 150,
                delayShowBigWinValue: 20,
            };
            mockConfig.turboMode = {
                spinDuration: 10,
                winningDuration: 20,
                noWinningDuration: 5,
                freespinDuration: 30,
                bonusDuration: 40,
                jackpotDuration: 50,
                bigWinDuration: 60,
                showBigWinValueDuration: 15,
                delayShowBigWinValue: 2,
            };
            mockConfig.showTotalBonusAmountDuration = 1000;
            mockConfig.showJackpotWinningAmountDuration = 2000;
            slotDurationStore.setConfig(mockConfig);
        });

        const testCases = [
            { getter: "spinDuration", normal: 100, turbo: 10 },
            { getter: "winningDuration", normal: 200, turbo: 20 },
            { getter: "noWinningDuration", normal: 50, turbo: 5 },
            { getter: "freespinDuration", normal: 300, turbo: 30 },
            { getter: "bonusDuration", normal: 400, turbo: 40 },
            { getter: "jackpotDuration", normal: 500, turbo: 50 },
            { getter: "bigWinDuration", normal: 600, turbo: 60 },
            {
                getter: "showBigWinValueDuration",
                normal: 150,
                turbo: 15,
            },
            { getter: "delayShowBigWinValue", normal: 20, turbo: 2 },
        ];

        testCases.forEach(({ getter, normal, turbo }) => {
            it(`should return correct ${getter} in normal mode`, () => {
                mockBetControlStore.turboEnabled = false;
                expect(slotDurationStore[getter]).toBe(normal);
            });

            it(`should return correct ${getter} in turbo mode`, () => {
                mockBetControlStore.turboEnabled = true;
                expect(slotDurationStore[getter]).toBe(turbo);
            });
        });

        it("should return correct showTotalBonusAmountDuration", () => {
            // This one is not affected by turbo mode as per current implementation
            mockBetControlStore.turboEnabled = false;
            expect(slotDurationStore.showTotalBonusAmountDuration).toBe(1000);
            mockBetControlStore.turboEnabled = true;
            expect(slotDurationStore.showTotalBonusAmountDuration).toBe(1000);
        });

        it("should return correct showJackpotWinningAmountDuration", () => {
            // This one is not affected by turbo mode as per current implementation
            mockBetControlStore.turboEnabled = false;
            expect(slotDurationStore.showJackpotWinningAmountDuration).toBe(2000);
            mockBetControlStore.turboEnabled = true;
            expect(slotDurationStore.showJackpotWinningAmountDuration).toBe(2000);
        });
    });

    describe("totalSpinDuration", () => {
        let mockConfig: StandardSlotGameConfigs;
        const reelCount = 5;
        const reelDelayTime = 0.075;

        beforeEach(() => {
            mockConfig = new StandardSlotGameConfigs();
            mockConfig.normalMode = { spinDuration: 100 } as any; // Only spinDuration matters here
            mockConfig.turboMode = { spinDuration: 10 } as any; // Cast to any to simplify mock
            slotDurationStore.setConfig(mockConfig);
        });

        it("should calculate totalSpinDuration correctly in normal mode", () => {
            mockBetControlStore.turboEnabled = false;
            const expectedDuration = mockConfig.normalMode.spinDuration * (reelCount - 1) + reelDelayTime * (reelCount - 1);
            //Need to use mobx.runInAction for this test to pass because totalSpinDuration is a computed property
            mobx.runInAction(() => {
                expect(slotDurationStore.totalSpinDuration).toBeCloseTo(expectedDuration);
            });
        });

        it("should calculate totalSpinDuration correctly in turbo mode", () => {
            mockBetControlStore.turboEnabled = true;
            const expectedDuration = mockConfig.turboMode.spinDuration * (reelCount - 1);
            //Need to use mobx.runInAction for this test to pass because totalSpinDuration is a computed property
            mobx.runInAction(() => {
                expect(slotDurationStore.totalSpinDuration).toBeCloseTo(expectedDuration);
            });
        });
    });

    // More tests will be added here
});
