import "reflect-metadata";

import { JsonAsset, Label, SpriteAtlas, Vec3 } from "cc";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { Container } from "inversify";
import ClassicSlot from "../../assets/scripts/components/classic-slot";
import SlotBoard from "../../assets/scripts/components/slot-board/slot-board";
import { StandardSlotGameConfigs } from "../../assets/scripts/config/standard-slot-game-configs";
import { LineData } from "../../assets/scripts/definitions";
import { BetControlStore } from "../../assets/scripts/handlers/stores/bet-control-store";
import { SlotBoardStore } from "../../assets/scripts/handlers/stores/slot-board-store";
import { SlotDurationStore } from "../../assets/scripts/handlers/stores/slot-duration-store";

// Mock game client base - COMPLETE structure
jest.mock("@sg/game-client-base", () => ({
    GameConfigs: {
        GameConfigStore: class MockGameConfigStore {
            odds = {};
        },
    },
    GameServiceMessage: {
        TResult: {},
        TSettlementResult: {},
    },
    Player: {
        MainPlayerStore: class MockMainPlayerStore {},
    },
    Bet: {
        BetStore: class MockBetStore {},
    },
    FormatUtils: {
        numberWithCommas: jest.fn((num: number) => num.toLocaleString()),
        truncateFixedDecimals: jest.fn((num: number) => num.toFixed(2)),
    },
}));

// Mock Observer
jest.mock("observer", () => ({
    render: jest.fn(() => jest.fn()),
    handle: jest.fn(() => jest.fn()),
}));

// Mock GameComponent
jest.mock("db://shared-components/game/scripts/components/game-component", () => {
    class MockGameComponent {
        lblRoundId = { string: "" };

        constructor() {
            // Mock constructor
        }

        onLoad() {}
        isValidResult() {
            return true;
        }
        renderRoundId() {}
    }

    return {
        __esModule: true,
        default: MockGameComponent,
    };
});

// Mock AudioUtils
jest.mock("db://shared-components/game/audios/utils", () => ({
    AudioUtils: {
        playClick: jest.fn(),
        playSFX: jest.fn(),
    },
}));

// Mock MainPlayerProfile
jest.mock("db://shared-components/game/main-player-profile/scripts/components/main-player-profile", () => ({
    default: class MockMainPlayerProfile {
        lblBalance = {
            node: { getComponent: jest.fn() },
            string: "",
        };
        onLoad() {}
    },
}));

// Mock classic-slot-utils
jest.mock("../../assets/scripts/utils/classic-slot-utils", () => ({
    loadSlotSymbols: jest.fn().mockResolvedValue(undefined),
    loadWinningSymbolAnimation: jest.fn().mockResolvedValue(undefined),
    resourceCaches: {
        gameAtlas: null,
        sharedSlotAtlas: null,
        slotSymbols: {
            0: { symbol: { spine: "mockSpine" } },
            1: { symbol: { spine: "mockSpine" } },
        },
        colorJson: {
            bottomAreaWinAmountColor: "#FFD700",
            previewOddsSymbolNumberColor: "#ffffff",
            previewOddsWinValueColor: "#ffff00",
            previewOddsBorderColor: "#ff0000",
        },
    },
    setSlotGameConfigs: jest.fn(),
}));

// Mock ComponentUtils
jest.mock("db://shared-components/shared/utils", () => ({
    ComponentUtils: {
        setNodeColor: jest.fn(),
    },
}));

// Mock stores
jest.mock("../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(() => ({
        roundId: -1,
    })),
}));

jest.mock("../../assets/scripts/handlers/stores/slot-board-store", () => ({
    SlotBoardStore: jest.fn().mockImplementation(() => ({
        spinResult: null,
        highlightSpecialSymbols: [],
        winningItemsOnLines: [],
    })),
}));

jest.mock("../../assets/scripts/handlers/stores/slot-duration-store", () => ({
    SlotDurationStore: jest.fn().mockImplementation(() => ({
        setConfig: jest.fn(),
    })),
}));

// Mock StandardSlotGameConfigs
jest.mock("../../assets/scripts/config/standard-slot-game-configs", () => ({
    StandardSlotGameConfigs: jest.fn().mockImplementation(() => ({
        // mock config properties
    })),
}));

