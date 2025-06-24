import gc from "@sg/game-client-base";
import { Container } from "inversify";
import "reflect-metadata";
import { LineData, SlotNotification, SlotState } from "../../../assets/scripts/definitions";
import { SlotBoardStore } from "../../../assets/scripts/handlers/stores/slot-board-store";

// Mock gc dependencies
jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        Rounds: {
            ...actualGc.Rounds,
            RoundTimeStore: jest.fn().mockImplementation(() => ({
                // Mock RoundTimeStore methods and properties if needed
            })),
            RoundStore: jest.fn().mockImplementation(() => ({
                // Mock RoundStore methods and properties if needed
            })),
        },
        GameConfigs: {
            ...actualGc.GameConfigs,
            GameConfigStore: jest.fn().mockImplementation(() => ({
                // Mock GameConfigStore methods and properties if needed
            })),
        },
        Player: {
            ...actualGc.Player,
            MainPlayerStore: jest.fn().mockImplementation(() => ({
                // Mock MainPlayerStore methods and properties if needed
            })),
        },
        GameUserSettings: {
            ...actualGc.GameUserSettings,
            GameUserSettingHandler: jest.fn().mockImplementation(() => ({
                // Mock GameUserSettingHandler methods and properties if needed
            })),
        },
    };
});

