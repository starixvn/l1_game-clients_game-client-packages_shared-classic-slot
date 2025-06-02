import { Container } from "inversify";
import "reflect-metadata";
import { SlotState } from "../../assets/scripts/definitions";
import { SlotConfigsHandler } from "../../assets/scripts/handlers/handlers/slot-configs-handlers";
import { BetControlStore } from "../../assets/scripts/handlers/stores/bet-control-store";
import { SlotBoardStore } from "../../assets/scripts/handlers/stores/slot-board-store";

// Mock BetControlStore
jest.mock("../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(function (this: any) {
        this.stake = 0;
        this.betLevels = [];
        this.setBetLevels = jest.fn();
        this.setStake = jest.fn();
        return this;
    }),
}));

// Mock SlotBoardStore
jest.mock("../../assets/scripts/handlers/stores/slot-board-store", () => ({
    SlotBoardStore: jest.fn().mockImplementation(function (this: any) {
        this.slotState = SlotState.NOT_READY;
        return this;
    }),
}));

describe("SlotConfigsHandler", () => {
    let container: Container;
    let slotConfigsHandler: SlotConfigsHandler;
    let mockBetControlStore: jest.Mocked<BetControlStore>;
    let mockSlotBoardStore: jest.Mocked<SlotBoardStore>;

    beforeEach(() => {
        container = new Container();

        // Create mock instances
        const MockedBetControlStore = jest.requireMock("../../assets/scripts/handlers/stores/bet-control-store").BetControlStore;
        mockBetControlStore = new MockedBetControlStore();

        const MockedSlotBoardStore = jest.requireMock("../../assets/scripts/handlers/stores/slot-board-store").SlotBoardStore;
        mockSlotBoardStore = new MockedSlotBoardStore();

        // Bind dependencies
        container.bind(SlotConfigsHandler).toSelf();
        container.bind(BetControlStore).toConstantValue(mockBetControlStore);
        container.bind(SlotBoardStore).toConstantValue(mockSlotBoardStore);

        // Get instance
        slotConfigsHandler = container.get(SlotConfigsHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("eventHandleList", () => {
        it("should have correct event handlers configured", () => {
            expect(slotConfigsHandler.eventHandleList).toHaveLength(1);
            expect(slotConfigsHandler.eventHandleList[0].name).toBe("gameConfigs");
            expect(slotConfigsHandler.eventHandleList[0].handle).toBe(slotConfigsHandler.handleGameConfigs);
        });
    });

    describe("handleGameConfigs", () => {
        it("should return early when betLevels is undefined", () => {
            // Arrange
            const data = { betLevels: undefined, defaultBetLevel: 50 };

            // Act
            slotConfigsHandler.handleGameConfigs(data);

            // Assert
            expect(mockBetControlStore.setBetLevels).not.toHaveBeenCalled();
            expect(mockBetControlStore.setStake).not.toHaveBeenCalled();
            expect(mockSlotBoardStore.slotState).not.toBe(SlotState.READY);
        });

        it("should return early when defaultBetLevel is undefined", () => {
            // Arrange
            const data = { betLevels: [10, 20, 50], defaultBetLevel: undefined };

            // Act
            slotConfigsHandler.handleGameConfigs(data);

            // Assert
            expect(mockBetControlStore.setBetLevels).not.toHaveBeenCalled();
            expect(mockBetControlStore.setStake).not.toHaveBeenCalled();
            expect(mockSlotBoardStore.slotState).not.toBe(SlotState.READY);
        });

        it("should return early when both betLevels and defaultBetLevel are undefined", () => {
            // Arrange
            const data = { betLevels: undefined, defaultBetLevel: undefined };

            // Act
            slotConfigsHandler.handleGameConfigs(data);

            // Assert
            expect(mockBetControlStore.setBetLevels).not.toHaveBeenCalled();
            expect(mockBetControlStore.setStake).not.toHaveBeenCalled();
            expect(mockSlotBoardStore.slotState).not.toBe(SlotState.READY);
        });

        it("should set bet levels and default stake when stake is 0", () => {
            // Arrange
            const data = { betLevels: [10, 20, 50], defaultBetLevel: 20 };
            mockBetControlStore.stake = 0;

            // Act
            slotConfigsHandler.handleGameConfigs(data);

            // Assert
            expect(mockBetControlStore.setBetLevels).toHaveBeenCalledWith([10, 20, 50]);
            expect(mockBetControlStore.setStake).toHaveBeenCalledWith(20);
            expect(mockSlotBoardStore.slotState).toBe(SlotState.READY);
        });

        it("should set bet levels but not change stake when stake is not 0", () => {
            // Arrange
            const data = { betLevels: [10, 20, 50], defaultBetLevel: 20 };
            mockBetControlStore.stake = 10;

            // Act
            slotConfigsHandler.handleGameConfigs(data);

            // Assert
            expect(mockBetControlStore.setBetLevels).toHaveBeenCalledWith([10, 20, 50]);
            expect(mockBetControlStore.setStake).not.toHaveBeenCalled();
            expect(mockSlotBoardStore.slotState).toBe(SlotState.READY);
        });

        it("should handle empty bet levels array", () => {
            // Arrange
            const data = { betLevels: [], defaultBetLevel: 10 };
            mockBetControlStore.stake = 0;

            // Act
            slotConfigsHandler.handleGameConfigs(data);

            // Assert
            expect(mockBetControlStore.setBetLevels).toHaveBeenCalledWith([]);
            expect(mockBetControlStore.setStake).toHaveBeenCalledWith(10);
            expect(mockSlotBoardStore.slotState).toBe(SlotState.READY);
        });

        it("should handle single bet level", () => {
            // Arrange
            const data = { betLevels: [25], defaultBetLevel: 25 };
            mockBetControlStore.stake = 0;

            // Act
            slotConfigsHandler.handleGameConfigs(data);

            // Assert
            expect(mockBetControlStore.setBetLevels).toHaveBeenCalledWith([25]);
            expect(mockBetControlStore.setStake).toHaveBeenCalledWith(25);
            expect(mockSlotBoardStore.slotState).toBe(SlotState.READY);
        });

        it("should handle multiple bet levels with different default", () => {
            // Arrange
            const data = { betLevels: [5, 10, 25, 50, 100], defaultBetLevel: 25 };
            mockBetControlStore.stake = 0;

            // Act
            slotConfigsHandler.handleGameConfigs(data);

            // Assert
            expect(mockBetControlStore.setBetLevels).toHaveBeenCalledWith([5, 10, 25, 50, 100]);
            expect(mockBetControlStore.setStake).toHaveBeenCalledWith(25);
            expect(mockSlotBoardStore.slotState).toBe(SlotState.READY);
        });

        it("should handle zero default bet level", () => {
            // Arrange
            const data = { betLevels: [0, 10, 20], defaultBetLevel: 0 };
            mockBetControlStore.stake = 0;

            // Act
            slotConfigsHandler.handleGameConfigs(data);

            // Assert
            expect(mockBetControlStore.setBetLevels).toHaveBeenCalledWith([0, 10, 20]);
            expect(mockBetControlStore.setStake).toHaveBeenCalledWith(0);
            expect(mockSlotBoardStore.slotState).toBe(SlotState.READY);
        });

        it("should handle data with additional properties", () => {
            // Arrange
            const data = {
                betLevels: [10, 20, 50],
                defaultBetLevel: 20,
                extraProperty: "should be ignored",
                anotherProperty: 123,
            };
            mockBetControlStore.stake = 0;

            // Act
            slotConfigsHandler.handleGameConfigs(data);

            // Assert
            expect(mockBetControlStore.setBetLevels).toHaveBeenCalledWith([10, 20, 50]);
            expect(mockBetControlStore.setStake).toHaveBeenCalledWith(20);
            expect(mockSlotBoardStore.slotState).toBe(SlotState.READY);
        });

        it("should always set slot state to READY when data is valid", () => {
            // Arrange
            const data = { betLevels: [10, 20, 50], defaultBetLevel: 20 };
            mockBetControlStore.stake = 15; // Non-zero stake
            mockSlotBoardStore.slotState = SlotState.NOT_READY;

            // Act
            slotConfigsHandler.handleGameConfigs(data);

            // Assert
            expect(mockSlotBoardStore.slotState).toBe(SlotState.READY);
        });
    });
});