// Mock SlotBoard
jest.mock("../../assets/scripts/components/slot-board/slot-board", () => ({
    default: class MockSlotBoard {
        initReels = jest.fn();
        previewPopup = { onSymbolPreview: null };
        setBoardData = jest.fn();
        spin = jest.fn().mockResolvedValue(undefined);
        highlightSpecialSymbols = jest.fn();
        hideWinningEffect = jest.fn();
        showWinningEffectOnLine = jest.fn();
        showPreviewPopup = jest.fn();
        setItemWinningEffect = jest.fn();
        applyData = jest.fn();
    },
}));

describe("ClassicSlot", () => {
    let container: Container;
    let component: ClassicSlot;
    let mockBetControlStore: jest.Mocked<BetControlStore>;
    let mockSlotBoardStore: jest.Mocked<SlotBoardStore>;
    let mockSlotDurationStore: jest.Mocked<SlotDurationStore>;
    let mockSlotBoard: jest.Mocked<SlotBoard>;
    let mockGameAtlas: SpriteAtlas;
    let mockSharedSlotAtlas: SpriteAtlas;
    let mockColorJson: JsonAsset;

    beforeEach(() => {
        container = new Container();

        // Create mock instances
        const MockedBetControlStore = jest.requireMock("../../assets/scripts/handlers/stores/bet-control-store").BetControlStore;
        const MockedSlotBoardStore = jest.requireMock("../../assets/scripts/handlers/stores/slot-board-store").SlotBoardStore;
        const MockedSlotDurationStore = jest.requireMock("../../assets/scripts/handlers/stores/slot-duration-store").SlotDurationStore;

        mockBetControlStore = new MockedBetControlStore() as jest.Mocked<BetControlStore>;
        mockSlotBoardStore = new MockedSlotBoardStore() as jest.Mocked<SlotBoardStore>;
        mockSlotDurationStore = new MockedSlotDurationStore() as jest.Mocked<SlotDurationStore>;

        // Create mock UI components
        mockSlotBoard = new (jest.requireMock("../../assets/scripts/components/slot-board/slot-board").default)() as jest.Mocked<SlotBoard>;
        mockGameAtlas = {} as SpriteAtlas;
        mockSharedSlotAtlas = {} as SpriteAtlas;
        mockColorJson = {
            json: {
                previewOddsSymbolNumberColor: "#ffffff",
                previewOddsWinValueColor: "#ffff00",
                previewOddsBorderColor: "#ff0000",
            },
        } as unknown as JsonAsset;

        // Bind to container
        container.bind(BetControlStore).toConstantValue(mockBetControlStore);
        container.bind(SlotBoardStore).toConstantValue(mockSlotBoardStore);
        container.bind(SlotDurationStore).toConstantValue(mockSlotDurationStore);

        // Create component instance
        component = new ClassicSlot();

        // Set up component properties
        component.slotBoard = mockSlotBoard;
        component.gameAtlas = mockGameAtlas;
        component.sharedSlotAtlas = mockSharedSlotAtlas;
        component.colorJson = mockColorJson;
        component.lblRoundId = new Label();

        // Add missing methods
        component.getComponent = jest.fn();
        component.node = { on: jest.fn(), off: jest.fn() } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe("initSharedCaches", () => {
        it("should initialize slot game configs and load resources", () => {
            const initSlotGameConfigsSpy = jest.spyOn(component as any, "initSlotGameConfigs").mockImplementation();
            const { resourceCaches } = jest.requireMock("../../assets/scripts/utils/classic-slot-utils");

            component.initSharedCaches();

            expect(initSlotGameConfigsSpy).toHaveBeenCalled();
            expect(resourceCaches.gameAtlas).toBe(mockGameAtlas);
            expect(resourceCaches.sharedSlotAtlas).toBe(mockSharedSlotAtlas);
            expect(resourceCaches.colorJson).toBe(mockColorJson.json);
        });
    });

    describe("initSlotGameConfigs", () => {
        it("should create custom slot game configs and set them", () => {
            const customSlotGameConfigsSpy = jest.spyOn(component as any, "customSlotGameConfigs");
            const setSlotGameConfigsSpy = jest.spyOn(component as any, "setSlotGameConfigs").mockImplementation();
            const mockConfig = new StandardSlotGameConfigs();
            customSlotGameConfigsSpy.mockReturnValue(mockConfig);

            //@ts-ignore
            component.initSlotGameConfigs();

            expect(customSlotGameConfigsSpy).toHaveBeenCalled();
            expect(setSlotGameConfigsSpy).toHaveBeenCalledWith(mockConfig);
        });
    });

    describe("customSlotGameConfigs", () => {
        it("should return StandardSlotGameConfigs instance", () => {
            //@ts-ignore
            const result = component.customSlotGameConfigs();

            expect(result).toBeDefined();
            expect(typeof result).toBe("object");
        });
    });

    describe("setSlotGameConfigs", () => {
        it("should call setSlotGameConfigs utility and return config", () => {
            const { setSlotGameConfigs } = jest.requireMock("../../assets/scripts/utils/classic-slot-utils");
            const mockConfig = new StandardSlotGameConfigs();

            //@ts-ignore
            const result = component.setSlotGameConfigs(mockConfig);

            expect(setSlotGameConfigs).toHaveBeenCalledWith(mockConfig);
            expect(result).toBe(mockConfig);
        });
    });

    describe("renderSpinRoundId", () => {
        it("should set lblRoundId string when roundId is not -1", () => {
            const roundId = 12345;

            component.renderSpinRoundId(roundId);

            expect(component.lblRoundId.string).toBe("#12345");
        });

        it("should not set lblRoundId string when roundId is -1", () => {
            const originalString = component.lblRoundId.string;

            component.renderSpinRoundId(-1);

            expect(component.lblRoundId.string).toBe(originalString);
        });
    });

    describe("renderRoundId", () => {
        it("should override parent method and do nothing", () => {
            // This method intentionally does nothing as it overrides parent behavior
            expect(() => component.renderRoundId(123)).not.toThrow();
        });
    });

    describe("isValidResult", () => {
        it("should return true when result exists", () => {
            const result = { some: "data" };
            const settlementResult = { settlement: "data" };

            const isValid = component.isValidResult(result as any, settlementResult as any);

            expect(isValid).toBe(true);
        });

        it("should return false when result is null", () => {
            const result = null;
            const settlementResult = { settlement: "data" };

            const isValid = component.isValidResult(result as any, settlementResult as any);

            expect(isValid).toBe(false);
        });

        it("should return false when result is undefined", () => {
            const result = undefined;
            const settlementResult = { settlement: "data" };

            const isValid = component.isValidResult(result as any, settlementResult as any);

            expect(isValid).toBe(false);
        });
    });

    describe("initSlotBoard", () => {
        it("should initialize reels and set symbol preview callback", () => {
            const setBoardFullItemsSpy = jest.spyOn(component as any, "setBoardFullItems").mockImplementation();
            component.initSlotBoard();

            expect(mockSlotBoard.initReels).toHaveBeenCalled();
            expect(mockSlotBoard.previewPopup.onSymbolPreview).toBeDefined();
            expect(mockSlotBoard.setItemWinningEffect).toHaveBeenCalled();
            expect(setBoardFullItemsSpy).toHaveBeenCalled();
        });
    });

    describe("onSymbolPreview", () => {
        const mockSymbol = { index: 0 };
        let worldPosition: Vec3;

        beforeEach(() => {
            component.gameConfigOdds = { 0: 1.5, 1: 2.0 };
            component.jackpotEnabled = true;
            worldPosition = { x: 100, y: 200, z: 0 } as Vec3;
        });

        it("should show preview popup when gameConfigOdds exists and ready bet", () => {
            component.isReadyBet = true;
            component.onSymbolPreview(mockSymbol, worldPosition, false);

            expect(AudioUtils.playSFX).toHaveBeenCalled();
            expect(mockSlotBoard.showPreviewPopup).toHaveBeenCalledWith(
                expect.objectContaining({
                    symbol: mockSymbol,
                    odds: 1.5,
                    jackpotEnabled: true,
                    colorList: ["#ffffff", "#ffff00"],
                    borderColor: "#ff0000",
                }),
                false,
                worldPosition
            );
        });

        it("should not show preview popup when gameConfigOdds is null", () => {
            component.gameConfigOdds = null;

            component.onSymbolPreview(mockSymbol, worldPosition, false);

            expect(AudioUtils.playSFX).not.toHaveBeenCalled();
            expect(mockSlotBoard.showPreviewPopup).not.toHaveBeenCalled();
        });

        it("should not show preview popup when gameConfigOdds is undefined", () => {
            component.gameConfigOdds = undefined;

            component.onSymbolPreview(mockSymbol, worldPosition, false);

            expect(AudioUtils.playClick).not.toHaveBeenCalled();
            expect(mockSlotBoard.showPreviewPopup).not.toHaveBeenCalled();
        });
    });

    describe("renderGameOdd", () => {
        it("should set gameConfigOdds property", () => {
            const mockOdds = { 0: 1.5, 1: 2.0, 2: 3.0 };

            component.renderGameOdd(mockOdds);

            expect(component.gameConfigOdds).toBe(mockOdds);
        });
    });

    describe("renderSpinResult", () => {
        it("should set board data and spin with given parameters", async () => {
            const spinResult = {
                result: [1, 2, 3, 4, 5],
                duration: 2000,
                turbo: false,
                onComplete: jest.fn(),
            };

            await component.renderSpinResult(spinResult);

            expect(mockSlotBoard.setBoardData).toHaveBeenCalledWith([1, 2, 3, 4, 5]);
            expect(mockSlotBoard.spin).toHaveBeenCalledWith(2000, false);
        });

        it("should handle turbo spin", async () => {
            const spinResult = {
                result: [5, 4, 3, 2, 1],
                duration: 1000,
                turbo: true,
                onComplete: jest.fn(),
            };

            await component.renderSpinResult(spinResult);

            expect(mockSlotBoard.setBoardData).toHaveBeenCalledWith([5, 4, 3, 2, 1]);
            expect(mockSlotBoard.spin).toHaveBeenCalledWith(1000, true);
        });
    });

    describe("renderHighlightSpecialSymbols", () => {
        it("should call highlightSpecialSymbols on slot board", () => {
            const specialSymbols = [1, 3, 5];

            component.renderHighlightSpecialSymbols(specialSymbols);

            expect(mockSlotBoard.highlightSpecialSymbols).toHaveBeenCalledWith(specialSymbols);
        });

        it("should handle empty array", () => {
            component.renderHighlightSpecialSymbols([]);

            expect(mockSlotBoard.highlightSpecialSymbols).toHaveBeenCalledWith([]);
        });
    });

    describe("renderWinningItems", () => {
        it("should hide winning effect and show effect for each line", () => {
            const mockLineData: LineData[] = [
                { payline: 1, positions: [0, 1, 2], symbol: 5 },
                { payline: 2, positions: [1, 1, 1], symbol: 3 },
            ];

            component.renderWinningItems(mockLineData);

            expect(mockSlotBoard.hideWinningEffect).toHaveBeenCalled();
            expect(mockSlotBoard.showWinningEffectOnLine).toHaveBeenCalledTimes(2);
            expect(mockSlotBoard.showWinningEffectOnLine).toHaveBeenNthCalledWith(1, mockLineData[0]);
            expect(mockSlotBoard.showWinningEffectOnLine).toHaveBeenNthCalledWith(2, mockLineData[1]);
        });

        it("should only hide winning effect when no winning items", () => {
            component.renderWinningItems([]);

            expect(mockSlotBoard.hideWinningEffect).toHaveBeenCalled();
            expect(mockSlotBoard.showWinningEffectOnLine).not.toHaveBeenCalled();
        });
    });

    describe("updateBalanceColor", () => {
        let mockMainPlayerProfile: any;
        let mockComponentUtils: any;

        beforeEach(() => {
            // Mock MainPlayerProfile component
            mockMainPlayerProfile = {
                lblBalance: {
                    node: { getComponent: jest.fn() },
                },
            };

            // Get mocked ComponentUtils
            mockComponentUtils = jest.requireMock("db://shared-components/shared/utils").ComponentUtils;

            // Mock getComponentInChildren to return MainPlayerProfile
            component.getComponentInChildren = jest.fn().mockReturnValue(mockMainPlayerProfile);
        });

        it("should update balance color when MainPlayerProfile is found", () => {
            const { resourceCaches } = jest.requireMock("../../assets/scripts/utils/classic-slot-utils");

            component.updateBalanceColor();

            expect(component.getComponentInChildren).toHaveBeenCalledWith(expect.objectContaining({ default: expect.any(Function) }));
            expect(mockComponentUtils.setNodeColor).toHaveBeenCalledWith(
                mockMainPlayerProfile.lblBalance.node,
                resourceCaches.colorJson.bottomAreaWinAmountColor
            );
        });

        it("should not update balance color when MainPlayerProfile is not found", () => {
            // Mock getComponentInChildren to return null
            component.getComponentInChildren = jest.fn().mockReturnValue(null);

            component.updateBalanceColor();

            expect(component.getComponentInChildren).toHaveBeenCalledWith(expect.objectContaining({ default: expect.any(Function) }));
            expect(mockComponentUtils.setNodeColor).not.toHaveBeenCalled();
        });

        it("should not update balance color when MainPlayerProfile is undefined", () => {
            // Mock getComponentInChildren to return undefined
            component.getComponentInChildren = jest.fn().mockReturnValue(undefined);

            component.updateBalanceColor();

            expect(component.getComponentInChildren).toHaveBeenCalledWith(expect.objectContaining({ default: expect.any(Function) }));
            expect(mockComponentUtils.setNodeColor).not.toHaveBeenCalled();
        });

        it("should use correct color from resourceCaches", () => {
            // Set up a specific color in resourceCaches
            const { resourceCaches } = jest.requireMock("../../assets/scripts/utils/classic-slot-utils");
            const expectedColor = "#FF5733";
            resourceCaches.colorJson.bottomAreaWinAmountColor = expectedColor;

            component.updateBalanceColor();

            expect(mockComponentUtils.setNodeColor).toHaveBeenCalledWith(mockMainPlayerProfile.lblBalance.node, expectedColor);
        });

        it("should handle MainPlayerProfile with null lblBalance", () => {
            // Mock MainPlayerProfile with null lblBalance
            mockMainPlayerProfile.lblBalance = null;
            component.getComponentInChildren = jest.fn().mockReturnValue(mockMainPlayerProfile);

            expect(() => component.updateBalanceColor()).toThrow();
        });
    });

    describe("renderJackpotEnabled", () => {
        let mockLoadSymbols: jest.SpyInstance;
        let mockInitSlotBoard: jest.SpyInstance;

        beforeEach(() => {
            // Mock the loadSymbols method
            mockLoadSymbols = jest.spyOn(component, "loadSymbols").mockResolvedValue(undefined);
            // Mock the initSlotBoard method
            mockInitSlotBoard = jest.spyOn(component, "initSlotBoard").mockImplementation();
        });

        it("should set jackpotEnabled to true when enabled is true", async () => {
            const jackpotEnabled = { enabled: true };

            await component.renderJackpotEnabled(jackpotEnabled);

            expect(component.jackpotEnabled).toBe(true);
            expect(mockLoadSymbols).toHaveBeenCalled();
            expect(mockInitSlotBoard).toHaveBeenCalled();
        });

        it("should set jackpotEnabled to false when enabled is false", async () => {
            const jackpotEnabled = { enabled: false };

            await component.renderJackpotEnabled(jackpotEnabled);

            expect(component.jackpotEnabled).toBe(false);
            expect(mockLoadSymbols).toHaveBeenCalled();
            expect(mockInitSlotBoard).toHaveBeenCalled();
        });

        it("should handle undefined jackpotEnabled parameter", async () => {
            const jackpotEnabled = undefined;

            await component.renderJackpotEnabled(jackpotEnabled);

            expect(component.jackpotEnabled).toBeUndefined();
            expect(mockLoadSymbols).toHaveBeenCalled();
            expect(mockInitSlotBoard).toHaveBeenCalled();
        });

        it("should call loadSymbols and initSlotBoard in sequence", async () => {
            const jackpotEnabled = { enabled: true };
            let loadSymbolsCalled = false;
            let initSlotBoardCalled = false;

            mockLoadSymbols.mockImplementation(async () => {
                loadSymbolsCalled = true;
                expect(initSlotBoardCalled).toBe(false);
            });

            mockInitSlotBoard.mockImplementation(() => {
                initSlotBoardCalled = true;
                expect(loadSymbolsCalled).toBe(true);
            });

            await component.renderJackpotEnabled(jackpotEnabled);

            expect(loadSymbolsCalled).toBe(true);
            expect(initSlotBoardCalled).toBe(true);
        });

        it("should pass correct jackpotEnabled value to loadSymbols", async () => {
            const jackpotEnabled = { enabled: true };

            await component.renderJackpotEnabled(jackpotEnabled);

            expect(mockLoadSymbols).toHaveBeenCalledWith();
            // Verify that loadSymbols is called after jackpotEnabled is set
            expect(component.jackpotEnabled).toBe(true);
        });
    });

    describe("renderReadyBet", () => {
        it("should work with boolean values from store", () => {
            // Simulate different boolean values that might come from the store
            const testCases = [true, false, true, false];

            testCases.forEach((expectedValue, index) => {
                component.renderReadyBet(expectedValue);
                expect(component.isReadyBet).toBe(expectedValue);
            });
        });
    });
});
