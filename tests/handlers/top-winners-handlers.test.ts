/// <reference types="jest" />
import gc from "@sg/game-client-base";
import { Container } from "inversify";
import "reflect-metadata";
import { TopWinnersHandler } from "../../assets/scripts/handlers/handlers/top-winners-handlers";
import { TopWinnersStore, TopWinnerType, Winner } from "../../assets/scripts/handlers/stores/top-winners-store";
import * as classicSlotUtils from "../../assets/scripts/utils/classic-slot-utils";

// Mock dependencies
jest.mock("../../assets/scripts/handlers/stores/top-winners-store", () => {
    return {
        TopWinnersStore: jest.fn().mockImplementation(() => ({
            type: TopWinnerType.BigWinningWinners,
            data: null,
        })),
        TopWinnerType: {
            BigWinningWinners: "getBigWinningWinners",
            JackpotWinners: "getJackpotWinners",
        },
    };
});

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
                name: "TestPlayer",
            })),
        },
        DateTimeUtils: {
            ...actualGc.DateTimeUtils,
            getStringDateByTime: jest.fn((time) => new Date(time).toISOString()),
        },
        FormatUtils: {
            ...actualGc.FormatUtils,
            numberWithCommas: jest.fn((num) => String(num)),
        },
    };
});

jest.mock("../../assets/scripts/utils/classic-slot-utils", () => ({
    formatNamePool: jest.fn((name) => name),
}));

