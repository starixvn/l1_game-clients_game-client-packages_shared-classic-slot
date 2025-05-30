import gc from "@sg/game-client-base";
import { Container } from "inversify";
import "reflect-metadata";
import { SlotNotification, SlotState, SpecialSymbol } from "../../assets/scripts/definitions";
import { SlotBetHandler } from "../../assets/scripts/handlers/handlers/slot-bet-handlers";
import { SlotErrorHandler } from "../../assets/scripts/handlers/handlers/slot-error-handler";
import { SlotSettlementHandler } from "../../assets/scripts/handlers/handlers/slot-settlement-handlers";
import { BetControlStore } from "../../assets/scripts/handlers/stores/bet-control-store";
import { SlotBoardStore } from "../../assets/scripts/handlers/stores/slot-board-store";
import { SlotDurationStore } from "../../assets/scripts/handlers/stores/slot-duration-store";

// Define an enhanced type for the BetControlStore mock instance
interface EnhancedMockedBetControlStore extends jest.Mocked<BetControlStore> {
    totalFreeSpins: number;
    roundId: number; // Mock also defines roundId directly
    autoSpinEnabled: boolean;
    freeSpinEnabled: boolean;
    turboEnabled: boolean;
    triggerAutoSpin: boolean;
    // Methods like setTotalFreeSpins, decreaseFreeSpinCount, etc., are part of jest.Mocked<BetControlStore>
    // if they are actual methods of BetControlStore.
    // The mock implementation below adds them as jest.fn() properties on the instance.
    setTotalFreeSpins: jest.Mock<any, [number]>;
    decreaseFreeSpinCount: jest.Mock;
    clearFreeSpins: jest.Mock;
    syncFreeSpinCount: jest.Mock;
}

jest.mock(
    "db://shared-components/shared/utils",
    () => ({
        AnimationUtils: {
            delayTime: jest.fn().mockResolvedValue(undefined),
        },
    }),
    { virtual: true }
);

jest.mock("../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(function (this: any) {
        this.roundId = -1;
        this.totalFreeSpins = 0;
        this.autoSpinEnabled = false;
        this.freeSpinEnabled = false;
        this.turboEnabled = false;
        this.triggerAutoSpin = false;

        this.setTotalFreeSpins = jest.fn((count: number) => {
            this.totalFreeSpins = count;
        });
        this.decreaseFreeSpinCount = jest.fn();
        this.clearFreeSpins = jest.fn();
        this.syncFreeSpinCount = jest.fn();
        return this;
    }),
}));
jest.mock("../../assets/scripts/handlers/stores/slot-board-store", () => ({
    SlotBoardStore: jest.fn().mockImplementation(() => ({
        slotState: SlotState.NOT_READY,
        bottomMessageState: SlotNotification.READY,
        bonusChest: null,
        winningJackpot: null,
        winningItemsOnLines: [],
        winningLines: [],
        receivedJackpot: null,
        receivedBigWin: null,
        receivedFreeSpins: null,
        highlightSpecialSymbols: [],
        reset: jest.fn(),
        winningBet: 0, // Added property
    })),
}));
jest.mock("../../assets/scripts/handlers/stores/slot-duration-store", () => ({
    SlotDurationStore: jest.fn().mockImplementation(() => ({
        jackpotDuration: 500,
        bigWinDuration: 1000,
        freespinDuration: 300,
        winningDuration: 200,
        noWinningDuration: 100,
        showBigWinValueDuration: 500,
        delayShowBigWinValue: 200,
        showTotalBonusAmountDuration: 400,
        showJackpotWinningAmountDuration: 600,
        spinDuration: 700,
        totalSpinDuration: 800,
    })),
}));
jest.mock("../../assets/scripts/handlers/handlers/slot-bet-handlers", () => ({
    SlotBetHandler: jest.fn().mockImplementation(() => ({
        handlePlaceBetFailed: jest.fn(),
    })),
}));
jest.mock("../../assets/scripts/handlers/handlers/slot-error-handler", () => ({
    SlotErrorHandler: jest.fn().mockImplementation(() => ({
        handleEndGameApiError: jest.fn(),
    })),
}));

jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        Connection: {
            ...actualGc.Connection,
            ConnectionStore: jest.fn().mockImplementation(() => ({
                connection: {
                    emit: jest.fn(),
                },
            })),
        },
        Bet: {
            ...actualGc.Bet,
            BetStore: jest.fn().mockImplementation(() => ({
                lastReceivedBet: null,
            })),
        },
        Error: {
            ...actualGc.Error,
            ErrorStore: jest.fn().mockImplementation(() => ({
                apiError: null,
            })),
        },
    };
});

jest.mock("cc", () => {
    const actualCC = jest.requireActual("cc") || {}; // Fallback if 'cc' is not found by requireActual in some test environments

    const executeTweenActions = (actionsList) => {
        for (const action of actionsList) {
            if (action.type === "call") {
                action.callback();
            } else if (action.type === "sequenceItem" && action.item && typeof action.item.execute === "function") {
                action.item.execute();
            }
            // Delays are effectively skipped by this mock for immediate callback execution.
            // Tests should use jest.advanceTimersByTime for other async logic if needed.
        }
    };

    const createMockTween = () => {
        let actions = [];
        const mockTweenInstance = {
            call: jest.fn(function (callback) {
                actions.push({ type: "call", callback });
                return this;
            }),
            delay: jest.fn(function (duration) {
                actions.push({ type: "delay", duration }); // Store delay for completeness, though not used by executeTweenActions
                return this;
            }),
            sequence: jest.fn(function (...items) {
                items.forEach((item) => {
                    // Ensure 'item' is a mock tween instance that has an 'execute' method
                    if (item && typeof item.execute === "function") {
                        actions.push({ type: "sequenceItem", item });
                    } else {
                        // If item is not a recognized mock tween (e.g. a raw function from a bad mock elsewhere), log or handle
                        // console.warn("Unsupported item in sequence:", item);
                    }
                });
                return this;
            }),
            start: jest.fn(function () {
                executeTweenActions(actions);
            }),
            // Custom method for this mock, allowing a sequence to execute its child tweens
            execute: jest.fn(function () {
                executeTweenActions(actions);
            }),
        };
        return mockTweenInstance;
    };

    return {
        ...actualCC,
        tween: jest.fn((target) => createMockTween()),
        // Add other 'cc' members if they are used by the SUT and need mocking e.g.
        // Vec3: actualCC.Vec3 || function() { /* mock Vec3 */ },
        // Component: actualCC.Component || class Component {},
    };
});

