// should be the first import
import gc from "@sg/game-client-base";
import { FSBPromotionUIHandler } from "db://shared-common-slot/fsb-promotion/scripts/handlers/fsb-promotion-ui-handler";
import { FSBPromotionUIStore } from "db://shared-common-slot/fsb-promotion/scripts/stores/fsb-promotion-ui-store";
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
    freeSpinCount: number;
    roundId: number; // Mock also defines roundId directly
    autoSpinEnabled: boolean;
    freeSpinEnabled: boolean;
    turboEnabled: boolean;
    triggerAutoSpin: boolean;
    stake: number;
    freeSpinStake: number;
    isFreeSpinEffectCompleted: boolean;
    isReadyBet: boolean; // Add missing property
    // Methods like setTotalFreeSpins, decreaseFreeSpinCount, etc., are part of jest.Mocked<BetControlStore>
    // if they are actual methods of BetControlStore.
    // The mock implementation below adds them as jest.fn() properties on the instance.
    setTotalFreeSpins: jest.Mock<any, [number]>;
    decreaseFreeSpinCount: jest.Mock;
    clearFreeSpins: jest.Mock;
    syncFreeSpinCount: jest.Mock;
    setFreeSpinStake: jest.Mock;
    get turboEnabledOnSpin(): boolean;
}

jest.mock(
    "db://shared-components/shared/utils",
    () => ({
        AnimationUtils: {
            delayTime: jest.fn().mockResolvedValue(undefined),
        },
        FunctionUtils: {
            waitUntil: jest.fn().mockResolvedValue(undefined),
        },
    }),
    { virtual: true }
);

jest.mock("../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(function (this: any) {
        this.roundId = -1;
        this.totalFreeSpins = 0;
        this.freeSpinCount = 0;
        this.autoSpinEnabled = false;
        this.freeSpinEnabled = false;
        this.turboEnabled = false;
        this.triggerAutoSpin = false;
        this.stake = 100;
        this.freeSpinStake = -1;
        this.isFreeSpinEffectCompleted = false;
        this.isReadyBet = true; // Add missing property

        this.setTotalFreeSpins = jest.fn((count: number) => {
            this.totalFreeSpins = count;
        });
        this.decreaseFreeSpinCount = jest.fn();
        this.clearFreeSpins = jest.fn();
        this.syncFreeSpinCount = jest.fn();
        this.setFreeSpinStake = jest.fn((stake: number) => {
            this.freeSpinStake = stake;
        });

        // Add getter for turboEnabledOnSpin
        Object.defineProperty(this, "turboEnabledOnSpin", {
            get: jest.fn(() => this.turboEnabled || this.triggerAutoSpin),
            configurable: true,
        });

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
        receivedBonus: null,
        highlightSpecialSymbols: [],
        clearSettlement: jest.fn(),
        resetToReady: jest.fn(),
        winningBet: 0, // Added property
        forceStopSettle: false,
        spinResult: {
            result: [],
            duration: 0,
            turbo: false,
            onComplete: () => { },
        },
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
        bonusDuration: 300,
        transitionDuration: 100,
    })),
}));
jest.mock("../../assets/scripts/handlers/handlers/slot-bet-handlers", () => ({
    SlotBetHandler: jest.fn().mockImplementation(() => ({
        handlePlaceBetFailed: jest.fn(),
        callBet: jest.fn(),
        actionAutoSpin: jest.fn(),
    })),
}));
jest.mock("../../assets/scripts/handlers/handlers/slot-error-handler", () => ({
    SlotErrorHandler: jest.fn().mockImplementation(() => ({
        handleEndGameApiError: jest.fn(),
    })),
}));

// Mock FSB Promotion dependencies
jest.mock("db://shared-common-slot/fsb-promotion/scripts/handlers/fsb-promotion-ui-handler", () => ({
    FSBPromotionUIHandler: class MockFSBPromotionUIHandler {
        updateTotalWin = jest.fn();
        changeUIPendingEvent = jest.fn();
        tryShowEndedPopup = jest.fn();
        openPromotionInfo = jest.fn();
        setShowFreeSpinMessage = jest.fn();
        tryConsumeFSB = jest.fn();
    },
}));

