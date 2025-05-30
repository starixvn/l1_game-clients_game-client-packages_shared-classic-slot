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

const mockDelayTime = jest.fn().mockResolvedValue(undefined);

// Define an enhanced type for the BetControlStore mock instance
interface EnhancedMockedBetControlStore extends jest.Mocked<BetControlStore> {
    totalFreeSpins: number;
    roundId: number; // Mock also defines roundId directly
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
        this.setTotalFreeSpins = jest.fn((count: number) => {
            this.totalFreeSpins = count;
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
        highlightSpecialSymbols: [],
        reset: jest.fn(),
    })),
}));
jest.mock("../../assets/scripts/handlers/stores/slot-duration-store", () => ({
    SlotDurationStore: jest.fn().mockImplementation(() => ({
        jackpotDuration: 500,
        bigWinDuration: 1000,
        freespinDuration: 300,
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
        mockDelayTime.mockClear();
        slotBoardStore.reset.mockClear();
        connectionStore.connection.emit.mockClear();
        if (slotBetHandler.handlePlaceBetFailed) slotBetHandler.handlePlaceBetFailed.mockClear();
        betControlStore.setTotalFreeSpins.mockClear();
        slotBoardStore.slotState = SlotState.NOT_READY;
        slotBoardStore.highlightSpecialSymbols = [];
        slotBoardStore.receivedBigWin = null;
        slotBoardStore.receivedFreeSpins = null;
        betControlStore.totalFreeSpins = 0;
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
    });
});