describe("SlotBoardStore", () => {
    let container: Container;
    let slotBoardStore: SlotBoardStore;
    let mockRoundTimeStore: jest.Mocked<gc.Rounds.RoundTimeStore>;
    let mockRoundStore: jest.Mocked<gc.Rounds.RoundStore>;
    let mockGameConfigStore: jest.Mocked<gc.GameConfigs.GameConfigStore>;
    let mockMainPlayerStore: jest.Mocked<gc.Player.MainPlayerStore>;
    let mockGameUserSettingHandler: jest.Mocked<gc.GameUserSettings.GameUserSettingHandler>;

    beforeEach(() => {
        container = new Container();

        // Create mock instances
        const MockedRoundTimeStore = jest.requireMock("@sg/game-client-base").Rounds.RoundTimeStore;
        const MockedRoundStore = jest.requireMock("@sg/game-client-base").Rounds.RoundStore;
        const MockedGameConfigStore = jest.requireMock("@sg/game-client-base").GameConfigs.GameConfigStore;
        const MockedMainPlayerStore = jest.requireMock("@sg/game-client-base").Player.MainPlayerStore;
        const MockedGameUserSettingHandler = jest.requireMock("@sg/game-client-base").GameUserSettings.GameUserSettingHandler;

        mockRoundTimeStore = new MockedRoundTimeStore();
        mockRoundStore = new MockedRoundStore();
        mockGameConfigStore = new MockedGameConfigStore();
        mockMainPlayerStore = new MockedMainPlayerStore();
        mockGameUserSettingHandler = new MockedGameUserSettingHandler();

        // Bind dependencies to container
        container.bind(gc.Rounds.RoundTimeStore).toConstantValue(mockRoundTimeStore);
        container.bind(gc.Rounds.RoundStore).toConstantValue(mockRoundStore);
        container.bind(gc.GameConfigs.GameConfigStore).toConstantValue(mockGameConfigStore);
        container.bind(gc.Player.MainPlayerStore).toConstantValue(mockMainPlayerStore);
        container.bind(gc.GameUserSettings.GameUserSettingHandler).toConstantValue(mockGameUserSettingHandler);
        container.bind(SlotBoardStore).toSelf();

        // Get the store instance
        slotBoardStore = container.get(SlotBoardStore);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("constructor", () => {
        it("should initialize with default values", () => {
            expect(slotBoardStore.spinResult).toEqual({ result: [], duration: 0, turbo: false, onComplete: expect.any(Function) });
            expect(slotBoardStore.receivedBonus).toBeNull();
            expect(slotBoardStore.receivedJackpot).toBeNull();
            expect(slotBoardStore.receivedFreeSpins).toBeNull();
            expect(slotBoardStore.receivedBigWin).toBeNull();
            expect(slotBoardStore.winningJackpot).toBeNull();
            expect(slotBoardStore.bonusChest).toBeNull();
            expect(slotBoardStore.winningItemsOnLines).toEqual([]);
            expect(slotBoardStore.winningLines).toEqual([]);
            expect(slotBoardStore.highlightSpecialSymbols).toEqual([]);
            expect(slotBoardStore.slotState).toBe(SlotState.NOT_READY);
            expect(slotBoardStore.forceStopSettle).toBeNull();
            expect(slotBoardStore.winningBet).toBe(0);
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.READY);
        });

        it("should make the store observable", () => {
            // This test verifies that mobx.makeAutoObservable was called
            // We can check if properties are reactive by setting and checking them
            const initialState = slotBoardStore.slotState;
            slotBoardStore.slotState = SlotState.READY;
            expect(slotBoardStore.slotState).not.toBe(initialState);
            expect(slotBoardStore.slotState).toBe(SlotState.READY);
        });
    });

    describe("spinResult property", () => {
        it("should allow setting spin result", () => {
            const newSpinResult = { result: [1, 2, 3], duration: 1000, turbo: true, onComplete: () => {} };
            slotBoardStore.spinResult = newSpinResult;
            expect(slotBoardStore.spinResult).toEqual({
                result: [1, 2, 3],
                duration: 1000,
                turbo: true,
                onComplete: expect.any(Function),
            });
        });
    });

    describe("bonus and winning properties", () => {
        it("should allow setting receivedBonus", () => {
            const bonusData = { type: "bonus", amount: 100 };
            slotBoardStore.receivedBonus = bonusData;
            expect(slotBoardStore.receivedBonus).toEqual(bonusData);
        });

        it("should allow setting receivedJackpot", () => {
            const jackpotData = { type: "jackpot", amount: 5000 };
            slotBoardStore.receivedJackpot = jackpotData;
            expect(slotBoardStore.receivedJackpot).toEqual(jackpotData);
        });

        it("should allow setting receivedFreeSpins", () => {
            const freeSpinsData = { count: 10, multiplier: 2 };
            slotBoardStore.receivedFreeSpins = freeSpinsData;
            expect(slotBoardStore.receivedFreeSpins).toEqual(freeSpinsData);
        });

        it("should allow setting receivedBigWin", () => {
            const bigWinData = { amount: 2000, multiplier: 5 };
            slotBoardStore.receivedBigWin = bigWinData;
            expect(slotBoardStore.receivedBigWin).toEqual(bigWinData);
        });

        it("should allow setting winningJackpot", () => {
            const jackpotData = { level: 1, amount: 1000 };
            slotBoardStore.winningJackpot = jackpotData;
            expect(slotBoardStore.winningJackpot).toEqual(jackpotData);
        });

        it("should allow setting bonusChest", () => {
            const chestData = { type: "gold", reward: 500 };
            slotBoardStore.bonusChest = chestData;
            expect(slotBoardStore.bonusChest).toEqual(chestData);
        });
    });

    describe("winning lines and symbols", () => {
        it("should allow setting winningItemsOnLines", () => {
            const winningItems = [{ line: 1, items: [1, 2, 3] }];
            slotBoardStore.winningItemsOnLines = winningItems;
            expect(slotBoardStore.winningItemsOnLines).toEqual(winningItems);
        });

        it("should allow setting winningLines", () => {
            const lineData: LineData[] = [
                { payline: 1, positions: [0, 3, 6], symbol: 5 },
                { payline: 2, positions: [1, 4, 7], symbol: 3 },
            ];
            slotBoardStore.winningLines = lineData;
            expect(slotBoardStore.winningLines).toEqual(lineData);
        });

        it("should allow setting highlightSpecialSymbols", () => {
            const specialSymbols = [7, 8, 9];
            slotBoardStore.highlightSpecialSymbols = specialSymbols;
            expect(slotBoardStore.highlightSpecialSymbols).toEqual(specialSymbols);
        });
    });

    describe("slot state management", () => {
        it("should allow setting slotState", () => {
            slotBoardStore.slotState = SlotState.SPINNING;
            expect(slotBoardStore.slotState).toBe(SlotState.SPINNING);
        });

        it("should allow setting forceStopSettle", () => {
            const settleData = { force: true, reason: "manual" };
            slotBoardStore.forceStopSettle = settleData;
            expect(slotBoardStore.forceStopSettle).toEqual(settleData);
        });
    });

    describe("winningBet property", () => {
        it("should allow setting winningBet", () => {
            slotBoardStore.winningBet = 1500;
            expect(slotBoardStore.winningBet).toBe(1500);
        });
    });

    describe("isReadyBet getter", () => {
        it("should return true when slot state is READY", () => {
            slotBoardStore.slotState = SlotState.READY;
            expect(slotBoardStore.isReadyBet).toBe(true);
        });

        it("should return true when slot state is SETTLED", () => {
            slotBoardStore.slotState = SlotState.SETTLED;
            expect(slotBoardStore.isReadyBet).toBe(true);
        });

        it("should return false when slot state is NOT_READY", () => {
            slotBoardStore.slotState = SlotState.NOT_READY;
            expect(slotBoardStore.isReadyBet).toBe(false);
        });

        it("should return false when slot state is BET", () => {
            slotBoardStore.slotState = SlotState.BET;
            expect(slotBoardStore.isReadyBet).toBe(false);
        });

        it("should return false when slot state is SPINNING", () => {
            slotBoardStore.slotState = SlotState.SPINNING;
            expect(slotBoardStore.isReadyBet).toBe(false);
        });
    });

    describe("bottomMessageState", () => {
        it("should allow setting bottomMessageState", () => {
            slotBoardStore.bottomMessageState = SlotNotification.SPINNING;
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SPINNING);
        });
    });

    describe("reset method", () => {
        it("should reset all bonus and winning properties to null", () => {
            // Set up some data first
            slotBoardStore.receivedBonus = { type: "bonus" };
            slotBoardStore.receivedJackpot = { amount: 1000 };
            slotBoardStore.receivedFreeSpins = { count: 5 };
            slotBoardStore.receivedBigWin = { amount: 500 };
            slotBoardStore.winningJackpot = { level: 1 };
            slotBoardStore.bonusChest = { type: "silver" };
            slotBoardStore.highlightSpecialSymbols = [7, 8];
            slotBoardStore.slotState = SlotState.SPINNING;

            // Call reset
            slotBoardStore.reset();

            // Verify all properties are reset
            expect(slotBoardStore.receivedBonus).toBeNull();
            expect(slotBoardStore.receivedJackpot).toBeNull();
            expect(slotBoardStore.receivedFreeSpins).toBeNull();
            expect(slotBoardStore.receivedBigWin).toBeNull();
            expect(slotBoardStore.winningJackpot).toBeNull();
            expect(slotBoardStore.bonusChest).toBeNull();
            expect(slotBoardStore.highlightSpecialSymbols).toEqual([]);
            expect(slotBoardStore.slotState).toBe(SlotState.READY);
        });

        it("should not affect other properties", () => {
            // Set up some data that should not be reset
            const spinResult = { result: [1, 2, 3], duration: 1000, turbo: false, onComplete: () => {} };
            const winningLines: LineData[] = [{ payline: 1, positions: [0, 3, 6], symbol: 5 }];
            const winningItemsOnLines = [{ line: 1, items: [1, 2, 3] }];
            const winningBet = 500;
            const bottomMessageState = SlotNotification.SPINNING;

            slotBoardStore.spinResult = spinResult;
            slotBoardStore.winningLines = winningLines;
            slotBoardStore.winningItemsOnLines = winningItemsOnLines;
            slotBoardStore.winningBet = winningBet;
            slotBoardStore.bottomMessageState = bottomMessageState;

            // Call reset
            slotBoardStore.reset();

            // Verify these properties are not affected
            expect(slotBoardStore.spinResult).toEqual({
                result: [1, 2, 3],
                duration: 1000,
                turbo: false,
                onComplete: expect.any(Function),
            });
            expect(slotBoardStore.winningLines).toEqual(winningLines);
            expect(slotBoardStore.winningItemsOnLines).toEqual(winningItemsOnLines);
            expect(slotBoardStore.winningBet).toBe(winningBet);
            expect(slotBoardStore.bottomMessageState).toBe(bottomMessageState);
        });
    });

    describe("resetOnNewSpin method", () => {
        it("should reset winning lines, items arrays, and other spin-related properties", () => {
            // Set up some data first
            const winningLines: LineData[] = [
                { payline: 1, positions: [0, 3, 6], symbol: 5 },
                { payline: 2, positions: [1, 4, 7], symbol: 3 },
            ];
            const winningItemsOnLines = [
                { line: 1, items: [1, 2, 3] },
                { line: 2, items: [4, 5, 6] },
            ];

            slotBoardStore.winningLines = winningLines;
            slotBoardStore.winningItemsOnLines = winningItemsOnLines;
            slotBoardStore.winningBet = 1500;
            slotBoardStore.forceStopSettle = { force: true, reason: "manual" };
            slotBoardStore.slotState = SlotState.SETTLED;
            slotBoardStore.bottomMessageState = SlotNotification.SETTLED;

            // Call resetOnNewSpin
            slotBoardStore.resetOnNewSpin();

            // Verify arrays and properties are reset
            expect(slotBoardStore.winningLines).toEqual([]);
            expect(slotBoardStore.winningItemsOnLines).toEqual([]);
            expect(slotBoardStore.winningBet).toBe(0);
            expect(slotBoardStore.forceStopSettle).toEqual({});
            expect(slotBoardStore.slotState).toBe(SlotState.BET);
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SPINNING);
        });

        it("should not affect bonus and other non-spin properties", () => {
            // Set up some data that should not be reset
            const receivedBonus = { type: "bonus" };
            const receivedJackpot = { amount: 1000 };
            const receivedFreeSpins = { count: 5 };
            const receivedBigWin = { amount: 500 };
            const winningJackpot = { level: 1 };
            const bonusChest = { type: "gold" };
            const highlightSpecialSymbols = [7, 8, 9];
            const spinResult = { result: [1, 2, 3], duration: 1000, turbo: false, onComplete: () => {} };

            slotBoardStore.receivedBonus = receivedBonus;
            slotBoardStore.receivedJackpot = receivedJackpot;
            slotBoardStore.receivedFreeSpins = receivedFreeSpins;
            slotBoardStore.receivedBigWin = receivedBigWin;
            slotBoardStore.winningJackpot = winningJackpot;
            slotBoardStore.bonusChest = bonusChest;
            slotBoardStore.highlightSpecialSymbols = highlightSpecialSymbols;
            slotBoardStore.spinResult = spinResult;

            // Call resetOnNewSpin
            slotBoardStore.resetOnNewSpin();

            // Verify these properties are not affected
            expect(slotBoardStore.receivedBonus).toEqual(receivedBonus);
            expect(slotBoardStore.receivedJackpot).toEqual(receivedJackpot);
            expect(slotBoardStore.receivedFreeSpins).toEqual(receivedFreeSpins);
            expect(slotBoardStore.receivedBigWin).toEqual(receivedBigWin);
            expect(slotBoardStore.winningJackpot).toEqual(winningJackpot);
            expect(slotBoardStore.bonusChest).toEqual(bonusChest);
            expect(slotBoardStore.highlightSpecialSymbols).toEqual(highlightSpecialSymbols);
            expect(slotBoardStore.spinResult).toEqual({
                result: [1, 2, 3],
                duration: 1000,
                turbo: false,
                onComplete: expect.any(Function),
            });
        });
    });
});
