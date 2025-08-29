import { Button, Label, Node, Prefab } from "cc";
import { resourceCaches } from "../../../assets/scripts/utils/classic-slot-utils";
import { Container } from "inversify";
import "reflect-metadata";
import BonusDialog from "../../../assets/scripts/components/bonus/bonus-dialog";
import { SlotGameBaseConfigs } from "../../../assets/scripts/config/slot-game-base-configs";

// Mock game client base
jest.mock("@sg/game-client-base", () => ({
    FormatUtils: {
        numberWithCommas: jest.fn((num: number, decimals: number) => num.toLocaleString()),
    },
}));

// Mock AudioIds and AudioUtils
jest.mock("db://assets/game/audios/AudioIds", () => ({
    AudioIds: {
        BONUS_ITEM: "bonus_item",
        BONUS_TOTAL: "bonus_total",
    },
}));

jest.mock("db://shared-components/game/audios/utils", () => ({
    AudioUtils: {
        playSFX: jest.fn(),
    },
}));

// Mock RawTimer
jest.mock("db://shared-components/game/game-timer/scripts/raw-timer", () => ({
    __esModule: true,
    default: class MockRawTimer {
        node = new Node();
    },
}));

// Mock ObserverComponent
jest.mock("db://shared-components/shared/common-components/observer-component/scripts/observer-component", () => ({
    ObserverComponent: class MockObserverComponent {
        onLoad() {}
        onDestroy() {}
        start() {}
        update() {}
        node = new Node();
    },
}));

// Mock ComponentUtils
jest.mock("db://shared-components/shared/utils", () => ({
    ComponentUtils: {
        setNodeColor: jest.fn(),
    },
}));

// Mock Observer
jest.mock("observer", () => ({
    __esModule: true,
    default: {
        handle: jest.fn(() => () => {}),
        render: jest.fn(() => () => {}),
    },
    handle: jest.fn(() => () => {}),
    render: jest.fn(() => () => {}),
}));

// Mock handlers and stores
jest.mock("../../../assets/scripts/handlers/handlers/slot-settlement-handlers", () => ({
    SlotSettlementHandler: class MockSlotSettlementHandler {
        requestOpenBonus = jest.fn();
    },
}));

jest.mock("../../../assets/scripts/handlers/stores/slot-board-store", () => ({
    SlotBoardStore: class MockSlotBoardStore {
        bonusChest = null;
    },
}));

jest.mock("../../../assets/scripts/handlers/stores/slot-duration-store", () => ({
    SlotDurationStore: class MockSlotDurationStore {
        config = null;
    },
}));

// Mock classic-slot-utils
jest.mock("../../../assets/scripts/utils/classic-slot-utils", () => ({
    initTimer: jest.fn().mockReturnValue({
        stop: jest.fn(),
    }),
}));

// Mock BonusItem
jest.mock("../../../assets/scripts/components/bonus/bonus-item", () => ({
    __esModule: true,
    default: class MockBonusItem {
        open = jest.fn();
    },
}));

// Mock cc components
jest.mock("cc", () => {
    const originalCc = jest.requireActual("cc");
    return {
        ...originalCc,
        instantiate: jest.fn().mockImplementation(() => {
            const node = new originalCc.Node();
            node.getComponent = jest.fn();
            node.on = jest.fn();
            return node;
        }),
        tween: jest.fn().mockReturnValue({
            delay: jest.fn().mockReturnThis(),
            call: jest.fn().mockReturnThis(),
            start: jest.fn(),
        }),
    };
});

