import gc from "@sg/game-client-base";
import { Container } from "inversify";
import "reflect-metadata";
import { SlotBetResponseHandler } from "../../assets/scripts/handlers/handlers/slot-bet-response-handlers";
import { BetControlStore } from "../../assets/scripts/handlers/stores/bet-control-store";

// Mock BetControlStore
jest.mock("../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(() => ({})), // Add properties if needed by the handler
}));

// Mock gc components (BetStore, RetryGameHandler)
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
    let betResponseHandler: SlotBetResponseHandler;
    let betControlStore: jest.Mocked<BetControlStore>;
    let betStore: jest.Mocked<gc.Bet.BetStore>;
    let retryGameHandler: jest.Mocked<gc.Connection.ConnectionHandlers.RetryGameHandler>;

    beforeEach(() => {
        container = new Container();

        // Bind dependencies
        container.bind(SlotBetResponseHandler).toSelf();
        // Use toConstantValue for mocked stores/handlers
        container
            .bind(BetControlStore)
            .toConstantValue(new (jest.requireMock("../../assets/scripts/handlers/stores/bet-control-store").BetControlStore)());
        const MockedBetStore = jest.requireMock("@sg/game-client-base").Bet.BetStore;
        betStore = new MockedBetStore();
        container.bind(gc.Bet.BetStore).toConstantValue(betStore);

        const MockedRetryGameHandler = jest.requireMock("@sg/game-client-base").Connection.ConnectionHandlers.RetryGameHandler;
        retryGameHandler = new MockedRetryGameHandler();
        container.bind(gc.Connection.ConnectionHandlers.RetryGameHandler).toConstantValue(retryGameHandler);

        // Get instances
        betResponseHandler = container.get(SlotBetResponseHandler);
        betControlStore = container.get(BetControlStore) as jest.Mocked<BetControlStore>;
        // betStore and retryGameHandler are already instantiated and typed correctly above

        // Assign mocked dependencies to the handler instance if they are injected as properties
        // This step is crucial if the handler directly accesses properties of these dependencies.
        // If dependencies are only used via method calls on instances obtained from the container, this might not be strictly necessary
        // but it's safer to ensure the handler uses the exact mocked instances we control in the test.
        Object.assign(betResponseHandler, {
            betControlStore, // Assuming it's injected or assigned
            betStore, // Assuming it's injected or assigned
            retryGameHandler, // Assuming it's injected or assigned
        });

        // Clear mocks that might be called in constructor or globally before each test
        retryGameHandler.clearInterval.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("eventHandleList", () => {
        it("should have correct event handler configured", () => {
            expect(betResponseHandler.eventHandleList).toHaveLength(1);
            expect(betResponseHandler.eventHandleList[0].name).toBe("endBet,freeSpin");
        });
    });

    describe("stopProcessingBetAndClearInterval", () => {
        it("should stop processing bet and clear interval", () => {
            betStore.isProcessingBet = true; // Set initial state on the mock

            // @ts-ignore because it's a protected method
            betResponseHandler.stopProcessingBetAndClearInterval();

            expect(betStore.isProcessingBet).toBe(false);
            expect(retryGameHandler.clearInterval).toHaveBeenCalled();
        });
    });

    describe("handleSlotBetResponse", () => {
        it("should update last received bet when endBet is valid and not free spin", () => {
            const response = {
                endBet: 100,
                freeSpin: false,
            };
            betStore.isProcessingBet = true; // Ensure processing is true initially
            betStore.lastReceivedBet = null; // Reset for the test

            betResponseHandler.handleSlotBetResponse(response);

            expect(betStore.lastReceivedBet).toEqual({
                value: 100,
                isAnimated: true,
            });
            expect(betStore.isProcessingBet).toBe(false);
            expect(retryGameHandler.clearInterval).toHaveBeenCalled();
        });

        it("should not update last received bet when endBet is -1", () => {
            const response = {
                endBet: -1,
                freeSpin: false,
            };
            betStore.isProcessingBet = true;
            const initialLastReceivedBet = { value: 50, isAnimated: false };
            betStore.lastReceivedBet = initialLastReceivedBet;

            betResponseHandler.handleSlotBetResponse(response);

            expect(betStore.lastReceivedBet).toBe(initialLastReceivedBet); // Should remain unchanged
            expect(betStore.isProcessingBet).toBe(false);
            expect(retryGameHandler.clearInterval).toHaveBeenCalled();
        });

        it("should not update last received bet when it is a free spin", () => {
            const response = {
                endBet: 100,
                freeSpin: true,
            };
            betStore.isProcessingBet = true;
            const initialLastReceivedBet = { value: 50, isAnimated: false };
            betStore.lastReceivedBet = initialLastReceivedBet;

            betResponseHandler.handleSlotBetResponse(response);

            expect(betStore.lastReceivedBet).toBe(initialLastReceivedBet);
            expect(betStore.isProcessingBet).toBe(false);
            expect(retryGameHandler.clearInterval).toHaveBeenCalled();
        });

        it("should handle undefined response gracefully", () => {
            betStore.isProcessingBet = true;
            const initialLastReceivedBet = { value: 50, isAnimated: false };
            betStore.lastReceivedBet = initialLastReceivedBet;

            betResponseHandler.handleSlotBetResponse({} as any);

            expect(betStore.lastReceivedBet).toBe(initialLastReceivedBet);
            expect(betStore.isProcessingBet).toBe(false);
            expect(retryGameHandler.clearInterval).toHaveBeenCalled();
        });
    });
});
