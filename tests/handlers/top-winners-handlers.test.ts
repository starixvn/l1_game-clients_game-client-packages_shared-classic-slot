import gc from "@sg/game-client-base";
import { Container } from "inversify";
import "reflect-metadata";
import { TopWinnersHandler } from "../../assets/scripts/handlers/handlers/top-winners-handlers";
import { BetControlStore } from "../../assets/scripts/handlers/stores/bet-control-store";
import { TopWinnersStore, TopWinnerType, Winner, WinnersData } from "../../assets/scripts/handlers/stores/top-winners-store";

// Mock stores
jest.mock("../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(() => ({})),
}));

const mockSetType = jest.fn();
jest.mock("../../assets/scripts/handlers/stores/top-winners-store", () => {
    const actualTopWinnersStore = jest.requireActual("../../assets/scripts/handlers/stores/top-winners-store");
    return {
        TopWinnersStore: jest.fn().mockImplementation(function (this: any) {
            this.type = actualTopWinnersStore.TopWinnerType.BigWinningWinners;
            this.data = { winners: [], page: 1, pageSize: 10, total: 0 };
            this.setType = mockSetType.mockImplementation((newType) => {
                this.type = newType;
            });
            return this;
        }),
        TopWinnerType: actualTopWinnersStore.TopWinnerType,
    };
});

// Mock gc components
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
        Player: {
            ...actualGc.Player,
            MainPlayerStore: jest.fn().mockImplementation(() => ({
                currency: "USD",
                multiplier: 1,
                name: "player1",
            })),
        },
        DateTimeUtils: {
            ...actualGc.DateTimeUtils,
            getStringDateByTime: jest.fn().mockReturnValue("2024-03-20"),
        },
        FormatUtils: {
            ...actualGc.FormatUtils,
            numberWithCommas: jest.fn().mockImplementation((num) => num.toString()),
        },
    };
});

