import "reflect-metadata";
// rest of the imports
import gc from "@sg/game-client-base";
import { Container } from "inversify";
import {
    JackpotWinner,
    TopWinner,
    TopWinnersStore,
    TopWinnerType,
    Winner,
    WinnersData,
} from "../../../assets/scripts/handlers/stores/top-winners-store";

// Mock gc dependencies
jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        Rounds: {
            ...actualGc.Rounds,
            RoundTimeStore: jest.fn().mockImplementation(() => ({
                // Mock RoundTimeStore methods and properties if needed
            })),
            RoundStore: jest.fn().mockImplementation(() => ({
                // Mock RoundStore methods and properties if needed
            })),
        },
        GameConfigs: {
            ...actualGc.GameConfigs,
            GameConfigStore: jest.fn().mockImplementation(() => ({
                // Mock GameConfigStore methods and properties if needed
            })),
        },
        Player: {
            ...actualGc.Player,
            MainPlayerStore: jest.fn().mockImplementation(() => ({
                // Mock MainPlayerStore methods and properties if needed
            })),
        },
        GameUserSettings: {
            ...actualGc.GameUserSettings,
            GameUserSettingHandler: jest.fn().mockImplementation(() => ({
                // Mock GameUserSettingHandler methods and properties if needed
            })),
        },
    };
});

