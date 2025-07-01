import { Container } from "inversify";
import "reflect-metadata";
import { SlotGameBaseConfigs } from "../../../assets/scripts/config/slot-game-base-configs";
import { StandardSlotGameConfigs } from "../../../assets/scripts/config/standard-slot-game-configs";
import { BetControlStore } from "../../../assets/scripts/handlers/stores/bet-control-store";
import { SlotDurationStore } from "../../../assets/scripts/handlers/stores/slot-duration-store";

// Mock game client base
jest.mock("@sg/game-client-base", () => ({
    Rounds: {
        RoundTimeStore: class MockRoundTimeStore {},
        RoundStore: class MockRoundStore {},
    },
    GameConfigs: {
        GameConfigStore: class MockGameConfigStore {},
    },
    Player: {
        MainPlayerStore: class MockMainPlayerStore {},
    },
    GameUserSettings: {
        GameUserSettingHandler: class MockGameUserSettingHandler {},
    },
}));

// Mock BetControlStore
jest.mock("../../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: class MockBetControlStore {
        turboEnabled = false;
        triggerAutoSpin = false;
        get turboEnabledOnSpin() {
            return this.turboEnabled || this.triggerAutoSpin;
        }
    },
}));

// Mock configs
jest.mock("../../../assets/scripts/config/standard-slot-game-configs", () => ({
    StandardSlotGameConfigs: class MockStandardSlotGameConfigs {
        showTotalBonusAmountDuration = 4;
        showJackpotWinningAmountDuration = 4;
        normalMode = {
            spinDuration: 1,
            winningDuration: 2,
            noWinningDuration: 0.75,
            freespinDuration: 2,
            bonusDuration: 2,
            jackpotDuration: 2,
            transitionDuration: 0.5,
            bigWinDuration: 4,
            showBigWinValueDuration: 1,
            delayShowBigWinValue: 1.5,
        };
        turboMode = {
            spinDuration: 0.3,
            winningDuration: 1,
            noWinningDuration: 0.5,
            freespinDuration: 1.5,
            bonusDuration: 1.5,
            jackpotDuration: 1.5,
            transitionDuration: 0.5,
            bigWinDuration: 3.2,
            showBigWinValueDuration: 0.8,
            delayShowBigWinValue: 1.2,
        };
    },
}));

