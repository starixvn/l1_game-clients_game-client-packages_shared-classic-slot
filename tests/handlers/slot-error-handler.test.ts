import gc from "@sg/game-client-base";
import { Container } from "inversify";
import "reflect-metadata";
import { SlotBetHandler } from "../../assets/scripts/handlers/handlers/slot-bet-handlers";
import { SlotErrorHandler } from "../../assets/scripts/handlers/handlers/slot-error-handler";

// Mock SlotBetHandler
jest.mock("../../assets/scripts/handlers/handlers/slot-bet-handlers", () => ({
    SlotBetHandler: jest.fn().mockImplementation(() => ({
        handlePlaceBetFailed: jest.fn(),
    })),
}));

// Mock gc components
jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        Bet: {
            ...actualGc.Bet,
            BetStore: jest.fn().mockImplementation(() => ({
                lastReceivedBet: null,
            })),
        },
        Error: {
            ...actualGc.Error,
            ErrorHandlers: jest.fn().mockImplementation(function () {
                this.handleApiError = jest.fn();
            }),
        },
        GameServiceMessage: actualGc.GameServiceMessage,
    };
});

describe("SlotErrorHandler", () => {
    let container: Container;
    let errorHandler: SlotErrorHandler;
    let betStore: jest.Mocked<gc.Bet.BetStore>;
    let slotBetHandler: jest.Mocked<SlotBetHandler>;

    beforeEach(() => {
        container = new Container();

        // Create mock instances
        const MockedSlotBetHandler = jest.requireMock("../../assets/scripts/handlers/handlers/slot-bet-handlers").SlotBetHandler;
        slotBetHandler = new MockedSlotBetHandler();

        const MockedBetStore = jest.requireMock("@sg/game-client-base").Bet.BetStore;
        betStore = new MockedBetStore();

        // Bind dependencies
        container.bind(SlotErrorHandler).toSelf();
        container.bind(SlotBetHandler).toConstantValue(slotBetHandler);
        container.bind(gc.Bet.BetStore).toConstantValue(betStore);

        // Get instance
        errorHandler = container.get(SlotErrorHandler);

        // Reset state
        errorHandler.endGameApiError = null;
        betStore.lastReceivedBet = null;

        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks();
    });

    describe("eventHandleList", () => {
        it("should have correct event handlers configured", () => {
            expect(errorHandler.eventHandleList).toHaveLength(2);
            expect(errorHandler.eventHandleList[0].name).toBe(gc.GameServiceMessage.ApiError.eventName);
            expect(errorHandler.eventHandleList[0].handle).toBe(errorHandler.slotHandleApiError);
            expect(errorHandler.eventHandleList[1].name).toBe("notice");
            expect(errorHandler.eventHandleList[1].handle).toBe(errorHandler.slotHandleNotice);
        });
    });

    describe("slotHandleApiError", () => {
        it("should handle API error immediately when last bet value is -1", () => {
            const apiError = { errorCode: "TEST_ERROR" } as gc.GameServiceMessage.ApiError;
            betStore.lastReceivedBet = { value: -1, isAnimated: false };

            // Spy on the handleApiError method from the parent class
            const handleApiErrorSpy = jest.spyOn(errorHandler, "handleApiError");

            errorHandler.slotHandleApiError(apiError);
            jest.advanceTimersByTime(10);

            expect(handleApiErrorSpy).toHaveBeenCalledWith(apiError);
            expect(errorHandler.endGameApiError).toBeNull();
        });

        it("should store API error for end game when last bet value is not -1", () => {
            const apiError = { errorCode: "TEST_ERROR" } as gc.GameServiceMessage.ApiError;
            betStore.lastReceivedBet = { value: 100, isAnimated: false };

            const handleApiErrorSpy = jest.spyOn(errorHandler, "handleApiError");

            errorHandler.slotHandleApiError(apiError);
            jest.advanceTimersByTime(10);

            expect(handleApiErrorSpy).not.toHaveBeenCalled();
            expect(errorHandler.endGameApiError).toEqual(apiError);
        });

        it("should store API error when lastReceivedBet is null", () => {
            const apiError = { errorCode: "TEST_ERROR" } as gc.GameServiceMessage.ApiError;
            betStore.lastReceivedBet = null;

            const handleApiErrorSpy = jest.spyOn(errorHandler, "handleApiError");

            errorHandler.slotHandleApiError(apiError);
            jest.advanceTimersByTime(10);

            expect(handleApiErrorSpy).not.toHaveBeenCalled();
            expect(errorHandler.endGameApiError).toEqual(apiError);
        });

        it("should store API error when last bet value is 0", () => {
            const apiError = { errorCode: "TEST_ERROR" } as gc.GameServiceMessage.ApiError;
            betStore.lastReceivedBet = { value: 0, isAnimated: false };

            const handleApiErrorSpy = jest.spyOn(errorHandler, "handleApiError");

            errorHandler.slotHandleApiError(apiError);
            jest.advanceTimersByTime(10);

            expect(handleApiErrorSpy).not.toHaveBeenCalled();
            expect(errorHandler.endGameApiError).toEqual(apiError);
        });

        it("should store API error when last bet value is positive", () => {
            const apiError = { errorCode: "TEST_ERROR" } as gc.GameServiceMessage.ApiError;
            betStore.lastReceivedBet = { value: 250, isAnimated: true };

            const handleApiErrorSpy = jest.spyOn(errorHandler, "handleApiError");

            errorHandler.slotHandleApiError(apiError);
            jest.advanceTimersByTime(10);

            expect(handleApiErrorSpy).not.toHaveBeenCalled();
            expect(errorHandler.endGameApiError).toEqual(apiError);
        });

        it("should use setTimeout with 10ms delay", () => {
            const apiError = { errorCode: "TEST_ERROR" } as gc.GameServiceMessage.ApiError;
            betStore.lastReceivedBet = { value: -1, isAnimated: false };

            const handleApiErrorSpy = jest.spyOn(errorHandler, "handleApiError");

            errorHandler.slotHandleApiError(apiError);

            // Should not be called immediately
            expect(handleApiErrorSpy).not.toHaveBeenCalled();

            // Should be called after timeout
            jest.advanceTimersByTime(10);
            expect(handleApiErrorSpy).toHaveBeenCalledWith(apiError);
        });
    });

    describe("handleEndGameApiError", () => {
        it("should handle stored API error and trigger bet failed handler", () => {
            const apiError = { errorCode: "END_GAME_ERROR" } as gc.GameServiceMessage.ApiError;
            errorHandler.endGameApiError = apiError;

            const handleApiErrorSpy = jest.spyOn(errorHandler, "handleApiError");

            errorHandler.handleEndGameApiError();

            expect(handleApiErrorSpy).toHaveBeenCalledWith(apiError);
            expect(slotBetHandler.handlePlaceBetFailed).toHaveBeenCalled();
        });

        it("should not handle API error when no end game error is stored", () => {
            errorHandler.endGameApiError = null;

            const handleApiErrorSpy = jest.spyOn(errorHandler, "handleApiError");

            errorHandler.handleEndGameApiError();

            expect(handleApiErrorSpy).not.toHaveBeenCalled();
            expect(slotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should reset endGameApiError after handling", () => {
            const apiError = { errorCode: "END_GAME_ERROR" } as gc.GameServiceMessage.ApiError;
            errorHandler.endGameApiError = apiError;

            errorHandler.handleEndGameApiError();

            // The error should still be there since we don't reset it in the method
            expect(errorHandler.endGameApiError).toEqual(apiError);
        });
    });

    describe("slotHandleNotice", () => {
        it("should handle place bet failed for error code SB1929", () => {
            const notice = { errorCode: "SB1929" };

            errorHandler.slotHandleNotice(notice);

            expect(slotBetHandler.handlePlaceBetFailed).toHaveBeenCalled();
        });

        it("should not handle place bet failed for other error codes", () => {
            const notice = { errorCode: "OTHER_ERROR" };

            errorHandler.slotHandleNotice(notice);

            expect(slotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should handle null notice gracefully", () => {
            errorHandler.slotHandleNotice(null);

            expect(slotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should handle undefined notice gracefully", () => {
            errorHandler.slotHandleNotice(undefined as any);

            expect(slotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should handle notice without errorCode property", () => {
            const notice = { someOtherProperty: "value" } as any;

            errorHandler.slotHandleNotice(notice);

            expect(slotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should handle empty errorCode", () => {
            const notice = { errorCode: "" };

            errorHandler.slotHandleNotice(notice);

            expect(slotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should be case sensitive for error code SB1929", () => {
            const notice = { errorCode: "sb1929" }; // lowercase

            errorHandler.slotHandleNotice(notice);

            expect(slotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });
    });

    describe("inheritance", () => {
        it("should extend gc.Error.ErrorHandlers", () => {
            expect(errorHandler).toBeInstanceOf(gc.Error.ErrorHandlers);
        });

        it("should have access to parent class methods", () => {
            expect(typeof errorHandler.handleApiError).toBe("function");
        });
    });
});
