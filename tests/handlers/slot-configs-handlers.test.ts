import { Container } from "inversify";
import "reflect-metadata";
import { SlotState } from "../../assets/scripts/definitions";
import { SlotConfigsHandler } from "../../assets/scripts/handlers/handlers/slot-configs-handlers";
import { BetControlStore } from "../../assets/scripts/handlers/stores/bet-control-store";
import { SlotBoardStore } from "../../assets/scripts/handlers/stores/slot-board-store";

// Mock Stores
jest.mock("../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(() => ({
        stake: 0,
        setBetLevels: jest.fn(),
        setStake: jest.fn(),
    })),
}));

jest.mock("../../assets/scripts/handlers/stores/slot-board-store", () => ({
    SlotBoardStore: jest.fn().mockImplementation(() => ({
        slotState: SlotState.NOT_READY, // Initial state
    })),
}));

describe("SlotConfigsHandler", () => {
    let container: Container;
    let configsHandler: SlotConfigsHandler;
    let betControlStore: jest.Mocked<BetControlStore>;
    let slotBoardStore: jest.Mocked<SlotBoardStore>;

    beforeEach(() => {
        container = new Container();

        // Bind dependencies
        container.bind(SlotConfigsHandler).toSelf();
        // Use toConstantValue for mocked stores
        const MockedBetControlStore = jest.requireMock("../../assets/scripts/handlers/stores/bet-control-store").BetControlStore;
        betControlStore = new MockedBetControlStore();
        container.bind(BetControlStore).toConstantValue(betControlStore);

        const MockedSlotBoardStore = jest.requireMock("../../assets/scripts/handlers/stores/slot-board-store").SlotBoardStore;
        slotBoardStore = new MockedSlotBoardStore();
        container.bind(SlotBoardStore).toConstantValue(slotBoardStore);

        // Get instances
        configsHandler = container.get(SlotConfigsHandler);
        // betControlStore and slotBoardStore are already instantiated and correctly typed

        // Assign stores to handler instance if they are injected as properties
        Object.assign(configsHandler, {
            betControlStore,
            slotBoardStore,
        });

        // Reset mock function calls before each test
        betControlStore.setBetLevels.mockClear();
        betControlStore.setStake.mockClear();
        // Reset state if necessary, e.g., if slotBoardStore.slotState is modified in tests and needs a fresh start
        slotBoardStore.slotState = SlotState.NOT_READY;
        betControlStore.stake = 0; // Reset stake for consistent test starting conditions
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("eventHandleList", () => {
        it("should have correct event handler configured", () => {
            expect(configsHandler.eventHandleList).toHaveLength(1);
            expect(configsHandler.eventHandleList[0].name).toBe("gameConfigs");
        });
    });

    describe("handleGameConfigs", () => {
        it("should set bet levels and default bet level when current stake is 0", () => {
            const gameConfigs = {
                betLevels: [10, 20, 30],
                defaultBetLevel: 20,
            };
            betControlStore.stake = 0;

            configsHandler.handleGameConfigs(gameConfigs);

            expect(betControlStore.setBetLevels).toHaveBeenCalledWith(gameConfigs.betLevels);
            expect(betControlStore.setStake).toHaveBeenCalledWith(gameConfigs.defaultBetLevel);
            expect(slotBoardStore.slotState).toBe(SlotState.READY);
        });

        it("should not set default bet level when current stake is non-zero", () => {
            const gameConfigs = {
                betLevels: [10, 20, 30],
                defaultBetLevel: 20,
            };
            betControlStore.stake = 10;

            configsHandler.handleGameConfigs(gameConfigs);

            expect(betControlStore.setBetLevels).toHaveBeenCalledWith(gameConfigs.betLevels);
            expect(betControlStore.setStake).not.toHaveBeenCalled();
            expect(slotBoardStore.slotState).toBe(SlotState.READY);
        });

        it("should handle empty bet levels", () => {
            const gameConfigs = {
                betLevels: [],
                defaultBetLevel: 0,
            };
            betControlStore.stake = 0;

            configsHandler.handleGameConfigs(gameConfigs);

            expect(betControlStore.setBetLevels).toHaveBeenCalledWith([]);
            expect(slotBoardStore.slotState).toBe(SlotState.READY);
        });

        it("should handle undefined game configs gracefully", () => {
            configsHandler.handleGameConfigs({});

            expect(betControlStore.setBetLevels).not.toHaveBeenCalled();
            expect(betControlStore.setStake).not.toHaveBeenCalled();
        });
    });
});