describe("TopWinnersStore", () => {
    let container: Container;
    let topWinnersStore: TopWinnersStore;
    let mockRoundTimeStore: jest.Mocked<gc.Rounds.RoundTimeStore>;
    let mockRoundStore: jest.Mocked<gc.Rounds.RoundStore>;
    let mockGameConfigStore: jest.Mocked<gc.GameConfigs.GameConfigStore>;
    let mockMainPlayerStore: jest.Mocked<gc.Player.MainPlayerStore>;
    let mockGameUserSettingHandler: jest.Mocked<gc.GameUserSettings.GameUserSettingHandler>;

    beforeEach(() => {
        container = new Container();

        // Create mock instances
        const MockedRoundTimeStore = jest.requireMock("@sg/game-client-base").Rounds.RoundTimeStore;
        const MockedRoundStore = jest.requireMock("@sg/game-client-base").Rounds.RoundStore;
        const MockedGameConfigStore = jest.requireMock("@sg/game-client-base").GameConfigs.GameConfigStore;
        const MockedMainPlayerStore = jest.requireMock("@sg/game-client-base").Player.MainPlayerStore;
        const MockedGameUserSettingHandler = jest.requireMock("@sg/game-client-base").GameUserSettings.GameUserSettingHandler;

        mockRoundTimeStore = new MockedRoundTimeStore();
        mockRoundStore = new MockedRoundStore();
        mockGameConfigStore = new MockedGameConfigStore();
        mockMainPlayerStore = new MockedMainPlayerStore();
        mockGameUserSettingHandler = new MockedGameUserSettingHandler();

        // Bind dependencies to container
        container.bind(gc.Rounds.RoundTimeStore).toConstantValue(mockRoundTimeStore);
        container.bind(gc.Rounds.RoundStore).toConstantValue(mockRoundStore);
        container.bind(gc.GameConfigs.GameConfigStore).toConstantValue(mockGameConfigStore);
        container.bind(gc.Player.MainPlayerStore).toConstantValue(mockMainPlayerStore);
        container.bind(gc.GameUserSettings.GameUserSettingHandler).toConstantValue(mockGameUserSettingHandler);
        container.bind(TopWinnersStore).toSelf();

        // Get the store instance
        topWinnersStore = container.get(TopWinnersStore);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("Constructor and Initialization", () => {
        it("should initialize with default values", () => {
            expect(topWinnersStore.type).toBe(TopWinnerType.BigWinningWinners);
            expect(topWinnersStore.data).toBeNull();
        });

        it("should make the store observable", () => {
            // This test verifies that mobx.makeAutoObservable was called
            // We can check if properties are reactive by setting and checking them
            const initialType = topWinnersStore.type;
            topWinnersStore.type = TopWinnerType.JackpotWinners;
            expect(topWinnersStore.type).not.toBe(initialType);
            expect(topWinnersStore.type).toBe(TopWinnerType.JackpotWinners);
        });

        it("should inject all required dependencies", () => {
            expect(topWinnersStore["roundTimeStore"]).toBe(mockRoundTimeStore);
            expect(topWinnersStore["roundStore"]).toBe(mockRoundStore);
            expect(topWinnersStore["gameConfigStore"]).toBe(mockGameConfigStore);
            expect(topWinnersStore["mainPlayerStore"]).toBe(mockMainPlayerStore);
            expect(topWinnersStore["gameUserSettingHandler"]).toBe(mockGameUserSettingHandler);
        });
    });

    describe("Type property", () => {
        it("should allow setting type to BigWinningWinners", () => {
            topWinnersStore.type = TopWinnerType.BigWinningWinners;
            expect(topWinnersStore.type).toBe(TopWinnerType.BigWinningWinners);
        });

        it("should allow setting type to JackpotWinners", () => {
            topWinnersStore.type = TopWinnerType.JackpotWinners;
            expect(topWinnersStore.type).toBe(TopWinnerType.JackpotWinners);
        });
    });

    describe("Data property", () => {
        it("should allow setting winners data", () => {
            const mockWinnersData: WinnersData = {
                page: 1,
                pageSize: 10,
                total: 25,
                winners: [
                    {
                        name: "Player1",
                        time: "2023-12-01T10:00:00Z",
                        amountString: "$1,000",
                        winningAmount: 1000,
                        exchangeRateId: 1,
                        exchangeRateCode: { USD: 1 },
                        highlight: true,
                        freeSpin: false,
                        totalAmount: 1000,
                        baseTotalAmount: 1000,
                        baseWinningAmount: 1000,
                        rate: 1.0,
                    },
                    {
                        name: "Player2",
                        time: "2023-12-01T11:00:00Z",
                        amountString: "$500",
                        winningAmount: 500,
                        exchangeRateId: 1,
                        exchangeRateCode: { USD: 1 },
                        highlight: false,
                        pool: "Mega",
                    },
                ],
            };

            topWinnersStore.data = mockWinnersData;
            expect(topWinnersStore.data).toEqual(mockWinnersData);
        });

        it("should allow setting data to null", () => {
            topWinnersStore.data = null;
            expect(topWinnersStore.data).toBeNull();
        });
    });

    describe("TopWinnerType enum", () => {
        it("should have correct enum values", () => {
            expect(TopWinnerType.BigWinningWinners).toBe("bigWinningWinners");
            expect(TopWinnerType.JackpotWinners).toBe("jackpotWinners");
        });
    });

    describe("Interfaces", () => {
        it("should work with TopWinner interface", () => {
            const topWinner: TopWinner = {
                freeSpin: true,
                name: "TopPlayer",
                totalAmount: 5000,
                baseTotalAmount: 5000,
                winningAmount: 2500,
                baseWinningAmount: 2500,
                time: "2023-12-01T12:00:00Z",
                exchangeRateId: 1,
                rate: 1.0,
                exchangeRateCode: { USD: 1 },
            };

            expect(topWinner.freeSpin).toBe(true);
            expect(topWinner.name).toBe("TopPlayer");
            expect(topWinner.totalAmount).toBe(5000);
            expect(topWinner.winningAmount).toBe(2500);
        });

        it("should work with JackpotWinner interface", () => {
            const jackpotWinner: JackpotWinner = {
                time: "2023-12-01T13:00:00Z",
                name: "JackpotPlayer",
                pool: "Mega",
                winningAmount: 10000,
                exchangeRateId: 1,
                exchangeRateCode: { USD: 1 },
            };

            expect(jackpotWinner.name).toBe("JackpotPlayer");
            expect(jackpotWinner.pool).toBe("Mega");
            expect(jackpotWinner.winningAmount).toBe(10000);
        });

        it("should work with Winner interface", () => {
            const winner: Winner = {
                name: "RegularWinner",
                time: "2023-12-01T14:00:00Z",
                amountString: "$750",
                winningAmount: 750,
                exchangeRateId: 1,
                exchangeRateCode: { USD: 1 },
                highlight: true,
                freeSpin: false,
                totalAmount: 750,
                baseTotalAmount: 750,
                baseWinningAmount: 750,
                rate: 1.0,
                pool: "Mini",
            };

            expect(winner.name).toBe("RegularWinner");
            expect(winner.amountString).toBe("$750");
            expect(winner.winningAmount).toBe(750);
            expect(winner.highlight).toBe(true);
        });
    });

    describe("Observable behavior", () => {
        it("should react to type changes", () => {
            let reactionTriggered = false;
            let observedType: TopWinnerType;

            // Set up a reaction to observe type changes
            const disposer = require("mobx").autorun(() => {
                observedType = topWinnersStore.type;
                reactionTriggered = true;
            });

            // Reset the reaction flag after initial run
            reactionTriggered = false;

            // Change the type
            topWinnersStore.type = TopWinnerType.JackpotWinners;

            expect(reactionTriggered).toBe(true);
            expect(observedType).toBe(TopWinnerType.JackpotWinners);

            disposer();
        });

        it("should react to data changes", () => {
            let reactionTriggered = false;
            let observedData: WinnersData;

            // Set up a reaction to observe data changes
            const disposer = require("mobx").autorun(() => {
                observedData = topWinnersStore.data;
                reactionTriggered = true;
            });

            // Reset the reaction flag after initial run
            reactionTriggered = false;

            // Change the data
            const newData: WinnersData = {
                page: 1,
                pageSize: 5,
                total: 5,
                winners: [],
            };
            topWinnersStore.data = newData;

            expect(reactionTriggered).toBe(true);
            expect(observedData).toEqual(newData);

            disposer();
        });
    });
});