describe("TopWinnersHandler", () => {
    let container: Container;
    let topWinnersHandler: TopWinnersHandler;
    let betControlStore: jest.Mocked<BetControlStore>;
    let topWinnersStore: jest.Mocked<TopWinnersStore>;
    let connectionStore: jest.Mocked<gc.Connection.ConnectionStore>;
    let mainPlayerStore: jest.Mocked<gc.Player.MainPlayerStore>;

    beforeEach(() => {
        mockSetType.mockClear();
        (gc.DateTimeUtils.getStringDateByTime as jest.Mock).mockClear();
        (gc.FormatUtils.numberWithCommas as jest.Mock).mockClear();

        container = new Container();

        container.bind(TopWinnersHandler).toSelf();
        container
            .bind(BetControlStore)
            .toConstantValue(new (jest.requireMock("../../assets/scripts/handlers/stores/bet-control-store").BetControlStore)());

        const MockedTopWinnersStore = jest.requireMock("../../assets/scripts/handlers/stores/top-winners-store").TopWinnersStore;
        topWinnersStore = new MockedTopWinnersStore() as jest.Mocked<TopWinnersStore>;
        container.bind(TopWinnersStore).toConstantValue(topWinnersStore);

        container
            .bind(gc.Connection.ConnectionStore)
            .toConstantValue(new (jest.requireMock("@sg/game-client-base").Connection.ConnectionStore)());
        container.bind(gc.Player.MainPlayerStore).toConstantValue(new (jest.requireMock("@sg/game-client-base").Player.MainPlayerStore)());

        topWinnersHandler = container.get(TopWinnersHandler);
        betControlStore = container.get(BetControlStore) as jest.Mocked<BetControlStore>;
        connectionStore = container.get(gc.Connection.ConnectionStore) as jest.Mocked<gc.Connection.ConnectionStore>;
        mainPlayerStore = container.get(gc.Player.MainPlayerStore) as jest.Mocked<gc.Player.MainPlayerStore>;

        Object.assign(topWinnersHandler, {
            betControlStore,
            topWinnersStore,
            connectionStore,
            mainPlayerStore,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("eventHandleList", () => {
        it("should have correct event handlers configured", () => {
            expect(topWinnersHandler.eventHandleList).toHaveLength(2);
            expect(topWinnersHandler.eventHandleList[0].name).toBe(TopWinnerType.BigWinningWinners);
            expect(topWinnersHandler.eventHandleList[1].name).toBe(TopWinnerType.JackpotWinners);
        });
    });

    describe("getData", () => {
        it("should emit getBigWinningWinners event when type is BigWinningWinners", () => {
            topWinnersStore.type = TopWinnerType.BigWinningWinners;
            topWinnersHandler.getData(1);
            expect(connectionStore.connection.emit).toHaveBeenCalledWith("getBigWinningWinners", { page: 1 });
        });

        it("should emit getJackpotWinners event when type is JackpotWinners", () => {
            topWinnersStore.type = TopWinnerType.JackpotWinners;
            topWinnersHandler.getData(1);
            expect(connectionStore.connection.emit).toHaveBeenCalledWith("getJackpotWinners", { page: 1 });
        });
    });

    describe("swapType", () => {
        it("should swap from BigWinningWinners to JackpotWinners", () => {
            topWinnersStore.type = TopWinnerType.BigWinningWinners;
            topWinnersHandler.swapType();
            expect(mockSetType).toHaveBeenCalledWith(TopWinnerType.JackpotWinners);
            expect(topWinnersStore.type).toBe(TopWinnerType.JackpotWinners);
            expect(connectionStore.connection.emit).toHaveBeenCalledWith("getJackpotWinners", { page: 1 });
        });

        it("should swap from JackpotWinners to BigWinningWinners", () => {
            topWinnersStore.type = TopWinnerType.JackpotWinners;
            topWinnersHandler.swapType();
            expect(mockSetType).toHaveBeenCalledWith(TopWinnerType.BigWinningWinners);
            expect(topWinnersStore.type).toBe(TopWinnerType.BigWinningWinners);
            expect(connectionStore.connection.emit).toHaveBeenCalledWith("getBigWinningWinners", { page: 1 });
        });
    });

    describe("receivedBigWinningWinners and receivedJackpotWinners", () => {
        const mockWinnerInput = {
            name: "testPlayer",
            time: 1710892800000 as number | string,
            baseWinningAmount: 1000,
            winningAmount: 1000,
            rate: 1,
            exchangeRateCode: { USD: 1 },
            exchangeRateId: 1,
            amountString: "",
        };

        const getMockWinnersData = (): WinnersData => ({
            page: 1,
            pageSize: 10,
            total: 1,
            winners: [JSON.parse(JSON.stringify(mockWinnerInput)) as Winner],
        });

        it("should process big winning winners data correctly", () => {
            const testData = getMockWinnersData();
            // @ts-ignore
            topWinnersHandler.receivedBigWinningWinners(testData);
            expect(topWinnersStore.data.winners[0].name).toBe("t***yer");
            expect(topWinnersStore.data.winners[0].time).toBe("2024-03-20");
            expect(topWinnersStore.data.winners[0].highlight).toBe(false);
        });

        it("should process jackpot winners data correctly", () => {
            const testData = getMockWinnersData();
            // @ts-ignore
            topWinnersHandler.receivedJackpotWinners(testData);
            expect(topWinnersStore.data.winners[0].name).toBe("t***yer");
            expect(topWinnersStore.data.winners[0].time).toBe("2024-03-20");
            expect(topWinnersStore.data.winners[0].highlight).toBe(false);
        });
    });

    describe("convertWinner", () => {
        const createWinnerInput = (overrides = {}): Winner =>
            ({
                name: "testPlayer",
                time: 1710892800000,
                baseWinningAmount: 1000,
                winningAmount: 1000,
                rate: 1,
                exchangeRateCode: { USD: 1 },
                totalAmount: 2000,
                baseTotalAmount: 2000,
                exchangeRateId: 1,
                amountString: "",
                ...overrides,
            } as Winner);

        it("should convert regular winner correctly", () => {
            const winnerInput = createWinnerInput();
            // @ts-ignore
            const convertedWinner = topWinnersHandler.convertWinner(winnerInput) as Winner;

            expect(convertedWinner.name).toBe("t***yer");
            expect(convertedWinner.time).toBe("2024-03-20");
            expect(convertedWinner.highlight).toBe(false);
            expect(convertedWinner.amountString).toBe("2000");
            expect(convertedWinner.winningAmount).toBe(1000);
        });

        it("should handle jackpot pool winner correctly", () => {
            const winnerInput = createWinnerInput({ pool: "grand" });
            // @ts-ignore
            const convertedWinner = topWinnersHandler.convertWinner(winnerInput) as Winner;
            expect(convertedWinner.time).toBe("2024-03-20");
            expect(convertedWinner.amountString).toBe("Grand");
        });

        it("should handle free spin winner correctly", () => {
            const winnerInput = createWinnerInput({ freeSpin: true });
            // @ts-ignore
            const convertedWinner = topWinnersHandler.convertWinner(winnerInput) as Winner;
            expect(convertedWinner.time).toBe("2024-03-20");
            expect(convertedWinner.amountString).toBe("Free Spin");
        });

        it("should highlight current player's name", () => {
            const winnerInput = createWinnerInput({ name: "player1" });
            // @ts-ignore
            const convertedWinner = topWinnersHandler.convertWinner(winnerInput) as Winner;
            expect(convertedWinner.time).toBe("2024-03-20");
            expect(convertedWinner.name).toBe("player1");
            expect(convertedWinner.highlight).toBe(true);
        });
    });

    describe("getValueByExchangeRateCode", () => {
        it("should calculate correct value with exchange rate", () => {
            const value = 1000;
            const exchangeRateCode = { USD: 2 };
            // @ts-ignore
            const result = topWinnersHandler.getValueByExchangeRateCode(value, exchangeRateCode);
            expect(result).toBe(500);
        });

        it("should use default rate when currency not found", () => {
            mainPlayerStore.currency = "EUR";
            const value = 1000;
            const exchangeRateCode = { USD: 2 };
            // @ts-ignore
            const result = topWinnersHandler.getValueByExchangeRateCode(value, exchangeRateCode);
            expect(result).toBe(1000);
        });
    });
});
