import gc from "@sg/game-client-base";
import { Container } from "inversify";
import "reflect-metadata";
import { SlotBetHandler } from "../../assets/scripts/handlers/handlers/slot-bet-handlers";
import { SlotErrorHandler } from "../../assets/scripts/handlers/handlers/slot-error-handler";

// Mock game client base
jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        Error: {
            ...actualGc.Error,
            ErrorHandlers: class MockErrorHandlers {
                eventHandleList: Array<{ name: string; handle: any }> = [];
                handleApiError(apiError: any) {
                    // Mock parent method
                }
            },
            ErrorStore: jest.fn().mockImplementation(() => ({
                apiError: null,
            })),
        },
        Bet: {
            ...actualGc.Bet,
            BetStore: jest.fn().mockImplementation(() => ({
                lastReceivedBet: null,
            })),
        },
        GameServiceMessage: {
            ...actualGc.GameServiceMessage,
            ApiError: {
                eventName: "apiError",
            },
            BetResponse: {
                eventName: "betResponse",
            },
        },
    };
});

// Mock SlotBetHandler
jest.mock("../../assets/scripts/handlers/handlers/slot-bet-handlers", () => ({
    SlotBetHandler: jest.fn().mockImplementation(() => ({
        handlePlaceBetFailed: jest.fn(),
    })),
}));