jest.mock("db://shared-common-slot/fsb-promotion/scripts/stores/fsb-promotion-ui-store", () => ({
    FreeSpinSource: {
        BONUS: "BONUS"
    },
    FreeSpinsPromotionEvents: {
        FREE_SPIN: "FREE_SPIN",
        OPEN_PROMOTION_INFO: "OPEN_PROMOTION_INFO"
    },
    FSBPromotionUIStore: class MockFSBPromotionUIStore {
        isSpinningFSB = false;
        isShowFreeSpinMessage = false;
        isFSBInfoReady = false;
        resumedFSBPromotion = false;

        get canSpinNextFSB() {
            return false;
        }
    },
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
        Auth: {
            ...actualGc.Auth,
            AuthHandlers: {
                GetBalance: jest.fn().mockImplementation(() => ({
                    handle: jest.fn(),
                })),
            },
        },
        Player: {
            ...actualGc.Player,
            MainPlayerStore: jest.fn().mockImplementation(() => ({
                rate: 1,
            })),
        },
        NumberUtils: {
            ...actualGc.NumberUtils,
            getValueByCurrency: jest.fn((amount: number, rate: number) => amount * rate),
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
            stop: jest.fn(),
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
    let mainPlayerStore: jest.Mocked<gc.Player.MainPlayerStore>;
    let getBalanceHandler: jest.Mocked<gc.Auth.AuthHandlers.GetBalance>;
    let fsbPromotionUIHandler: jest.Mocked<FSBPromotionUIHandler>;
    let fsbPromotionUIStore: jest.Mocked<FSBPromotionUIStore>;

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

        const MockedMainPlayerStore = jest.requireMock("@sg/game-client-base").Player.MainPlayerStore;
        mainPlayerStore = new MockedMainPlayerStore();
        container.bind(gc.Player.MainPlayerStore).toConstantValue(mainPlayerStore);

        const MockedGetBalanceHandler = jest.requireMock("@sg/game-client-base").Auth.AuthHandlers.GetBalance;
        getBalanceHandler = new MockedGetBalanceHandler();
        container.bind(gc.Auth.AuthHandlers.GetBalance).toConstantValue(getBalanceHandler);

        const MockedFSBPromotionUIHandler = jest.requireMock("db://shared-common-slot/fsb-promotion/scripts/handlers/fsb-promotion-ui-handler").FSBPromotionUIHandler;
        fsbPromotionUIHandler = new MockedFSBPromotionUIHandler();
        container.bind(FSBPromotionUIHandler).toConstantValue(fsbPromotionUIHandler);

        const MockedFSBPromotionUIStore = jest.requireMock("db://shared-common-slot/fsb-promotion/scripts/stores/fsb-promotion-ui-store").FSBPromotionUIStore;
        fsbPromotionUIStore = new MockedFSBPromotionUIStore();
        container.bind(FSBPromotionUIStore).toConstantValue(fsbPromotionUIStore);

        settlementHandler = container.get(SlotSettlementHandler);

        jest.useFakeTimers();
        jest.requireMock("db://shared-components/shared/utils").AnimationUtils.delayTime.mockClear();
        slotBoardStore.clearSettlement.mockClear();
        slotBoardStore.resetToReady.mockClear();
        connectionStore.connection.emit.mockClear();
        if (slotBetHandler.handlePlaceBetFailed) slotBetHandler.handlePlaceBetFailed.mockClear();
        if (slotBetHandler.callBet) slotBetHandler.callBet.mockClear();
        if (slotBetHandler.actionAutoSpin) slotBetHandler.actionAutoSpin.mockClear();
        betControlStore.setTotalFreeSpins.mockClear();
        betControlStore.decreaseFreeSpinCount.mockClear();
        betControlStore.clearFreeSpins.mockClear();
        betControlStore.syncFreeSpinCount.mockClear();
        betControlStore.setFreeSpinStake.mockClear();
        getBalanceHandler.handle.mockClear();
        (gc.NumberUtils.getValueByCurrency as jest.Mock).mockClear();
        fsbPromotionUIHandler.updateTotalWin.mockClear();
        fsbPromotionUIHandler.changeUIPendingEvent.mockClear();
        fsbPromotionUIHandler.tryShowEndedPopup.mockClear();
        fsbPromotionUIHandler.openPromotionInfo.mockClear();
        fsbPromotionUIHandler.setShowFreeSpinMessage.mockClear();
        fsbPromotionUIHandler.tryConsumeFSB.mockClear();

        slotBoardStore.slotState = SlotState.NOT_READY;
        slotBoardStore.highlightSpecialSymbols = [];
        slotBoardStore.receivedBigWin = null;
        slotBoardStore.receivedFreeSpins = null;
        slotBoardStore.receivedBonus = null;
        slotBoardStore.winningBet = -1; // Set to a sentinel value

        betControlStore.totalFreeSpins = 0;
        betControlStore.freeSpinStake = -1;
        betControlStore.isReadyBet = true; // Set to true by default for tests
        // Properties like autoSpinEnabled are set by the mock constructor, no need to reset here unless for a specific test.
        betStore.lastReceivedBet = null;
        errorStore.apiError = null;
        mainPlayerStore.rate = 1;
        fsbPromotionUIStore.isSpinningFSB = false;
        fsbPromotionUIStore.isShowFreeSpinMessage = false;
        fsbPromotionUIStore.isFSBInfoReady = false;
        fsbPromotionUIStore.resumedFSBPromotion = false;
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks();
    });

    describe("reset", () => {
        it("should clear timeouts and reset board store", () => {
            const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
            const resetSpy = jest.spyOn(slotBoardStore, "clearSettlement");

            settlementHandler.timeoutNextSpin = {} as any;
            settlementHandler.clearSettlement();

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
        it("should update winningJackpot in board store with currency conversion", () => {
            const winningJackpot = { amount: 1000, winnerName: "John Doe", pool: "minor" };
            settlementHandler.handleWinningJackpot(winningJackpot);
            expect(gc.NumberUtils.getValueByCurrency).toHaveBeenCalledWith(1000, 1);
            expect(slotBoardStore.winningJackpot).toEqual({
                winnerName: "John Doe",
                pool: "minor",
                amount: 1000, // amount * rate = 1000 * 1
            });
        });
    });

    describe("handleJackpot", () => {
        it("should process jackpot win correctly", async () => {
            // Mock the spin method to resolve immediately
            const spinSpy = jest.spyOn(settlementHandler as any, "spin").mockResolvedValue(undefined);

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

            spinSpy.mockRestore();
        });
    });

    describe("handleBonuses", () => {
        it("should handle bonuses with jackpot delay when jackpot exists", async () => {
            const bonuses = { bonus: { count: 1 }, roundId: 1, result: [1, 2, 3] };
            slotBoardStore.receivedJackpot = { jackpot: {}, duration: 1000 };

            await settlementHandler.handleBonuses(bonuses);

            expect(jest.requireMock("db://shared-components/shared/utils").AnimationUtils.delayTime).toHaveBeenCalledWith(
                slotDurationStore.showJackpotWinningAmountDuration
            );
            expect(slotBoardStore.receivedBonus).toEqual({
                bonus: bonuses.bonus,
                duration: slotDurationStore.bonusDuration,
            });
        });

        it("should handle bonuses without jackpot delay when no jackpot", async () => {
            // Mock the spin method to resolve immediately
            const spinSpy = jest.spyOn(settlementHandler as any, "spin").mockResolvedValue(undefined);

            const bonuses = { bonus: { count: 1 }, roundId: 1, result: [1, 2, 3] };
            slotBoardStore.receivedJackpot = null;

            await settlementHandler.handleBonuses(bonuses);

            expect(jest.requireMock("db://shared-components/shared/utils").AnimationUtils.delayTime).not.toHaveBeenCalledWith(
                slotDurationStore.showJackpotWinningAmountDuration
            );
            expect(slotBoardStore.receivedBonus).toEqual({
                bonus: bonuses.bonus,
                duration: slotDurationStore.bonusDuration,
            });

            spinSpy.mockRestore();
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
            // Mock the spin method to resolve immediately
            const spinSpy = jest.spyOn(settlementHandler as any, "spin").mockResolvedValue(undefined);

            const finish = createFinishData();
            await settlementHandler.handleFinish(finish as any);

            expect(slotBoardStore.slotState).toBe(SlotState.SETTLED);
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);
            expect(betControlStore.roundId).toBe(finish.roundId);

            spinSpy.mockRestore();
        });

        it("should handle big win scenario", async () => {
            // Mock the spin method to resolve immediately
            const spinSpy = jest.spyOn(settlementHandler as any, "spin").mockResolvedValue(undefined);
            const finish = createFinishData({ bigWin: true, betWin: 1000 });
            // @ts-ignore
            const createTweenShowBigWinSpy = jest.spyOn(settlementHandler, "createTweenShowBigWin");
            await settlementHandler.handleFinish(finish as any);

            expect(betControlStore.roundId).toBe(finish.roundId);
            expect(createTweenShowBigWinSpy).toHaveBeenCalledWith(finish.betWin, finish.bigWin);

            spinSpy.mockRestore();
        });

        it("should handle free spins win scenario", async () => {
            // Mock the spin method to resolve immediately
            const spinSpy = jest.spyOn(settlementHandler as any, "spin").mockResolvedValue(undefined);

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

            spinSpy.mockRestore();
        });

        it("should set winningBet to 0 if betWin is 0, even with other special conditions", async () => {
            // Mock the spin method to resolve immediately
            const spinSpy = jest.spyOn(settlementHandler as any, "spin").mockResolvedValue(undefined);

            const finish = createFinishData({
                betWin: 0,
                settlementResult: { freeSpins: { count: 5 } }, // e.g., won free spins but betWin is 0
                totalOfFreeSpins: 5,
            });

            await settlementHandler.handleFinish(finish as any);

            // Directly check if winningBet is set to 0 after initial processing in handleFinish
            // This happens before the tweens complete for showing big wins or free spins.
            expect(slotBoardStore.winningBet).toBe(0);

            spinSpy.mockRestore();
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
            expect(fsbPromotionUIHandler.updateTotalWin).toHaveBeenCalledWith({
                win: betWin,
                totalFreeSpins: betControlStore.freeSpinCount
            });
            expect(slotBoardStore.resetToReady).toHaveBeenCalled();
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
            expect(fsbPromotionUIHandler.updateTotalWin).toHaveBeenCalledWith({
                win: betWin,
                totalFreeSpins: betControlStore.freeSpinCount
            });
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
            expect(showWinningLinesSpy).not.toHaveBeenCalledWith(betWin, bigWin, jackpot, mockWinningLines);
            expect(createTweenShowBigWinSpy).not.toHaveBeenCalled();
            expect(createTweenShowFreeSpinsSpy).toHaveBeenCalledWith(mockFreeSpins);

            // Advance timers past free spin duration
            jest.advanceTimersByTime(slotDurationStore.freespinDuration);
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);

            jest.runAllTimers();
            expect(finishSettlementSpy).toHaveBeenCalled();
            expect(fsbPromotionUIHandler.updateTotalWin).toHaveBeenCalledWith({
                win: betWin,
                totalFreeSpins: betControlStore.freeSpinCount
            });
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
            expect(showWinningLinesSpy).not.toHaveBeenCalled();
            expect(createTweenShowBigWinSpy).not.toHaveBeenCalledWith(betWin, bigWin);

            jest.advanceTimersByTime(slotDurationStore.bigWinDuration);
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SETTLED);
            expect(createTweenShowFreeSpinsSpy).toHaveBeenCalledWith({ ...mockFreeSpins, count: newFreeSpinCount });

            jest.runAllTimers();
            expect(fsbPromotionUIHandler.updateTotalWin).toHaveBeenCalledWith({
                win: betWin,
                totalFreeSpins: betControlStore.freeSpinCount
            });
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
            expect(fsbPromotionUIHandler.updateTotalWin).toHaveBeenCalledWith({
                win: betWin,
                totalFreeSpins: betControlStore.freeSpinCount
            });
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

    describe("createTweenShowFreeSpins", () => {
        it("should create tween that sets free spin state and calls setFreeSpinStake", () => {
            const freeSpins = { count: 5, data: {} };

            // @ts-ignore
            const tween = settlementHandler.createTweenShowFreeSpins(freeSpins);

            // Execute the tween to trigger the callbacks
            tween.start();

            expect(slotBoardStore.highlightSpecialSymbols).toEqual([SpecialSymbol.FREESPIN]);
            expect(slotBoardStore.receivedFreeSpins).toEqual({
                freeSpins,
                duration: slotDurationStore.freespinDuration,
            });
            expect(betControlStore.setFreeSpinStake).toHaveBeenCalledWith(betControlStore.stake);
            expect(betControlStore.syncFreeSpinCount).toHaveBeenCalled();
        });
    });

    describe("createTweenShowBigWin", () => {
        it("should create tween that sets big win state and calls updateWinningBet", () => {
            const betWin = 1000;
            const bigWin = true;

            // @ts-ignore
            const tween = settlementHandler.createTweenShowBigWin(betWin, bigWin);

            // Execute the tween to trigger the callbacks
            tween.start();

            expect(slotBoardStore.receivedBigWin).toEqual({
                amount: betWin,
                bigWin,
                duration: slotDurationStore.bigWinDuration,
                showBigWinValue: slotDurationStore.showBigWinValueDuration,
                delayShowBigWinValue: slotDurationStore.delayShowBigWinValue,
            });
            expect(getBalanceHandler.handle).toHaveBeenCalled();
        });
    });

    describe("showWinningLines", () => {
        it("should update winning bet and set winning lines", () => {
            const betWin = 100;
            const bigWin = false;
            const jackpot = null;
            const winningLines = [{ payline: 0, positions: [0, 1, 2], symbol: "A" }];

            // @ts-ignore
            settlementHandler.showWinningLines(betWin, bigWin, jackpot, winningLines);

            expect(slotBoardStore.winningBet).toBe(betWin);
            expect(getBalanceHandler.handle).toHaveBeenCalled();
            expect(slotBoardStore.winningLines).toEqual(winningLines);
        });

        it("should not update winning bet for big wins", () => {
            const betWin = 1000;
            const bigWin = true;
            const jackpot = null;
            const winningLines = [{ payline: 0, positions: [0, 1, 2], symbol: "A" }];

            // @ts-ignore
            settlementHandler.showWinningLines(betWin, bigWin, jackpot, winningLines);

            expect(getBalanceHandler.handle).not.toHaveBeenCalled();
            expect(slotBoardStore.winningLines).toEqual(winningLines);
        });

        it("should include jackpot line when jackpot exists", () => {
            const betWin = 100;
            const bigWin = false;
            const jackpot = { winningLine: 1, positions: [3, 4, 5], symbol: "WILD" };
            const winningLines = [{ payline: 0, positions: [0, 1, 2], symbol: "A" }];

            // @ts-ignore
            settlementHandler.showWinningLines(betWin, bigWin, jackpot, winningLines);

            expect(slotBoardStore.winningLines).toEqual([
                { payline: 1, positions: [3, 4, 5], symbol: "WILD" },
                { payline: 0, positions: [0, 1, 2], symbol: "A" },
            ]);
        });
    });

    describe("handleFreeSpins", () => {
        it("should set free spin stake and count when total > 0", () => {
            const freeSpins = { total: 5, bet: 50 };

            settlementHandler.handleFreeSpins(freeSpins);

            expect(betControlStore.setFreeSpinStake).toHaveBeenCalledWith(50);
            expect(betControlStore.setTotalFreeSpins).toHaveBeenCalledWith(5);
            expect(betControlStore.syncFreeSpinCount).toHaveBeenCalled();
        });

        it("should not set anything when total is 0", () => {
            const freeSpins = { total: 0, bet: 50 };

            settlementHandler.handleFreeSpins(freeSpins);

            expect(betControlStore.setFreeSpinStake).not.toHaveBeenCalled();
            expect(betControlStore.setTotalFreeSpins).not.toHaveBeenCalled();
            expect(betControlStore.syncFreeSpinCount).not.toHaveBeenCalled();
        });
    });

    describe("checkSpinNextRound", () => {
        it("should call bet for free spins when free spin enabled", () => {
            betControlStore.freeSpinEnabled = true;

            // @ts-ignore
            settlementHandler.checkSpinNextRound();

            // Advance timers to trigger the setTimeout callback
            jest.advanceTimersByTime(1000);

            expect(slotBetHandler.callBet).toHaveBeenCalled();
        });

        it("should clear free spins and call auto spin when auto spin enabled", () => {
            betControlStore.freeSpinEnabled = false;
            betControlStore.autoSpinEnabled = true;

            // @ts-ignore
            settlementHandler.checkSpinNextRound();

            // Advance timers to trigger the setTimeout callback
            jest.advanceTimersByTime(1000);

            expect(betControlStore.clearFreeSpins).toHaveBeenCalled();
            expect(slotBetHandler.actionAutoSpin).toHaveBeenCalled();
        });

        it("should clear free spins and call bet when trigger auto spin", () => {
            betControlStore.freeSpinEnabled = false;
            betControlStore.autoSpinEnabled = false;
            betControlStore.triggerAutoSpin = true;

            // @ts-ignore
            settlementHandler.checkSpinNextRound();

            // Advance timers to trigger the setTimeout callback
            jest.advanceTimersByTime(1000);

            expect(betControlStore.clearFreeSpins).toHaveBeenCalled();
            expect(slotBetHandler.callBet).toHaveBeenCalled();
        });

        it("should handle FSB promotion when isShowFreeSpinMessage is true", () => {
            betControlStore.freeSpinEnabled = false;
            betControlStore.autoSpinEnabled = false;
            betControlStore.triggerAutoSpin = false;
            fsbPromotionUIStore.isShowFreeSpinMessage = true;

            // @ts-ignore
            settlementHandler.checkSpinNextRound();

            expect(fsbPromotionUIHandler.changeUIPendingEvent).toHaveBeenCalledWith("OPEN_PROMOTION_INFO");
            expect(betControlStore.isFreeSpinEffectCompleted).toBe(true);
        });
    });

    describe("handleUpdateBalance", () => {
        it("should call getBalanceHandler when changeUserBalance is true", () => {
            settlementHandler.handleUpdateBalance(true);
            expect(getBalanceHandler.handle).toHaveBeenCalled();
        });

        it("should not call getBalanceHandler when changeUserBalance is false", () => {
            settlementHandler.handleUpdateBalance(false);
            expect(getBalanceHandler.handle).not.toHaveBeenCalled();
        });
    });

    describe("spinResultSpecialCase", () => {
        it("should set roundId and call spin", async () => {
            const data = { roundId: 123, result: [1, 2, 3] };

            // @ts-ignore
            const spinSpy = jest.spyOn(settlementHandler, "spin").mockResolvedValue(undefined);

            // @ts-ignore
            await settlementHandler.spinResultSpecialCase(data);

            expect(betControlStore.roundId).toBe(123);
            expect(spinSpy).toHaveBeenCalledWith([1, 2, 3]);

            spinSpy.mockRestore();
        });
    });

    describe("scheduleNextSpin", () => {
        it("should schedule action after delay", () => {
            const mockAction = jest.fn();

            // @ts-ignore
            settlementHandler.scheduleNextSpin(mockAction);

            expect(settlementHandler.timeoutNextSpin).toBeDefined();
            expect(mockAction).not.toHaveBeenCalled();

            // Advance timers to trigger the setTimeout callback
            jest.advanceTimersByTime(1000);

            expect(mockAction).toHaveBeenCalled();
        });
    });

    describe("spin", () => {
        it("should set FSB spinning state and call onComplete", async () => {
            const result = [1, 2, 3];

            // @ts-ignore
            const promise = settlementHandler.spin(result);

            expect(fsbPromotionUIStore.isSpinningFSB).toBe(true);
            expect(slotBoardStore.slotState).toBe(SlotState.SPINNING);
            expect(betControlStore.decreaseFreeSpinCount).toHaveBeenCalled();
            expect(slotBoardStore.spinResult).toEqual({
                result,
                duration: slotDurationStore.spinDuration,
                turbo: betControlStore.turboEnabledOnSpin,
                onComplete: expect.any(Function)
            });

            // Trigger onComplete callback
            slotBoardStore.spinResult.onComplete();
            await promise;

            expect(slotBoardStore.slotState).toBe(SlotState.SPIN_DONE);
            expect(fsbPromotionUIStore.isSpinningFSB).toBe(false);
        });
    });

    describe("finishSettlement", () => {
        it("should call clearSettlement", () => {
            const clearSettlementSpy = jest.spyOn(settlementHandler, "clearSettlement");

            // @ts-ignore
            settlementHandler.finishSettlement();

            expect(clearSettlementSpy).toHaveBeenCalled();

            clearSettlementSpy.mockRestore();
        });
    });
});
