import gc from "@sg/game-client-base";
import { Container } from "inversify";
import "reflect-metadata";
import { SlotBetResponseHandler } from "../../assets/scripts/handlers/handlers/slot-bet-response-handlers";

// Mock gc components
jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        Bet: {
            ...actualGc.Bet,
            BetStore: jest.fn().mockImplementation(() => ({
                isProcessingBet: false,
                lastReceivedBet: null,
            })),
        },
        Connection: {
            ...actualGc.Connection,
            ConnectionHandlers: {
                ...actualGc.Connection.ConnectionHandlers,
                RetryGameHandler: jest.fn().mockImplementation(() => ({
                    clearInterval: jest.fn(),
                })),
            },
        },
    };
});

describe("SlotBetResponseHandler", () => {
    let container: Container;
    let slotBetResponseHandler: SlotBetResponseHandler;
    let mockBetStore: jest.Mocked<gc.Bet.BetStore>;
    let mockRetryGameHandler: jest.Mocked<gc.Connection.ConnectionHandlers.RetryGameHandler>;

    beforeEach(() => {
        container = new Container();

        // Create mock instances
        const MockedBetStore = jest.requireMock("@sg/game-client-base").Bet.BetStore;
        mockBetStore = new MockedBetStore();

        const MockedRetryGameHandler = jest.requireMock("@sg/game-client-base").Connection.ConnectionHandlers.RetryGameHandler;
        mockRetryGameHandler = new MockedRetryGameHandler();

        // Bind dependencies
        container.bind(SlotBetResponseHandler).toSelf();
        container.bind(gc.Bet.BetStore).toConstantValue(mockBetStore);
        container.bind(gc.Connection.ConnectionHandlers.RetryGameHandler).toConstantValue(mockRetryGameHandler);

        // Get instance
        slotBetResponseHandler = container.get(SlotBetResponseHandler);

        // Clear mock call counts that might be invoked during setup
        mockRetryGameHandler.clearInterval.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("eventHandleList", () => {
        it("should have correct event handlers configured", () => {
            expect(slotBetResponseHandler.eventHandleList).toHaveLength(1);
            expect(slotBetResponseHandler.eventHandleList[0].name).toBe("endBet,freeSpin");
            expect(slotBetResponseHandler.eventHandleList[0].handle).toBe(slotBetResponseHandler.handleSlotBetResponse);
        });
    });

    describe("stopProcessingBetAndClearInterval", () => {
        it("should stop processing bet and clear retry interval", () => {
            // Arrange
            mockBetStore.isProcessingBet = true;

            // Act
            slotBetResponseHandler.stopProcessingBetAndClearInterval();

            // Assert
            expect(mockBetStore.isProcessingBet).toBe(false);
            expect(mockRetryGameHandler.clearInterval).toHaveBeenCalled();
        });
    });

    describe("handleSlotBetResponse", () => {
        it("should return early when data is null", () => {
            // Arrange
            const stopProcessingSpy = jest.spyOn(slotBetResponseHandler, "stopProcessingBetAndClearInterval");

            // Act
            slotBetResponseHandler.handleSlotBetResponse(null as any);

            // Assert
            expect(stopProcessingSpy).not.toHaveBeenCalled();
        });

        it("should return early when data is undefined", () => {
            // Arrange
            const stopProcessingSpy = jest.spyOn(slotBetResponseHandler, "stopProcessingBetAndClearInterval");

            // Act
            slotBetResponseHandler.handleSlotBetResponse(undefined as any);

            // Assert
            expect(stopProcessingSpy).not.toHaveBeenCalled();
        });

        it("should stop processing and clear interval when data is valid", () => {
            // Arrange
            const data = { endBet: 100, freeSpin: false };
            const stopProcessingSpy = jest.spyOn(slotBetResponseHandler, "stopProcessingBetAndClearInterval");

            // Act
            slotBetResponseHandler.handleSlotBetResponse(data);

            // Assert
            expect(stopProcessingSpy).toHaveBeenCalled();
        });

        it("should return early when endBet is undefined", () => {
            // Arrange
            const data = { endBet: undefined as any, freeSpin: false };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotBetResponseHandler.handleSlotBetResponse(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toBeNull();
        });

        it("should return early when freeSpin is undefined", () => {
            // Arrange
            const data = { endBet: 100, freeSpin: undefined as any };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotBetResponseHandler.handleSlotBetResponse(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toBeNull();
        });

        it("should set lastReceivedBet when endBet is not -1 and freeSpin is false", () => {
            // Arrange
            const data = { endBet: 250, freeSpin: false };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotBetResponseHandler.handleSlotBetResponse(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toEqual({
                value: 250,
                isAnimated: true,
            });
        });

        it("should not set lastReceivedBet when endBet is -1", () => {
            // Arrange
            const data = { endBet: -1, freeSpin: false };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotBetResponseHandler.handleSlotBetResponse(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toBeNull();
        });

        it("should not set lastReceivedBet when freeSpin is true", () => {
            // Arrange
            const data = { endBet: 100, freeSpin: true };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotBetResponseHandler.handleSlotBetResponse(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toBeNull();
        });

        it("should not set lastReceivedBet when endBet is -1 and freeSpin is true", () => {
            // Arrange
            const data = { endBet: -1, freeSpin: true };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotBetResponseHandler.handleSlotBetResponse(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toBeNull();
        });

        it("should handle zero endBet value correctly when freeSpin is false", () => {
            // Arrange
            const data = { endBet: 0, freeSpin: false };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotBetResponseHandler.handleSlotBetResponse(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toEqual({
                value: 0,
                isAnimated: true,
            });
        });

        it("should handle large endBet value correctly when freeSpin is false", () => {
            // Arrange
            const data = { endBet: 999999, freeSpin: false };
            mockBetStore.lastReceivedBet = null;

            // Act
            slotBetResponseHandler.handleSlotBetResponse(data);

            // Assert
            expect(mockBetStore.lastReceivedBet).toEqual({
                value: 999999,
                isAnimated: true,
            });
        });
    });
});
