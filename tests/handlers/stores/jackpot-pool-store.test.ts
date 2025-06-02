import gc from "@sg/game-client-base";
import * as inversify from "inversify";
import * as mobx from "mobx";
import "reflect-metadata";

// Mock inversify module that JackpotPoolStore imports
jest.mock("inversify", () => {
    const mockInversify = jest.requireActual("../../../../../tests/cocos-testing/inversify");
    return {
        default: mockInversify,
        ...mockInversify,
    };
});

// Mock dependencies BEFORE importing JackpotPoolStore
jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        GameConfigs: {
            ...actualGc.GameConfigs,
            GameConfigStore: jest.fn().mockImplementation(() => ({
                // Add any properties/methods that might be needed
            })),
        },
    };
});

// Import JackpotPoolStore AFTER the mocks are set up
import { JackpotPoolStore } from "../../../assets/scripts/handlers/stores/jackpot-pool-store";

describe("JackpotPoolStore", () => {
    let container: inversify.Container;
    let jackpotPoolStore: JackpotPoolStore;
    let mockGameConfigStore: jest.Mocked<gc.GameConfigs.GameConfigStore>;

    beforeEach(() => {
        container = new inversify.Container();

        // Bind mocks
        const MockedGcGameConfigStore = jest.requireMock("@sg/game-client-base").GameConfigs.GameConfigStore;
        mockGameConfigStore = new MockedGcGameConfigStore() as jest.Mocked<gc.GameConfigs.GameConfigStore>;
        container.bind(gc.GameConfigs.GameConfigStore).toConstantValue(mockGameConfigStore);

        // Bind the class under test
        container.bind(JackpotPoolStore).toSelf();

        // Get instances - dependency injection should happen automatically now
        jackpotPoolStore = container.get(JackpotPoolStore);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("constructor", () => {
        it("should initialize jackpotPools as an empty object", () => {
            expect(jackpotPoolStore.jackpotPools).toEqual({});
        });

        it("should make the store auto observable via mobx", () => {
            // We can test this by trying to add a new pool and see if it becomes observable
            // Or by checking if mobx.isObservableObject(jackpotPoolStore.jackpotPools) is true.
            // For simplicity, we'll trust makeAutoObservable works if no error during construction.
            // A more direct test would involve spying on mobx.makeAutoObservable.
            expect(mobx.isObservable(jackpotPoolStore)).toBe(true);
            expect(mobx.isObservable(jackpotPoolStore.jackpotPools)).toBe(true);
        });

        it("should inject GameConfigStore", () => {
            // @ts-ignore // Accessing protected member for test purposes
            expect(jackpotPoolStore.gameConfigStore).toBeDefined();
            // @ts-ignore // Accessing protected member for test purposes
            expect(jackpotPoolStore.gameConfigStore).toBe(mockGameConfigStore);
        });
    });

    // Add more describe blocks for other methods and properties if any
});