describe("SlotSettlementHandler", () => {
    let container: Container;
    let settlementHandler: SlotSettlementHandler;
    let betControlStore: EnhancedMockedBetControlStore;
    let slotBoardStore: jest.Mocked<SlotBoardStore>;
    let slotDurationStore: jest.Mocked<SlotDurationStore>;
    let slotBetHandler: jest.Mocked<SlotBetHandler>;
    let slotErrorHandler: jest.Mocked<SlotErrorHandler>;
    let connectionStore: jest.Mocked<gc.Connection.ConnectionStore>;
    let betStore: jest.Mocked<gc.Bet.BetStore>;
    let errorStore: jest.Mocked<gc.Error.ErrorStore>;

    beforeEach(() => {
        container = new Container();

        container.bind(SlotSettlementHandler).toSelf();

        const MockedBetControlStoreConstructor = jest.requireMock("../../assets/scripts/handlers/stores/bet-control-store").BetControlStore;
        const rawBetControlStoreMock = new MockedBetControlStoreConstructor();
        betControlStore = rawBetControlStoreMock as EnhancedMockedBetControlStore;
        container.bind(BetControlStore).toConstantValue(betControlStore);

        const MockedSlotBoardStore = jest.requireMock("../../assets/scripts/handlers/stores/slot-board-store").SlotBoardStore;
        slotBoardStore = new MockedSlotBoardStore();
        container.bind(SlotBoardStore).toConstantValue(slotBoardStore);

        const MockedSlotDurationStore = jest.requireMock("../../assets/scripts/handlers/stores/slot-duration-store").SlotDurationStore;
        slotDurationStore = new MockedSlotDurationStore();
        container.bind(SlotDurationStore).toConstantValue(slotDurationStore);

        const MockedSlotBetHandler = jest.requireMock("../../assets/scripts/handlers/handlers/slot-bet-handlers").SlotBetHandler;
        slotBetHandler = new MockedSlotBetHandler();
        container.bind(SlotBetHandler).toConstantValue(slotBetHandler);

        const MockedSlotErrorHandler = jest.requireMock("../../assets/scripts/handlers/handlers/slot-error-handler").SlotErrorHandler;
        slotErrorHandler = new MockedSlotErrorHandler();
        container.bind(SlotErrorHandler).toConstantValue(slotErrorHandler);

        const MockedConnectionStore = jest.requireMock("@sg/game-client-base").Connection.ConnectionStore;
        connectionStore = new MockedConnectionStore();
        container.bind(gc.Connection.ConnectionStore).toConstantValue(connectionStore);

        const MockedBetStore = jest.requireMock("@sg/game-client-base").Bet.BetStore;
        betStore = new MockedBetStore();
        container.bind(gc.Bet.BetStore).toConstantValue(betStore);

        const MockedErrorStore = jest.requireMock("@sg/game-client-base").Error.ErrorStore;
        errorStore = new MockedErrorStore();
        container.bind(gc.Error.ErrorStore).toConstantValue(errorStore);

        settlementHandler = container.get(SlotSettlementHandler);

        Object.assign(settlementHandler, {
            betControlStore,
            slotBoardStore,
            slotDurationStore,
            slotBetHandler,
            slotErrorHandler,
            connectionStore,
            betStore,
            errorStore,
        });

        jest.useFakeTimers();
        jest.requireMock("db://shared-components/shared/utils").AnimationUtils.delayTime.mockClear();
        slotBoardStore.reset.mockClear();
        connectionStore.connection.emit.mockClear();
        if (slotBetHandler.handlePlaceBetFailed) slotBetHandler.handlePlaceBetFailed.mockClear();
        betControlStore.setTotalFreeSpins.mockClear();
        betControlStore.decreaseFreeSpinCount.mockClear();
        betControlStore.clearFreeSpins.mockClear();
        betControlStore.syncFreeSpinCount.mockClear();

        slotBoardStore.slotState = SlotState.NOT_READY;
        slotBoardStore.highlightSpecialSymbols = [];
        slotBoardStore.receivedBigWin = null;
        slotBoardStore.receivedFreeSpins = null;
        slotBoardStore.winningBet = -1; // Set to a sentinel value

        betControlStore.totalFreeSpins = 0;
        // Properties like autoSpinEnabled are set by the mock constructor, no need to reset here unless for a specific test.
        betStore.lastReceivedBet = null;
        errorStore.apiError = null;
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks();
    });

    describe("reset", () => {
        it("should clear timeouts and reset board store", () => {
            const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
            const resetSpy = jest.spyOn(slotBoardStore, "reset");

            settlementHandler.timeoutNextSpin = {} as any;
            settlementHandler.reset();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            expect(resetSpy).toHaveBeenCalled();
        });
    });

    describe("requestOpenJackpot", () => {
        it("should emit jackpot event with correct index", () => {
            const index = 1;
            settlementHandler.requestOpenJackpot(index);
            expect(connectionStore.connection.emit).toHaveBeenCalledWith("jackpot", { chest: index });
        });
    });

    describe("requestOpenBonus", () => {
        it("should emit bonus event with correct index", () => {
            const index = 2;
            settlementHandler.requestOpenBonus(index);
            expect(connectionStore.connection.emit).toHaveBeenCalledWith("bonus", { chest: index });
        });
    });

    describe("handleBonusChest", () => {
        it("should update bonusChest in board store", () => {
            const bonusChest = { value: 100 };
            settlementHandler.handleBonusChest(bonusChest);
            expect(slotBoardStore.bonusChest).toEqual(bonusChest);
        });
    });

    describe("handleWinningJackpot", () => {
        it("should update winningJackpot in board store", () => {
            const winningJackpot = { value: 1000 };
            settlementHandler.handleWinningJackpot(winningJackpot);
            expect(slotBoardStore.winningJackpot).toEqual(winningJackpot);
        });
    });

    describe("handleJackpot", () => {
        it("should process jackpot win correctly", async () => {
            const jackpot = {
                winningLine: 0,
                symbol: "WILD",
                roundId: 1,
                result: [1, 2, 3],
            } as any;

            await settlementHandler.handleJackpot(jackpot);

            expect(slotBoardStore.winningItemsOnLines).toHaveLength(1);
            expect(slotBoardStore.winningLines).toHaveLength(1);
            expect(slotBoardStore.receivedJackpot).toEqual({
                jackpot,
                duration: slotDurationStore.jackpotDuration,
            });
        });
    });

    describe("handleFinish", () => {
        const createFinishData = (overrides: any = {}) => {
            const { settlementResult, ...rest } = overrides;
            return {
                result: [1, 2, 3],
                settlementResult: {
                    winningLines: [],
                    jackpot: null,
                    bonus: { count: 0 },
                    freeSpins: { count: 0 },
                    ...settlementResult,
                },
                betWin: 100,
                bigWin: false,
                roundId: 1,
                totalOfFreeSpins: 0,
                betByFreeSpin: false,
                ...rest,
            };
        };

        it("should handle normal win scenario", async () => {
            const finish = createFinishData();
            await settlementHandler.handleFinish(finish as any);

            expect(slotBoardStore.slotState).toBe(SlotState.SETTLED);
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);
            expect(betControlStore.roundId).toBe(finish.roundId);
        });

        it("should handle big win scenario", async () => {
            const finish = createFinishData({ bigWin: true, betWin: 1000 });
            // @ts-ignore
            const createTweenShowBigWinSpy = jest.spyOn(settlementHandler, "createTweenShowBigWin");
            await settlementHandler.handleFinish(finish as any);

            expect(slotBoardStore.slotState).toBe(SlotState.SPINNING); // This might change depending on async nature
            expect(betControlStore.roundId).toBe(finish.roundId);
            expect(createTweenShowBigWinSpy).toHaveBeenCalledWith(finish.betWin, finish.bigWin);
        });

        it("should handle free spins win scenario", async () => {
            const finish = createFinishData({
                settlementResult: { freeSpins: { count: 5 } },
                totalOfFreeSpins: 5,
            });
            // @ts-ignore
            const createTweenShowFreeSpinsSpy = jest.spyOn(settlementHandler, "createTweenShowFreeSpins");
            await settlementHandler.handleFinish(finish as any);

            expect(slotBoardStore.highlightSpecialSymbols).toContain(SpecialSymbol.FREESPIN);
            expect(betControlStore.setTotalFreeSpins).toHaveBeenCalledWith(5);
            expect(betControlStore.totalFreeSpins).toBe(5);
            expect(createTweenShowFreeSpinsSpy).toHaveBeenCalledWith(finish.settlementResult.freeSpins);
        });

        it("should set winningBet to 0 if betWin is 0, even with other special conditions", async () => {
            const finish = createFinishData({
                betWin: 0,
                settlementResult: { freeSpins: { count: 5 } }, // e.g., won free spins but betWin is 0
                totalOfFreeSpins: 5,
            });

            await settlementHandler.handleFinish(finish as any);

            // Directly check if winningBet is set to 0 after initial processing in handleFinish
            // This happens before the tweens complete for showing big wins or free spins.
            expect(slotBoardStore.winningBet).toBe(0);
        });
    });

    describe("handleSettleTween", () => {
        const mockWinningLines = [{ payline: 0, positions: [0, 1, 2], symbol: "A" }];
        const mockFreeSpins = { count: 5, data: {} }; // Assuming freeSpins has a count and data

        it("should handle normal win scenario (no big win, no free spins)", () => {
            const betWin = 100;
            const bigWin = false;
            const newFreeSpinCount = 0;
            const jackpot = null;

            // @ts-ignore
            const showWinningLinesSpy = jest.spyOn(settlementHandler, "showWinningLines");
            // @ts-ignore
            const createTweenShowBigWinSpy = jest.spyOn(settlementHandler, "createTweenShowBigWin");
            // @ts-ignore
            const createTweenShowFreeSpinsSpy = jest.spyOn(settlementHandler, "createTweenShowFreeSpins");
            // @ts-ignore
            const finishSettlementSpy = jest.spyOn(settlementHandler, "finishSettlement");
            // @ts-ignore
            const checkSpinNextRoundSpy = jest.spyOn(settlementHandler, "checkSpinNextRound");

            // @ts-ignore
            settlementHandler.handleSettleTween(bigWin, newFreeSpinCount, betWin, jackpot, mockWinningLines, { count: newFreeSpinCount });

            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);
            jest.advanceTimersByTime(slotDurationStore.winningDuration);
            expect(showWinningLinesSpy).toHaveBeenCalledWith(betWin, bigWin, jackpot, mockWinningLines);

            expect(createTweenShowBigWinSpy).not.toHaveBeenCalled();
            expect(createTweenShowFreeSpinsSpy).not.toHaveBeenCalled();

            // Advance timers past all potential delays in the sequence
            jest.runAllTimers();

            expect(finishSettlementSpy).toHaveBeenCalled();
            expect(slotErrorHandler.handleEndGameApiError).toHaveBeenCalled();
            expect(checkSpinNextRoundSpy).toHaveBeenCalled();
        });

        it("should handle big win scenario", () => {
            const betWin = 1000;
            const bigWin = true;
            const newFreeSpinCount = 0;
            const jackpot = null;

            // @ts-ignore
            const showWinningLinesSpy = jest.spyOn(settlementHandler, "showWinningLines");
            // @ts-ignore
            const createTweenShowBigWinSpy = jest.spyOn(settlementHandler, "createTweenShowBigWin");
            // @ts-ignore
            const createTweenShowFreeSpinsSpy = jest.spyOn(settlementHandler, "createTweenShowFreeSpins");
            // @ts-ignore
            const finishSettlementSpy = jest.spyOn(settlementHandler, "finishSettlement");

            // @ts-ignore
            settlementHandler.handleSettleTween(bigWin, newFreeSpinCount, betWin, jackpot, mockWinningLines, { count: newFreeSpinCount });

            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);
            jest.advanceTimersByTime(slotDurationStore.noWinningDuration);
            expect(showWinningLinesSpy).toHaveBeenCalledWith(betWin, bigWin, jackpot, mockWinningLines);
            expect(createTweenShowBigWinSpy).toHaveBeenCalledWith(betWin, bigWin);

            // Advance timers past big win duration
            jest.advanceTimersByTime(slotDurationStore.bigWinDuration);
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);
            expect(createTweenShowFreeSpinsSpy).not.toHaveBeenCalled();

            jest.runAllTimers();
            expect(finishSettlementSpy).toHaveBeenCalled();
        });

        it("should handle free spins awarded scenario", () => {
            const betWin = 50;
            const bigWin = false;
            const newFreeSpinCount = 5;
            const jackpot = null;

            // @ts-ignore
            const showWinningLinesSpy = jest.spyOn(settlementHandler, "showWinningLines");
            // @ts-ignore
            const createTweenShowBigWinSpy = jest.spyOn(settlementHandler, "createTweenShowBigWin");
            // @ts-ignore
            const createTweenShowFreeSpinsSpy = jest.spyOn(settlementHandler, "createTweenShowFreeSpins");
            // @ts-ignore
            const finishSettlementSpy = jest.spyOn(settlementHandler, "finishSettlement");

            // @ts-ignore
            settlementHandler.handleSettleTween(bigWin, newFreeSpinCount, betWin, jackpot, mockWinningLines, mockFreeSpins);

            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);
            jest.advanceTimersByTime(slotDurationStore.winningDuration);
            expect(showWinningLinesSpy).toHaveBeenCalledWith(betWin, bigWin, jackpot, mockWinningLines);
            expect(createTweenShowBigWinSpy).not.toHaveBeenCalled();
            expect(createTweenShowFreeSpinsSpy).toHaveBeenCalledWith(mockFreeSpins);

            // Advance timers past free spin duration
            jest.advanceTimersByTime(slotDurationStore.freespinDuration);
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);

            jest.runAllTimers();
            expect(finishSettlementSpy).toHaveBeenCalled();
        });

        it("should handle both big win and free spins awarded", () => {
            const betWin = 1500;
            const bigWin = true;
            const newFreeSpinCount = 3;
            const jackpot = null;

            // @ts-ignore
            const showWinningLinesSpy = jest.spyOn(settlementHandler, "showWinningLines");
            // @ts-ignore
            const createTweenShowBigWinSpy = jest.spyOn(settlementHandler, "createTweenShowBigWin");
            // @ts-ignore
            const createTweenShowFreeSpinsSpy = jest.spyOn(settlementHandler, "createTweenShowFreeSpins");

            // @ts-ignore
            settlementHandler.handleSettleTween(bigWin, newFreeSpinCount, betWin, jackpot, mockWinningLines, {
                ...mockFreeSpins,
                count: newFreeSpinCount,
            });

            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);
            jest.advanceTimersByTime(slotDurationStore.noWinningDuration);
            expect(showWinningLinesSpy).toHaveBeenCalled();
            expect(createTweenShowBigWinSpy).toHaveBeenCalledWith(betWin, bigWin);

            jest.advanceTimersByTime(slotDurationStore.bigWinDuration);
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);
            expect(createTweenShowFreeSpinsSpy).toHaveBeenCalledWith({ ...mockFreeSpins, count: newFreeSpinCount });

            jest.runAllTimers();
        });

        it("should handle no win scenario (betWin = 0)", () => {
            const betWin = 0;
            const bigWin = false;
            const newFreeSpinCount = 0;
            const jackpot = null;

            // @ts-ignore
            const showWinningLinesSpy = jest.spyOn(settlementHandler, "showWinningLines");
            // @ts-ignore
            const createTweenShowBigWinSpy = jest.spyOn(settlementHandler, "createTweenShowBigWin");
            // @ts-ignore
            const createTweenShowFreeSpinsSpy = jest.spyOn(settlementHandler, "createTweenShowFreeSpins");

            // @ts-ignore
            settlementHandler.handleSettleTween(bigWin, newFreeSpinCount, betWin, jackpot, [], { count: newFreeSpinCount });

            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);
            jest.advanceTimersByTime(slotDurationStore.noWinningDuration);
            expect(showWinningLinesSpy).toHaveBeenCalledWith(betWin, bigWin, jackpot, []);
            expect(createTweenShowBigWinSpy).not.toHaveBeenCalled();
            expect(createTweenShowFreeSpinsSpy).not.toHaveBeenCalled();

            jest.runAllTimers();
        });
    });

    describe("handleWinningSpecialSymbols", () => {
        it("should highlight BONUS when bonus count > 0", () => {
            const bonus = { count: 1 };
            const newFreeSpinCount = 0;
            // @ts-ignore
            settlementHandler.handleWinningSpecialSymbols(bonus, newFreeSpinCount);
            expect(slotBoardStore.highlightSpecialSymbols).toEqual([SpecialSymbol.BONUS]);
        });

        it("should highlight FREESPIN when newFreeSpinCount > 0", () => {
            const bonus = { count: 0 };
            const newFreeSpinCount = 5;
            // @ts-ignore
            settlementHandler.handleWinningSpecialSymbols(bonus, newFreeSpinCount);
            expect(slotBoardStore.highlightSpecialSymbols).toEqual([SpecialSymbol.FREESPIN]);
        });

        it("should highlight both BONUS and FREESPIN when both are > 0", () => {
            const bonus = { count: 1 };
            const newFreeSpinCount = 3;
            // @ts-ignore
            settlementHandler.handleWinningSpecialSymbols(bonus, newFreeSpinCount);
            expect(slotBoardStore.highlightSpecialSymbols).toEqual([SpecialSymbol.BONUS, SpecialSymbol.FREESPIN]);
        });

        it("should not highlight any special symbols when both counts are 0", () => {
            const bonus = { count: 0 };
            const newFreeSpinCount = 0;
            // @ts-ignore
            settlementHandler.handleWinningSpecialSymbols(bonus, newFreeSpinCount);
            expect(slotBoardStore.highlightSpecialSymbols).toEqual([]);
        });
    });

    describe("spinOrAwait", () => {
        let spinSpy: jest.SpyInstance;

        beforeEach(() => {
            // @ts-ignore
            spinSpy = jest.spyOn(settlementHandler, "spin").mockResolvedValue(undefined); // Mock private method
        });

        afterEach(() => {
            spinSpy.mockRestore();
        });

        it("should delay for bonus duration if bonus.count > 0", async () => {
            const bonus = { count: 1 };
            const jackpot = null;
            const result = [1, 2, 3];
            // @ts-ignore
            await settlementHandler.spinOrAwait(bonus, jackpot, result);
            expect(jest.requireMock("db://shared-components/shared/utils").AnimationUtils.delayTime).toHaveBeenCalledWith(
                slotDurationStore.showTotalBonusAmountDuration
            );
            expect(spinSpy).not.toHaveBeenCalled();
        });

        it("should delay for jackpot duration if bonus.count is 0 and jackpot exists", async () => {
            const bonus = { count: 0 };
            const jackpot = { someData: "data" }; // Truthy jackpot object
            const result = [1, 2, 3];
            // @ts-ignore
            await settlementHandler.spinOrAwait(bonus, jackpot, result);
            expect(jest.requireMock("db://shared-components/shared/utils").AnimationUtils.delayTime).toHaveBeenCalledWith(
                slotDurationStore.showJackpotWinningAmountDuration
            );
            expect(spinSpy).not.toHaveBeenCalled();
        });

        it("should call spin if no bonus and no jackpot", async () => {
            const bonus = { count: 0 };
            const jackpot = null;
            const result = [1, 2, 3];
            // @ts-ignore
            await settlementHandler.spinOrAwait(bonus, jackpot, result);
            expect(jest.requireMock("db://shared-components/shared/utils").AnimationUtils.delayTime).not.toHaveBeenCalledWith(
                slotDurationStore.showTotalBonusAmountDuration
            );
            expect(jest.requireMock("db://shared-components/shared/utils").AnimationUtils.delayTime).not.toHaveBeenCalledWith(
                slotDurationStore.showJackpotWinningAmountDuration
            );
            expect(spinSpy).toHaveBeenCalledWith(result);
        });
    });
});
