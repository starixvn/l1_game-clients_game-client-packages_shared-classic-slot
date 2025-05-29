import gc from "@sg/game-client-base";
import { Container } from "inversify";
import "reflect-metadata";
import { SlotJackpotPoolsHandler } from "../../assets/scripts/handlers/handlers/slot-jackpot-pools-handlers";
import { JackpotPool, JackpotPoolStore } from "../../assets/scripts/handlers/stores/jackpot-pool-store";

// Mock JackpotPoolStore
jest.mock("../../assets/scripts/handlers/stores/jackpot-pool-store", () => ({
    JackpotPoolStore: jest.fn().mockImplementation(() => ({
        jackpotPools: {},
    })),
}));

// Mock MainPlayerStore from @sg/game-client-base
jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        Player: {
            ...actualGc.Player,
            MainPlayerStore: jest.fn().mockImplementation(() => ({
                rate: 1,
            })),
        },
        NumberUtils: {
            // Keep existing mock for NumberUtils or add if not present
            ...actualGc.NumberUtils,
            getValueByCurrency: jest.fn((value, rate) => value * rate),
        },
    };
});

describe("SlotJackpotPoolsHandler", () => {
    let container: Container;
    let jackpotPoolsHandler: SlotJackpotPoolsHandler;
    let jackpotPoolStore: jest.Mocked<JackpotPoolStore>;
    let mainPlayerStore: jest.Mocked<gc.Player.MainPlayerStore>;

    beforeEach(() => {
        container = new Container();

        // Bind dependencies
        container.bind(SlotJackpotPoolsHandler).toSelf();
        // Use toConstantValue for mocked stores
        container
            .bind(JackpotPoolStore)
            .toConstantValue(new (jest.requireMock("../../assets/scripts/handlers/stores/jackpot-pool-store").JackpotPoolStore)());
        container.bind(gc.Player.MainPlayerStore).toConstantValue(new (jest.requireMock("@sg/game-client-base").Player.MainPlayerStore)());

        // Get instances
        jackpotPoolsHandler = container.get(SlotJackpotPoolsHandler);
        jackpotPoolStore = container.get(JackpotPoolStore) as jest.Mocked<JackpotPoolStore>;
        mainPlayerStore = container.get(gc.Player.MainPlayerStore) as jest.Mocked<gc.Player.MainPlayerStore>;

        // Assign store references to handler
        Object.assign(jackpotPoolsHandler, {
            jackpotPoolStore,
            mainPlayerStore,
        });

        // Reset mocks before each test if needed, for example:
        // (gc.NumberUtils.getValueByCurrency as jest.Mock).mockClear();
        // jackpotPoolStore.jackpotPools = {}; // Reset state if necessary
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("eventHandleList", () => {
        it("should have correct event handlers configured", () => {
            expect(jackpotPoolsHandler.eventHandleList).toHaveLength(2);
            expect(jackpotPoolsHandler.eventHandleList[0].name).toBe("jackpotPool");
            expect(jackpotPoolsHandler.eventHandleList[1].name).toBe("jackpotPools");
        });
    });

    describe("handleJackpotPool", () => {
        it("should handle single jackpot pool update", () => {
            const jackpotPool: JackpotPool = {
                pool: "GRAND",
                amount: 1000,
            };
            mainPlayerStore.rate = 1; // Set rate for the test case

            jackpotPoolsHandler.handleJackpotPool(jackpotPool);

            expect(gc.NumberUtils.getValueByCurrency).toHaveBeenCalledWith(1000, 1);
            expect(jackpotPoolStore.jackpotPools["GRAND"]).toEqual({
                pool: "GRAND",
                amount: 1000,
            });
        });

        it("should handle jackpot pool update with different currency rate", () => {
            mainPlayerStore.rate = 2;
            const jackpotPool: JackpotPool = {
                pool: "MAJOR",
                amount: 500,
            };

            jackpotPoolsHandler.handleJackpotPool(jackpotPool);

            expect(gc.NumberUtils.getValueByCurrency).toHaveBeenCalledWith(500, 2);
            expect(jackpotPoolStore.jackpotPools["MAJOR"]).toEqual({
                pool: "MAJOR",
                amount: 1000, // 500 * 2
            });
        });
    });

    describe("handleJackpotPools", () => {
        it("should handle multiple jackpot pools update", () => {
            const jackpotPools: JackpotPool[] = [
                { pool: "GRAND", amount: 1000 },
                { pool: "MAJOR", amount: 500 },
                { pool: "MINOR", amount: 100 },
            ];
            mainPlayerStore.rate = 1; // Set rate for the test case

            jackpotPoolsHandler.handleJackpotPools(jackpotPools);

            expect(gc.NumberUtils.getValueByCurrency).toHaveBeenCalledTimes(3);
            expect(jackpotPoolStore.jackpotPools).toEqual({
                GRAND: { pool: "GRAND", amount: 1000 },
                MAJOR: { pool: "MAJOR", amount: 500 },
                MINOR: { pool: "MINOR", amount: 100 },
            });
        });

        it("should handle empty jackpot pools array", () => {
            jackpotPoolsHandler.handleJackpotPools([]);
            // Since getValueByCurrency is reset in afterEach, check call count based on this test
            expect(gc.NumberUtils.getValueByCurrency).not.toHaveBeenCalled();
            expect(jackpotPoolStore.jackpotPools).toEqual({});
        });

        it("should handle jackpot pools update with different currency rate", () => {
            mainPlayerStore.rate = 2;
            const jackpotPools: JackpotPool[] = [
                { pool: "GRAND", amount: 1000 },
                { pool: "MAJOR", amount: 500 },
            ];

            jackpotPoolsHandler.handleJackpotPools(jackpotPools);
            // Check based on calls within this test
            expect(gc.NumberUtils.getValueByCurrency).toHaveBeenCalledTimes(2);
            expect(gc.NumberUtils.getValueByCurrency).toHaveBeenNthCalledWith(1, 1000, 2);
            expect(gc.NumberUtils.getValueByCurrency).toHaveBeenNthCalledWith(2, 500, 2);
            expect(jackpotPoolStore.jackpotPools).toEqual({
                GRAND: { pool: "GRAND", amount: 2000 }, // 1000 * 2
                MAJOR: { pool: "MAJOR", amount: 1000 }, // 500 * 2
            });
        });

        it("should override existing jackpot pools", () => {
            // Set initial pools
            jackpotPoolStore.jackpotPools = {
                GRAND: { pool: "GRAND", amount: 1000 },
                MAJOR: { pool: "MAJOR", amount: 500 },
            };
            mainPlayerStore.rate = 1; // Set rate for the test case

            // Update with new pools
            const newJackpotPools: JackpotPool[] = [
                { pool: "GRAND", amount: 2000 },
                { pool: "MINOR", amount: 100 },
            ];

            jackpotPoolsHandler.handleJackpotPools(newJackpotPools);
            // Check based on calls within this test
            expect(gc.NumberUtils.getValueByCurrency).toHaveBeenCalledTimes(2);
            expect(gc.NumberUtils.getValueByCurrency).toHaveBeenNthCalledWith(1, 2000, 1);
            expect(gc.NumberUtils.getValueByCurrency).toHaveBeenNthCalledWith(2, 100, 1);
            expect(jackpotPoolStore.jackpotPools).toEqual({
                GRAND: { pool: "GRAND", amount: 2000 },
                MINOR: { pool: "MINOR", amount: 100 },
            });
            expect(jackpotPoolStore.jackpotPools["MAJOR"]).toBeUndefined();
        });
    });
});