describe("SlotErrorHandler", () => {
    let container: Container;
    let slotErrorHandler: SlotErrorHandler;
    let mockBetStore: jest.Mocked<gc.Bet.BetStore>;
    let mockSlotBetHandler: jest.Mocked<SlotBetHandler>;

    beforeEach(() => {
        container = new Container();

        // Create mock instances
        const MockedBetStore = jest.requireMock("@sg/game-client-base").Bet.BetStore;
        mockBetStore = new MockedBetStore();

        const MockedSlotBetHandler = jest.requireMock("../../assets/scripts/handlers/handlers/slot-bet-handlers").SlotBetHandler;
        mockSlotBetHandler = new MockedSlotBetHandler();

        // Bind dependencies
        container.bind(SlotErrorHandler).toSelf();
        container.bind(gc.Bet.BetStore).toConstantValue(mockBetStore);
        container.bind(SlotBetHandler).toConstantValue(mockSlotBetHandler);

        // Get instance
        slotErrorHandler = container.get(SlotErrorHandler);

        // Clear mock call counts
        mockSlotBetHandler.handlePlaceBetFailed.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe("eventHandleList", () => {
        it("should have correct event handlers configured", () => {
            expect(slotErrorHandler.eventHandleList).toHaveLength(3);

            // Check first event handler
            expect(slotErrorHandler.eventHandleList[0].name).toBe("apiError");
            expect(slotErrorHandler.eventHandleList[0].handle).toBe(slotErrorHandler.slotHandleApiError);

            // Check second event handler
            expect(slotErrorHandler.eventHandleList[1].name).toBe("notice,betResponse");
            expect(slotErrorHandler.eventHandleList[1].handle).toBe(slotErrorHandler.slotHandleNotice);

            // Check third event handler
            expect(slotErrorHandler.eventHandleList[2].name).toBe("apiError,betResponse");
            expect(slotErrorHandler.eventHandleList[2].handle).toBe(slotErrorHandler.handlePlaceBetError);
        });
    });

    describe("handlePlaceBetError", () => {
        it("should set lastReceivedBet when endBet is -1 and apiError exists", () => {
            // Arrange
            const data = { endBet: -1, apiError: { errorCode: "TEST_ERROR" } };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotErrorHandler.handlePlaceBetError(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toEqual({
                value: -1,
                isAnimated: false,
            });
        });

        it("should not set lastReceivedBet when endBet is not -1", () => {
            // Arrange
            const data = { endBet: 100, apiError: { errorCode: "TEST_ERROR" } };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotErrorHandler.handlePlaceBetError(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toBeNull();
        });

        it("should not set lastReceivedBet when apiError is null", () => {
            // Arrange
            const data = { endBet: -1, apiError: null };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotErrorHandler.handlePlaceBetError(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toBeNull();
        });

        it("should not set lastReceivedBet when apiError is undefined", () => {
            // Arrange
            const data = { endBet: -1, apiError: undefined };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotErrorHandler.handlePlaceBetError(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toBeNull();
        });
    });

    describe("slotHandleApiError", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        it("should handle API error when lastReceivedBet value is -1", () => {
            // Arrange
            const apiError = { errorCode: "API_ERROR" };
            mockBetStore.lastReceivedBet = { value: -1, isAnimated: false };
            const handleApiErrorSpy = jest.spyOn(slotErrorHandler, "handleApiError");

            // Act
            slotErrorHandler.slotHandleApiError(apiError);
            jest.advanceTimersByTime(10);

            // Assert
            expect(handleApiErrorSpy).toHaveBeenCalledWith(apiError);
            expect(mockSlotBetHandler.handlePlaceBetFailed).toHaveBeenCalled();
        });

        it("should store endGameApiError when lastReceivedBet value is not -1", () => {
            // Arrange
            const apiError = { errorCode: "API_ERROR" };
            mockBetStore.lastReceivedBet = { value: 100, isAnimated: true };

            // Act
            slotErrorHandler.slotHandleApiError(apiError);
            jest.advanceTimersByTime(10);

            // Assert
            expect(slotErrorHandler.endGameApiError).toBe(apiError);
            expect(mockSlotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should store endGameApiError when lastReceivedBet is null", () => {
            // Arrange
            const apiError = { errorCode: "API_ERROR" };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotErrorHandler.slotHandleApiError(apiError);
            jest.advanceTimersByTime(10);

            // Assert
            expect(slotErrorHandler.endGameApiError).toBe(apiError);
            expect(mockSlotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should store endGameApiError when lastReceivedBet is undefined", () => {
            // Arrange
            const apiError = { errorCode: "API_ERROR" };
            mockBetStore.lastReceivedBet = undefined;

            // Act
            slotErrorHandler.slotHandleApiError(apiError);
            jest.advanceTimersByTime(10);

            // Assert
            expect(slotErrorHandler.endGameApiError).toBe(apiError);
            expect(mockSlotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });
    });

    describe("handleEndGameApiError", () => {
        it("should handle endGameApiError when it exists", () => {
            // Arrange
            const apiError = { errorCode: "END_GAME_ERROR" };
            slotErrorHandler.endGameApiError = apiError;
            const handleApiErrorSpy = jest.spyOn(slotErrorHandler, "handleApiError");

            // Act
            const result = slotErrorHandler.handleEndGameApiError();

            // Assert
            expect(result).toBe(true);
            expect(handleApiErrorSpy).toHaveBeenCalledWith(apiError);
            expect(mockSlotBetHandler.handlePlaceBetFailed).toHaveBeenCalled();
            expect(slotErrorHandler.endGameApiError).toBeNull();
        });

        it("should return false when endGameApiError is null", () => {
            // Arrange
            slotErrorHandler.endGameApiError = null;

            // Act
            const result = slotErrorHandler.handleEndGameApiError();

            // Assert
            expect(result).toBe(false);
            expect(mockSlotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should return false when endGameApiError is undefined", () => {
            // Arrange
            slotErrorHandler.endGameApiError = undefined;

            // Act
            const result = slotErrorHandler.handleEndGameApiError();

            // Assert
            expect(result).toBe(false);
            expect(mockSlotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });
    });

    describe("slotHandleNotice", () => {
        it("should handle notice when endBet is -1 and errorCode exists", () => {
            // Arrange
            const data = {
                endBet: -1,
                notice: { errorCode: "SB1929" },
            };

            // Act
            slotErrorHandler.slotHandleNotice(data);

            // Assert
            expect(mockSlotBetHandler.handlePlaceBetFailed).toHaveBeenCalledWith(true);
        });

        it("should handle notice with non-SB1929 errorCode", () => {
            // Arrange
            const data = {
                endBet: -1,
                notice: { errorCode: "OTHER_ERROR" },
            };

            // Act
            slotErrorHandler.slotHandleNotice(data);

            // Assert
            expect(mockSlotBetHandler.handlePlaceBetFailed).toHaveBeenCalledWith(false);
        });

        it("should not call handlePlaceBetFailed when endBet is not -1", () => {
            // Arrange
            const data = {
                endBet: 100,
                notice: { errorCode: "SB1929" },
            };

            // Act
            slotErrorHandler.slotHandleNotice(data);

            // Assert
            expect(mockSlotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should not call handlePlaceBetFailed when errorCode is empty", () => {
            // Arrange
            const data = {
                endBet: -1,
                notice: { errorCode: "" },
            };

            // Act
            slotErrorHandler.slotHandleNotice(data);

            // Assert
            expect(mockSlotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should not call handlePlaceBetFailed when errorCode is null", () => {
            // Arrange
            const data = {
                endBet: -1,
                notice: { errorCode: null },
            };

            // Act
            slotErrorHandler.slotHandleNotice(data);

            // Assert
            expect(mockSlotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });

        it("should not call handlePlaceBetFailed when errorCode is undefined", () => {
            // Arrange
            const data = {
                endBet: -1,
                notice: { errorCode: undefined },
            };

            // Act
            slotErrorHandler.slotHandleNotice(data);

            // Assert
            expect(mockSlotBetHandler.handlePlaceBetFailed).not.toHaveBeenCalled();
        });
    });
});