describe("TopWinnersHandler", () => {
    let container: Container;
    let topWinnersHandler: TopWinnersHandler;
    let mockTopWinnersStore: jest.Mocked<TopWinnersStore>;
    let mockConnectionStore: jest.Mocked<gc.Connection.ConnectionStore>;
    let mockMainPlayerStore: jest.Mocked<gc.Player.MainPlayerStore>;
    let mockFormatNamePool: jest.MockedFunction<typeof classicSlotUtils.formatNamePool>;

    beforeEach(() => {
        container = new Container();

        // Bind mocks and class under test
        mockTopWinnersStore = new (jest.requireMock(
            "../../assets/scripts/handlers/stores/top-winners-store"
        ).TopWinnersStore)() as jest.Mocked<TopWinnersStore>;
        mockConnectionStore = new (jest.requireMock(
            "@sg/game-client-base"
        ).Connection.ConnectionStore)() as jest.Mocked<gc.Connection.ConnectionStore>;
        mockMainPlayerStore = new (jest.requireMock(
            "@sg/game-client-base"
        ).Player.MainPlayerStore)() as jest.Mocked<gc.Player.MainPlayerStore>;
        mockFormatNamePool = classicSlotUtils.formatNamePool as jest.MockedFunction<typeof classicSlotUtils.formatNamePool>;

        container.bind(TopWinnersStore).toConstantValue(mockTopWinnersStore);
        container.bind(gc.Connection.ConnectionStore).toConstantValue(mockConnectionStore);
        container.bind(gc.Player.MainPlayerStore).toConstantValue(mockMainPlayerStore);
        container.bind(TopWinnersHandler).toSelf();

        topWinnersHandler = container.get(TopWinnersHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(topWinnersHandler).toBeDefined();
    });

    describe("constructor", () => {
        it("should initialize with a setTimeout", () => {
            jest.useFakeTimers();
            const setTimeoutSpy = jest.spyOn(global, "setTimeout");
            new TopWinnersHandler(); // Intentionally create a new instance to test constructor
            expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);
            jest.clearAllTimers();
        });
    });

    describe("eventHandleList", () => {
        it("should have correct event handlers defined", () => {
            const eventList = topWinnersHandler.eventHandleList;
            expect(eventList).toHaveLength(2);
            expect(eventList[0].name).toBe(TopWinnerType.BigWinningWinners);
            expect(eventList[0].handle).toBeInstanceOf(Function); // Will be bound instance method
            expect(eventList[1].name).toBe(TopWinnerType.JackpotWinners);
            expect(eventList[1].handle).toBeInstanceOf(Function); // Will be bound instance method
        });
    });

    describe("getData", () => {
        it("should emit 'getBigWinningWinners' event when type is BigWinningWinners", () => {
            mockTopWinnersStore.type = TopWinnerType.BigWinningWinners;
            topWinnersHandler.getData(1);
            expect(mockConnectionStore.connection.emit).toHaveBeenCalledWith("getBigWinningWinners", { page: 1 });
        });

        it("should emit 'getJackpotWinners' event when type is JackpotWinners", () => {
            mockTopWinnersStore.type = TopWinnerType.JackpotWinners;
            topWinnersHandler.getData(2);
            expect(mockConnectionStore.connection.emit).toHaveBeenCalledWith("getJackpotWinners", { page: 2 });
        });
    });

    describe("swapType", () => {
        it("should swap type from BigWinningWinners to JackpotWinners and call getData", () => {
            mockTopWinnersStore.type = TopWinnerType.BigWinningWinners;
            const getDataSpy = jest.spyOn(topWinnersHandler, "getData");

            topWinnersHandler.swapType();

            expect(mockTopWinnersStore.type).toBe(TopWinnerType.JackpotWinners);
            expect(getDataSpy).toHaveBeenCalledWith(1);
        });

        it("should swap type from JackpotWinners to BigWinningWinners and call getData", () => {
            mockTopWinnersStore.type = TopWinnerType.JackpotWinners;
            const getDataSpy = jest.spyOn(topWinnersHandler, "getData");

            topWinnersHandler.swapType();

            expect(mockTopWinnersStore.type).toBe(TopWinnerType.BigWinningWinners);
            expect(getDataSpy).toHaveBeenCalledWith(1);
        });
    });

    // More tests will be added here
    describe("receivedBigWinningWinners", () => {
        it("should update topWinnersStore.data with converted winners data", () => {
            const mockData: any = {
                winners: [
                    {
                        name: "Player1",
                        time: Date.now(),
                        baseWinningAmount: 100,
                        winningAmount: 100,
                        rate: 1,
                        exchangeRateCode: { USD: 1 },
                    },
                ],
                page: 1,
                pageSize: 10,
                total: 1,
            };
            // @ts-ignore - testing protected method
            topWinnersHandler.receivedBigWinningWinners(mockData);
            expect(mockTopWinnersStore.data).toBeDefined();
            expect(mockTopWinnersStore.data?.winners[0].name).toBe("p***er1"); // Corrected suffix
            expect(mockTopWinnersStore.data?.page).toBe(1);
        });
    });

    describe("receivedJackpotWinners", () => {
        it("should update topWinnersStore.data with converted winners data", () => {
            const mockData: any = {
                winners: [
                    {
                        name: "Player2",
                        time: Date.now(),
                        baseWinningAmount: 200,
                        winningAmount: 200,
                        rate: 1,
                        exchangeRateCode: { USD: 1 },
                    },
                ],
                page: 1,
                pageSize: 10,
                total: 1,
            };
            // @ts-ignore - testing protected method
            topWinnersHandler.receivedJackpotWinners(mockData);
            expect(mockTopWinnersStore.data).toBeDefined();
            expect(mockTopWinnersStore.data?.winners[0].name).toBe("p***er2"); // Corrected suffix
            expect(mockTopWinnersStore.data?.page).toBe(1);
        });
    });

    describe("convertDataWinners", () => {
        it("should convert winners data correctly", () => {
            const winner1 = {
                name: "PlayerLongName",
                time: Date.now(),
                baseWinningAmount: 100,
                winningAmount: 100,
                rate: 1,
                exchangeRateCode: { USD: 1 },
            };
            const winner2 = {
                name: "TestPlayer",
                time: Date.now(),
                baseWinningAmount: 150,
                winningAmount: 150,
                rate: 1,
                exchangeRateCode: { USD: 1 },
                pool: "mega",
            }; // Current player
            const mockData: any = {
                winners: [winner1, winner2],
                page: 1,
                pageSize: 10,
                total: 2,
            };
            // @ts-ignore - testing protected method
            const result = topWinnersHandler.convertDataWinners(mockData);
            expect(result.winners).toHaveLength(2);
            expect(result.winners[0].name).toBe("p***ame"); // Changed to lowercase
            expect(result.winners[0].highlight).toBe(false);
            expect(result.winners[1].name).toBe("TestPlayer"); // Current player name not shortened
            expect(result.winners[1].highlight).toBe(true);
            expect(result.winners[1].amountString).toBe("mega"); // Pool name used as amount string
            expect(mockFormatNamePool).toHaveBeenCalledWith("mega");
        });
    });

    describe("getValueByExchangeRateCode", () => {
        beforeEach(() => {
            mockMainPlayerStore.currency = "USD";
            mockMainPlayerStore.multiplier = 1;
        });

        it("should return value divided by currency rate and multiplier", () => {
            const exchangeRateCode = { USD: 1, EUR: 0.8 };
            // @ts-ignore - testing protected method
            let result = topWinnersHandler.getValueByExchangeRateCode(100, exchangeRateCode);
            expect(result).toBe(100);

            mockMainPlayerStore.currency = "EUR";
            // @ts-ignore - testing protected method
            result = topWinnersHandler.getValueByExchangeRateCode(80, exchangeRateCode);
            expect(result).toBe(100); // 80 / 0.8
        });

        it("should use rate 1 if currency not in exchangeRateCode", () => {
            const exchangeRateCode = { EUR: 0.8 };
            mockMainPlayerStore.currency = "JPY"; // JPY not in codes
            // @ts-ignore - testing protected method
            const result = topWinnersHandler.getValueByExchangeRateCode(100, exchangeRateCode);
            expect(result).toBe(100); // 100 / 1 (default rate)
        });

        it("should handle multiplier correctly", () => {
            mockMainPlayerStore.multiplier = 10;
            const exchangeRateCode = { USD: 1 };
            // @ts-ignore - testing protected method
            const result = topWinnersHandler.getValueByExchangeRateCode(1000, exchangeRateCode);
            expect(result).toBe(100); // 1000 / (10 * 1)
        });
    });

    describe("formatNamePool", () => {
        it("should capitalize the first letter of the pool name", () => {
            // @ts-ignore - testing protected method
            const result = topWinnersHandler.formatNamePool("mega");
            expect(result).toBe("Mega");
            // @ts-ignore - testing protected method
            const result2 = topWinnersHandler.formatNamePool("grand");
            expect(result2).toBe("Grand");
        });
    });

    describe("convertWinner", () => {
        const now = Date.now();
        // This mockWinner is for type conformance if needed, but we'll pass a modified one to the function.
        const mockWinnerTyped: Winner = {
            name: "TestWinner",
            time: new Date(now).toISOString(), // Ensure it's a string to match Winner type
            winningAmount: 1000,
            baseWinningAmount: 1000, // Property from actual Winner type
            rate: 1, // Property from actual Winner type
            exchangeRateCode: { USD: 1, EUR: 0.9 },
            exchangeRateId: 1, // Added missing required property
            amountString: "", // Explicitly add required property from Winner
            // Removed id, currency, gameId, tableId as they are not in Winner interface
        };

        beforeEach(() => {
            mockMainPlayerStore.name = "TestPlayer";
            mockMainPlayerStore.currency = "USD";
            mockMainPlayerStore.multiplier = 1;
            (gc.DateTimeUtils.getStringDateByTime as jest.Mock).mockImplementation((timeNum) => new Date(timeNum).toLocaleDateString());
            (gc.FormatUtils.numberWithCommas as jest.Mock).mockImplementation((val) => String(val));
        });

        it("should convert winner data correctly for non-current player", () => {
            const winnerToConvert = {
                name: "TestWinner",
                time: now, // Pass number here, as gc.DateTimeUtils.getStringDateByTime likely expects it
                winningAmount: 1000,
                baseWinningAmount: 1000,
                rate: 1,
                exchangeRateCode: { USD: 1 },
                baseTotalAmount: 1000,
                totalAmount: 1000,

                // other necessary fields that convertWinner might access before setting them
            } as any; // Use 'as any' to bypass strict typing for the input to the function being tested

            // @ts-ignore - testing protected method
            topWinnersHandler.convertWinner(winnerToConvert);

            expect(winnerToConvert.name).toBe("t***ner"); // Changed to lowercase
            expect(winnerToConvert.time).toBe(new Date(now).toLocaleDateString());
            expect(winnerToConvert.highlight).toBe(false);
            expect(winnerToConvert.amountString).toBe("1000");
            expect(winnerToConvert.winningAmount).toBe(1000);
            expect(gc.DateTimeUtils.getStringDateByTime).toHaveBeenCalledWith(now);
            expect(gc.FormatUtils.numberWithCommas).toHaveBeenCalledWith(1000, 2);
        });

        it("should highlight and not shorten name for current player", () => {
            const winnerToConvert = {
                name: "TestPlayer",
                time: now,
                winningAmount: 100,
                baseWinningAmount: 100,
                rate: 1,
                exchangeRateCode: { USD: 1 },
            } as any;
            // @ts-ignore - testing protected method
            topWinnersHandler.convertWinner(winnerToConvert);

            expect(winnerToConvert.name).toBe("TestPlayer");
            expect(winnerToConvert.highlight).toBe(true);
        });

        it("should use pool name for amountString if pool exists", () => {
            const winnerToConvert = {
                name: "APoolPlayer",
                time: now,
                winningAmount: 100,
                pool: "jackpot",
                exchangeRateCode: { USD: 1 },
                rate: 1,
            } as any;
            mockFormatNamePool.mockReturnValueOnce("JackpotFormatted");
            // @ts-ignore - testing protected method
            topWinnersHandler.convertWinner(winnerToConvert);
            expect(winnerToConvert.amountString).toBe("JackpotFormatted");
            expect(mockFormatNamePool).toHaveBeenCalledWith("jackpot");
        });

        it("should use 'Free Spin' for amountString if freeSpin is true and no pool", () => {
            const winnerToConvert = {
                name: "FreeSpinner",
                time: now,
                winningAmount: 50,
                freeSpin: true,
                exchangeRateCode: { USD: 1 },
                rate: 1,
            } as any;
            // @ts-ignore - testing protected method
            topWinnersHandler.convertWinner(winnerToConvert);
            expect(winnerToConvert.amountString).toBe("Free Spin");
        });

        it("should use baseTotalAmount for amountString if available and no pool/freespin", () => {
            const winnerToConvert = {
                name: "BaseTotal",
                time: now,
                baseTotalAmount: 1200,
                totalAmount: 1000,
                exchangeRateCode: { USD: 1 },
                rate: 1,
            } as any;
            // @ts-ignore - testing protected method
            topWinnersHandler.convertWinner(winnerToConvert);
            expect(winnerToConvert.amountString).toBe("1200");
            expect(gc.FormatUtils.numberWithCommas).toHaveBeenCalledWith(1200, 2);
        });

        it("should use totalAmount * rate for amountString if baseTotalAmount is undefined and no pool/freespin", () => {
            const winnerToConvert = {
                name: "TotalRate",
                time: now,
                totalAmount: 1000,
                rate: 1.5,
                baseTotalAmount: undefined,
                exchangeRateCode: { USD: 1 },
            } as any;
            // @ts-ignore - testing protected method
            topWinnersHandler.convertWinner(winnerToConvert);
            expect(winnerToConvert.amountString).toBe("1500"); // 1000 * 1.5
            expect(gc.FormatUtils.numberWithCommas).toHaveBeenCalledWith(1500, 2);
        });

        it("should calculate winningAmount based on pool or baseWinningAmount/winningAmount*rate", () => {
            const winnerPool = {
                name: "PoolWin",
                pool: "mini",
                winningAmount: 500,
                time: now,
                exchangeRateCode: { USD: 1 },
                rate: 1,
            } as any;
            // @ts-ignore - testing protected method
            topWinnersHandler.convertWinner(winnerPool);
            expect(winnerPool.winningAmount).toBe(500);

            const winnerBase = {
                name: "BaseWin",
                baseWinningAmount: 700,
                winningAmount: 600,
                rate: 1,
                time: now,
                exchangeRateCode: { USD: 1 },
            } as any;
            // @ts-ignore - testing protected method
            topWinnersHandler.convertWinner(winnerBase);
            expect(winnerBase.winningAmount).toBe(700);

            const winnerRate = {
                name: "RateWin",
                winningAmount: 300,
                rate: 2,
                baseWinningAmount: undefined,
                time: now,
                exchangeRateCode: { USD: 1 },
            } as any;
            // @ts-ignore - testing protected method
            topWinnersHandler.convertWinner(winnerRate);
            expect(winnerRate.winningAmount).toBe(600); // 300 * 2
        });
    });

    describe("shortenName", () => {
        it("should shorten name to prefix***suffix format", () => {
            // @ts-ignore - testing protected method
            const result = topWinnersHandler.shortenName("PlayerTooLong");
            expect(result).toBe("p***ong");
            // @ts-ignore - testing protected method
            const result2 = topWinnersHandler.shortenName("short");
            expect(result2).toBe("s***ort");
            // @ts-ignore - testing protected method
            const result3 = topWinnersHandler.shortenName("tiny");
            expect(result3).toBe("t***iny"); // Suffix takes precedence if name < 4 chars
        });
    });

    describe("handleShortenName", () => {
        it("should shorten name if it is not the current player's name", () => {
            mockMainPlayerStore.name = "CurrentPlayer";
            const shortenSpy = jest.spyOn(topWinnersHandler as any, "shortenName");
            // @ts-ignore - testing protected method
            const result = topWinnersHandler.handleShortenName("OtherPlayer");
            expect(shortenSpy).toHaveBeenCalledWith("OtherPlayer");
            expect(result).toBe("o***yer");
        });

        it("should not shorten name if it is the current player's name", () => {
            mockMainPlayerStore.name = "CurrentPlayer";
            const shortenSpy = jest.spyOn(topWinnersHandler as any, "shortenName");
            // @ts-ignore - testing protected method
            const result = topWinnersHandler.handleShortenName("CurrentPlayer");
            expect(shortenSpy).not.toHaveBeenCalled();
            expect(result).toBe("CurrentPlayer");
        });
    });
});
