import "reflect-metadata";

import { JsonAsset, Label, SpriteAtlas, Vec3 } from "cc";
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
    },
    setSlotGameConfigs: jest.fn(),
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
        it("should initialize slot game configs and load resources", async () => {
            const initSlotGameConfigsSpy = jest.spyOn(component as any, "initSlotGameConfigs").mockImplementation();
            const { loadSlotSymbols, loadWinningSymbolAnimation, resourceCaches } = jest.requireMock(
                "../../assets/scripts/utils/classic-slot-utils"
            );

            await component.initSharedCaches();

            expect(initSlotGameConfigsSpy).toHaveBeenCalled();
            expect(resourceCaches.gameAtlas).toBe(mockGameAtlas);
            expect(resourceCaches.sharedSlotAtlas).toBe(mockSharedSlotAtlas);
            expect(loadSlotSymbols).toHaveBeenCalledWith(component.jackpotEnabled);
            expect(loadWinningSymbolAnimation).toHaveBeenCalled();
        });
    });

    describe("initSlotGameConfigs", () => {
        it("should create custom slot game configs and set them", () => {
            const customSlotGameConfigsSpy = jest.spyOn(component as any, "customSlotGameConfigs");
            const setSlotGameConfigsSpy = jest.spyOn(component as any, "setSlotGameConfigs").mockImplementation();
            const mockConfig = new StandardSlotGameConfigs();
            customSlotGameConfigsSpy.mockReturnValue(mockConfig);

            (component as any).initSlotGameConfigs();

            expect(customSlotGameConfigsSpy).toHaveBeenCalled();
            expect(setSlotGameConfigsSpy).toHaveBeenCalledWith(mockConfig);
        });
    });

    describe("customSlotGameConfigs", () => {
        it("should return StandardSlotGameConfigs instance", () => {
            const result = (component as any).customSlotGameConfigs();

            expect(result).toBeDefined();
            expect(typeof result).toBe("object");
        });
    });

    describe("setSlotGameConfigs", () => {
        it("should call setSlotGameConfigs utility and return config", () => {
            const { setSlotGameConfigs } = jest.requireMock("../../assets/scripts/utils/classic-slot-utils");
            const mockConfig = new StandardSlotGameConfigs();

            const result = (component as any).setSlotGameConfigs(mockConfig);

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
            component.initSlotBoard();

            expect(mockSlotBoard.initReels).toHaveBeenCalled();
            expect(mockSlotBoard.previewPopup.onSymbolPreview).toBeDefined();
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

        it("should show preview popup when gameConfigOdds exists", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");

            component.onSymbolPreview(mockSymbol, worldPosition, false);

            expect(AudioUtils.playClick).toHaveBeenCalled();
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
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");

            component.onSymbolPreview(mockSymbol, worldPosition, false);

            expect(AudioUtils.playClick).not.toHaveBeenCalled();
            expect(mockSlotBoard.showPreviewPopup).not.toHaveBeenCalled();
        });

        it("should not show preview popup when gameConfigOdds is undefined", () => {
            component.gameConfigOdds = undefined;
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");

            component.onSymbolPreview(mockSymbol, worldPosition, false);

            expect(AudioUtils.playClick).not.toHaveBeenCalled();
            expect(mockSlotBoard.showPreviewPopup).not.toHaveBeenCalled();
        });
    });

    describe("renderJackpotEnabled", () => {
        it("should set jackpotEnabled property", () => {
            component.renderJackpotEnabled({ enabled: true });
            expect(component.jackpotEnabled).toBe(true);
        });

        it("should initialize slot board after caches", async () => {
            const initSharedCachesSpy = jest.spyOn(component, "initSharedCaches").mockResolvedValue();
            const initSlotBoardSpy = jest.spyOn(component, "initSlotBoard").mockImplementation();

            component.renderJackpotEnabled({ enabled: true });

            expect(initSharedCachesSpy).toHaveBeenCalled();

            // Wait for promise to resolve
            await new Promise((resolve) => setTimeout(resolve, 0));
            expect(initSlotBoardSpy).toHaveBeenCalled();
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
});