describe("SlotDurationStore", () => {
    let container: Container;
    let slotDurationStore: SlotDurationStore;
    let betControlStoreMock: jest.Mocked<BetControlStore>;

    beforeEach(() => {
        container = new Container();

        // Create mock instances
        const mockRoundTimeStore = new (jest.requireMock("@sg/game-client-base").Rounds.RoundTimeStore)();
        const mockRoundStore = new (jest.requireMock("@sg/game-client-base").Rounds.RoundStore)();
        const mockGameConfigStore = new (jest.requireMock("@sg/game-client-base").GameConfigs.GameConfigStore)();
        const mockMainPlayerStore = new (jest.requireMock("@sg/game-client-base").Player.MainPlayerStore)();
        const mockGameUserSettingHandler = new (jest.requireMock("@sg/game-client-base").GameUserSettings.GameUserSettingHandler)();

        const MockedBetControlStore = jest.requireMock("../../../assets/scripts/handlers/stores/bet-control-store").BetControlStore;
        betControlStoreMock = new MockedBetControlStore();

        // Bind dependencies
        container.bind(SlotDurationStore).toSelf();
        container.bind(jest.requireMock("@sg/game-client-base").Rounds.RoundTimeStore).toConstantValue(mockRoundTimeStore);
        container.bind(jest.requireMock("@sg/game-client-base").Rounds.RoundStore).toConstantValue(mockRoundTimeStore);
        container.bind(jest.requireMock("@sg/game-client-base").GameConfigs.GameConfigStore).toConstantValue(mockGameConfigStore);
        container.bind(jest.requireMock("@sg/game-client-base").Player.MainPlayerStore).toConstantValue(mockMainPlayerStore);
        container
            .bind(jest.requireMock("@sg/game-client-base").GameUserSettings.GameUserSettingHandler)
            .toConstantValue(mockGameUserSettingHandler);
        container.bind(BetControlStore).toConstantValue(betControlStoreMock);

        // Get instance
        slotDurationStore = container.get(SlotDurationStore);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("constructor", () => {
        it("should initialize with StandardSlotGameConfigs", () => {
            expect(slotDurationStore.config).toBeInstanceOf(StandardSlotGameConfigs);
        });
    });

    describe("setConfig", () => {
        it("should set the config property", () => {
            const mockConfig: SlotGameBaseConfigs = {
                itemTypeCount: 5,
                jackpotSymbolIndex: 3,
                showTotalBonusAmountDuration: 3,
                bonusTimeOut: 60,
                showJackpotWinningAmountDuration: 3,
                jackpotTimeOut: 30,
                normalMode: {
                    spinDuration: 0.5,
                    winningDuration: 1,
                    noWinningDuration: 0.25,
                    bigWinDuration: 2,
                    freespinDuration: 1,
                    jackpotDuration: 1,
                    bonusDuration: 1,
                    showBigWinValueDuration: 0.5,
                    delayShowBigWinValue: 0.75,
                    transitionDuration: 0.25,
                },
                turboMode: {
                    spinDuration: 0.2,
                    winningDuration: 0.5,
                    noWinningDuration: 0.2,
                    bigWinDuration: 1.5,
                    freespinDuration: 0.75,
                    jackpotDuration: 0.75,
                    bonusDuration: 0.75,
                    showBigWinValueDuration: 0.4,
                    delayShowBigWinValue: 0.6,
                    transitionDuration: 0.25,
                },
            };

            slotDurationStore.setConfig(mockConfig);

            expect(slotDurationStore.config).toStrictEqual(mockConfig);
        });
    });

    describe("configDuration getter", () => {
        it("should return normalMode when turbo is disabled", () => {
            betControlStoreMock.turboEnabled = false;
            betControlStoreMock.triggerAutoSpin = false;

            const result = slotDurationStore.configDuration;

            expect(result).toBe(slotDurationStore.config.normalMode);
        });

        it("should return turboMode when turbo is enabled", () => {
            betControlStoreMock.turboEnabled = true;
            betControlStoreMock.triggerAutoSpin = false;

            const result = slotDurationStore.configDuration;

            expect(result).toBe(slotDurationStore.config.turboMode);
        });

        it("should return turboMode when auto spin is triggered", () => {
            betControlStoreMock.turboEnabled = false;
            betControlStoreMock.triggerAutoSpin = true;

            const result = slotDurationStore.configDuration;

            expect(result).toBe(slotDurationStore.config.turboMode);
        });
    });

    describe("duration getters", () => {
        beforeEach(() => {
            betControlStoreMock.turboEnabled = false; // Use normal mode by default
            betControlStoreMock.triggerAutoSpin = false;
        });

        describe("spinDuration", () => {
            it("should return normal mode spin duration when turbo is disabled", () => {
                const result = slotDurationStore.spinDuration;
                expect(result).toBe(1);
            });

            it("should return turbo mode spin duration when turbo is enabled", () => {
                betControlStoreMock.turboEnabled = true;
                betControlStoreMock.triggerAutoSpin = false;
                const result = slotDurationStore.spinDuration;
                expect(result).toBe(0.3);
            });
        });

        describe("winningDuration", () => {
            it("should return normal mode winning duration when turbo is disabled", () => {
                const result = slotDurationStore.winningDuration;
                expect(result).toBe(2);
            });

            it("should return turbo mode winning duration when turbo is enabled", () => {
                betControlStoreMock.turboEnabled = true;
                betControlStoreMock.triggerAutoSpin = false;
                const result = slotDurationStore.winningDuration;
                expect(result).toBe(1);
            });
        });

        describe("noWinningDuration", () => {
            it("should return normal mode no winning duration when turbo is disabled", () => {
                const result = slotDurationStore.noWinningDuration;
                expect(result).toBe(0.75);
            });

            it("should return turbo mode no winning duration when turbo is enabled", () => {
                betControlStoreMock.turboEnabled = true;
                betControlStoreMock.triggerAutoSpin = false;
                const result = slotDurationStore.noWinningDuration;
                expect(result).toBe(0.5);
            });
        });

        describe("freespinDuration", () => {
            it("should return normal mode freespin duration when turbo is disabled", () => {
                const result = slotDurationStore.freespinDuration;
                expect(result).toBe(2);
            });

            it("should return turbo mode freespin duration when turbo is enabled", () => {
                betControlStoreMock.turboEnabled = true;
                betControlStoreMock.triggerAutoSpin = false;
                const result = slotDurationStore.freespinDuration;
                expect(result).toBe(1.5);
            });
        });

        describe("bonusDuration", () => {
            it("should return normal mode bonus duration when turbo is disabled", () => {
                const result = slotDurationStore.bonusDuration;
                expect(result).toBe(2);
            });

            it("should return turbo mode bonus duration when turbo is enabled", () => {
                betControlStoreMock.turboEnabled = true;
                betControlStoreMock.triggerAutoSpin = false;
                const result = slotDurationStore.bonusDuration;
                expect(result).toBe(1.5);
            });
        });

        describe("jackpotDuration", () => {
            it("should return normal mode jackpot duration when turbo is disabled", () => {
                const result = slotDurationStore.jackpotDuration;
                expect(result).toBe(2);
            });

            it("should return turbo mode jackpot duration when turbo is enabled", () => {
                betControlStoreMock.turboEnabled = true;
                betControlStoreMock.triggerAutoSpin = false;
                const result = slotDurationStore.jackpotDuration;
                expect(result).toBe(1.5);
            });
        });

        describe("bigWinDuration", () => {
            it("should return normal mode big win duration when turbo is disabled", () => {
                const result = slotDurationStore.bigWinDuration;
                expect(result).toBe(4);
            });

            it("should return turbo mode big win duration when turbo is enabled", () => {
                betControlStoreMock.turboEnabled = true;
                betControlStoreMock.triggerAutoSpin = false;
                const result = slotDurationStore.bigWinDuration;
                expect(result).toBe(3.2);
            });
        });

        describe("transitionDuration", () => {
            it("should return normal mode transition duration when turbo is disabled", () => {
                const result = slotDurationStore.transitionDuration;
                expect(result).toBe(0.5);
            });

            it("should return turbo mode transition duration when turbo is enabled", () => {
                betControlStoreMock.turboEnabled = true;
                betControlStoreMock.triggerAutoSpin = false;
                const result = slotDurationStore.transitionDuration;
                expect(result).toBe(0.5);
            });
        });

        describe("showBigWinValueDuration", () => {
            it("should return normal mode show big win value duration when turbo is disabled", () => {
                const result = slotDurationStore.showBigWinValueDuration;
                expect(result).toBe(1);
            });

            it("should return turbo mode show big win value duration when turbo is enabled", () => {
                betControlStoreMock.turboEnabled = true;
                betControlStoreMock.triggerAutoSpin = false;
                const result = slotDurationStore.showBigWinValueDuration;
                expect(result).toBe(0.8);
            });
        });

        describe("delayShowBigWinValue", () => {
            it("should return normal mode delay show big win value when turbo is disabled", () => {
                const result = slotDurationStore.delayShowBigWinValue;
                expect(result).toBe(1.5);
            });

            it("should return turbo mode delay show big win value when turbo is enabled", () => {
                betControlStoreMock.turboEnabled = true;
                betControlStoreMock.triggerAutoSpin = false;
                const result = slotDurationStore.delayShowBigWinValue;
                expect(result).toBe(1.2);
            });
        });
    });

    describe("config-level duration getters", () => {
        describe("showTotalBonusAmountDuration", () => {
            it("should return the config showTotalBonusAmountDuration", () => {
                const result = slotDurationStore.showTotalBonusAmountDuration;
                expect(result).toBe(4);
            });
        });

        describe("showJackpotWinningAmountDuration", () => {
            it("should return the config showJackpotWinningAmountDuration", () => {
                const result = slotDurationStore.showJackpotWinningAmountDuration;
                expect(result).toBe(4);
            });
        });
    });

    describe("dynamic config changes", () => {
        it("should reflect config changes when setConfig is called", () => {
            const newConfig: SlotGameBaseConfigs = {
                itemTypeCount: 5,
                jackpotSymbolIndex: 3,
                showTotalBonusAmountDuration: 5,
                bonusTimeOut: 60,
                showJackpotWinningAmountDuration: 5,
                jackpotTimeOut: 30,
                normalMode: {
                    spinDuration: 0.8,
                    winningDuration: 1.5,
                    noWinningDuration: 0.5,
                    bigWinDuration: 3,
                    freespinDuration: 1.5,
                    jackpotDuration: 1.5,
                    bonusDuration: 1.5,
                    showBigWinValueDuration: 0.8,
                    delayShowBigWinValue: 1.2,
                    transitionDuration: 0.4,
                },
                turboMode: {
                    spinDuration: 0.2,
                    winningDuration: 0.8,
                    noWinningDuration: 0.3,
                    bigWinDuration: 2.5,
                    freespinDuration: 1,
                    jackpotDuration: 1,
                    bonusDuration: 1,
                    showBigWinValueDuration: 0.6,
                    delayShowBigWinValue: 1,
                    transitionDuration: 0.4,
                },
            };

            slotDurationStore.setConfig(newConfig);

            expect(slotDurationStore.showTotalBonusAmountDuration).toBe(5);
            expect(slotDurationStore.showJackpotWinningAmountDuration).toBe(5);
            expect(slotDurationStore.spinDuration).toBe(0.8);
            expect(slotDurationStore.winningDuration).toBe(1.5);
        });
    });
});