jest.mock("../../../assets/scripts/utils/classic-slot-utils", () => ({
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

describe("BonusDialog", () => {
    let container: Container;
    let bonusDialog: BonusDialog;
    let mockSlotGameConfigs: SlotGameBaseConfigs;
    let mockTween: any;
    let mockTimer: any;
    let mockButton: Button;
    let mockBonusItem: any;
    resourceCaches;

    beforeEach(() => {
        container = new Container();

        // Create mock instances
        mockSlotGameConfigs = {
            showTotalBonusAmountDuration: 3000,
            bonusTimeOut: 30000,
        } as SlotGameBaseConfigs;

        mockTween = {
            stop: jest.fn(),
            delay: jest.fn().mockReturnThis(),
            call: jest.fn().mockReturnThis(),
            start: jest.fn(),
        };

        mockTimer = {
            node: new Node(),
        };

        mockButton = new Button();
        mockButton.interactable = true;

        mockBonusItem = {
            open: jest.fn(),
        };

        // Create component instance
        bonusDialog = new BonusDialog();

        // Set up UI properties
        bonusDialog.content = new Node();
        bonusDialog.bonusCount = new Label();
        bonusDialog.timer = mockTimer as any;
        bonusDialog.totalBonusNode = new Node();
        bonusDialog.totalBonusLabel = new Label();
        bonusDialog.bonusItem = new Prefab();
        bonusDialog.node = new Node();
        bonusDialog.slotGameConfigs = mockSlotGameConfigs;
        (bonusDialog as any).timerTween = mockTween;
        bonusDialog.onBonusFinished = jest.fn();

        // Add missing methods
        bonusDialog.node.destroy = jest.fn();
        bonusDialog.content.destroyAllChildren = jest.fn();
        bonusDialog.content.addChild = jest.fn();

        // Mock children property as writable
        Object.defineProperty(bonusDialog.content, "children", {
            value: [],
            writable: true,
            configurable: true,
            enumerable: true,
        });

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("initBonusItems", () => {
        it("should create bonus items and set up click handlers", () => {
            const mockChild = new Node();
            mockChild.getComponent = jest.fn().mockReturnValue(mockBonusItem);
            mockChild.on = jest.fn();

            // Set children using the writable property
            Object.defineProperty(bonusDialog.content, "children", {
                value: [mockChild],
                writable: true,
                configurable: true,
                enumerable: true,
            });
            jest.spyOn(bonusDialog, "createBonusItems").mockImplementation(() => {});

            bonusDialog.initBonusItems();

            expect(bonusDialog.createBonusItems).toHaveBeenCalled();
            expect(mockChild.on).toHaveBeenCalledWith("click", expect.any(Function));
            expect(bonusDialog.items).toContain(mockBonusItem);
        });

        it("should handle click events and call onItemClicked", () => {
            const mockChild = new Node();
            const mockClickHandler = jest.fn();

            mockChild.getComponent = jest.fn().mockReturnValueOnce(mockBonusItem).mockReturnValueOnce(mockButton);
            mockChild.on = jest.fn().mockImplementation((event, handler) => {
                if (event === "click") {
                    mockClickHandler.mockImplementation(handler);
                }
            });

            // Set children using the writable property
            Object.defineProperty(bonusDialog.content, "children", {
                value: [mockChild],
                writable: true,
                configurable: true,
                enumerable: true,
            });
            jest.spyOn(bonusDialog, "createBonusItems").mockImplementation(() => {});

            // Use type assertion to access protected method
            const onItemClickedSpy = jest.spyOn(bonusDialog as any, "onItemClicked").mockReturnValue(0);

            (bonusDialog as any).totalBonus = 5;
            (bonusDialog as any).openedBonus = 2;

            bonusDialog.initBonusItems();
            mockClickHandler();

            expect(onItemClickedSpy).toHaveBeenCalledWith(0);
            expect(mockButton.interactable).toBe(false);
        });
    });

    describe("createBonusItems", () => {
        it("should create 10 bonus items when bonusItem prefab exists", () => {
            const { instantiate } = require("cc");
            const mockNode = new Node();
            mockNode.name = "";
            instantiate.mockReturnValue(mockNode);

            bonusDialog.createBonusItems();

            expect(bonusDialog.content.destroyAllChildren).toHaveBeenCalled();
            expect(instantiate).toHaveBeenCalledTimes(10);
            expect(bonusDialog.content.addChild).toHaveBeenCalledTimes(10);
        });

        it("should return early if bonusItem prefab is null", () => {
            bonusDialog.bonusItem = null;

            bonusDialog.createBonusItems();

            expect(bonusDialog.content.destroyAllChildren).not.toHaveBeenCalled();
        });
    });

    describe("renderConfig", () => {
        it("should set slotGameConfigs property", () => {
            const config = { bonusTimeOut: 25000 } as SlotGameBaseConfigs;

            bonusDialog.renderConfig(config);

            expect(bonusDialog.slotGameConfigs).toBe(config);
        });
    });

    describe("openBonus", () => {
        beforeEach(() => {
            bonusDialog.items = [mockBonusItem, mockBonusItem];
            (bonusDialog as any).totalBonus = 3;
            (bonusDialog as any).openedBonus = 0;
            (bonusDialog as any).totalValue = 0;

            jest.spyOn(bonusDialog, "updateBonusCount").mockImplementation(() => {});
            jest.spyOn(bonusDialog, "checkFinishBonus").mockImplementation(() => {});
        });

        it("should open bonus item and update counters", () => {
            const bonusChest = { chest: 0, amount: 100 };

            bonusDialog.openBonus(bonusChest);

            expect(mockBonusItem.open).toHaveBeenCalledWith(100);
            expect((bonusDialog as any).openedBonus).toBe(1);
            expect((bonusDialog as any).totalValue).toBe(100);
            expect(bonusDialog.updateBonusCount).toHaveBeenCalled();
            expect(bonusDialog.checkFinishBonus).toHaveBeenCalled();
        });

        it("should return early if bonusChest is null", () => {
            bonusDialog.openBonus(null);

            expect(mockBonusItem.open).not.toHaveBeenCalled();
            expect(bonusDialog.updateBonusCount).not.toHaveBeenCalled();
        });
    });

    describe("hideTimer", () => {
        it("should hide timer and stop tween", () => {
            bonusDialog.hideTimer();

            expect(bonusDialog.timer.node.active).toBe(false);
            expect(mockTween.stop).toHaveBeenCalled();
        });
    });

    describe("showTotalAmount", () => {
        beforeEach(() => {
            const { AudioUtils } = require("db://shared-components/game/audios/utils");
            const gc = require("@sg/game-client-base");

            (bonusDialog as any).totalValue = 1500;
            jest.spyOn(bonusDialog, "hideTimer").mockImplementation(() => {});

            AudioUtils.playSFX.mockClear();
            gc.FormatUtils.numberWithCommas.mockReturnValue("1,500.00");
        });

        it("should play audio, hide timer and show total amount", () => {
            const { AudioUtils } = require("db://shared-components/game/audios/utils");
            const { AudioIds } = require("db://assets/game/audios/AudioIds");

            bonusDialog.showTotalAmount();

            expect(AudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.BONUS_TOTAL);
            expect(bonusDialog.hideTimer).toHaveBeenCalled();
            expect(bonusDialog.totalBonusNode.active).toBe(true);
            expect(bonusDialog.totalBonusLabel.string).toBe("+1,500.00");
        });
    });

    describe("checkFinishBonus", () => {
        beforeEach(() => {
            const { tween } = require("cc");
            (bonusDialog as any).totalBonus = 3;
            (bonusDialog as any).openedBonus = 3;

            jest.spyOn(bonusDialog, "showTotalAmount").mockImplementation(() => {});
            jest.spyOn(bonusDialog, "showTotalBonusWinTime").mockReturnValue(2000);

            tween.mockReturnValue(mockTween);
        });

        it("should start finish sequence when all bonuses are opened", () => {
            const { tween } = require("cc");

            bonusDialog.checkFinishBonus();

            expect(tween).toHaveBeenCalledWith(bonusDialog);
            expect(mockTween.delay).toHaveBeenCalledWith(1);
            expect(mockTween.call).toHaveBeenCalledTimes(2);
            expect(mockTween.start).toHaveBeenCalled();
        });

        it("should not start finish sequence when bonuses are not all opened", () => {
            const { tween } = require("cc");
            (bonusDialog as any).openedBonus = 2;

            bonusDialog.checkFinishBonus();

            expect(tween).not.toHaveBeenCalled();
        });
    });

    describe("showTotalBonusWinTime", () => {
        it("should return correct duration minus delay time", () => {
            const delayTime = 1;
            const expectedDuration = mockSlotGameConfigs.showTotalBonusAmountDuration - delayTime;

            const result = bonusDialog.showTotalBonusWinTime(delayTime);

            expect(result).toBe(expectedDuration);
        });
    });

    describe("setBonusCount", () => {
        it("should set total bonus and update display", () => {
            jest.spyOn(bonusDialog, "updateBonusCount").mockImplementation(() => {});
            jest.spyOn(bonusDialog, "updateBonusCountItemTextColor").mockImplementation(() => {});

            bonusDialog.setBonusCount(5);

            expect((bonusDialog as any).totalBonus).toBe(5);
            expect(bonusDialog.updateBonusCount).toHaveBeenCalled();
            expect(bonusDialog.updateBonusCountItemTextColor).toHaveBeenCalled();
        });
    });

    describe("updateBonusCountItemTextColor", () => {
        it("should update bonus count text color", () => {
            const { ComponentUtils } = require("db://shared-components/shared/utils");
            const color = "#FF0000";

            bonusDialog.updateBonusCountItemTextColor(color);

            expect(ComponentUtils.setNodeColor).toHaveBeenCalledWith(bonusDialog.bonusCount.node, color);
        });
    });

    describe("updateBonusCount", () => {
        it("should update bonus count label with remaining count", () => {
            (bonusDialog as any).totalBonus = 5;
            (bonusDialog as any).openedBonus = 2;

            bonusDialog.updateBonusCount();

            expect(bonusDialog.bonusCount.string).toBe("3");
        });
    });

    describe("onItemClicked", () => {
        it("should return the clicked index", () => {
            const index = 3;

            const result = (bonusDialog as any).onItemClicked(index);

            expect(result).toBe(index);
        });
    });
});
