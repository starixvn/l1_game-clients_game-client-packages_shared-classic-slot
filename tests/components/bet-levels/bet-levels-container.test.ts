import "reflect-metadata";
//rest
import { instantiate, Node, Prefab } from "cc";
import { Container } from "inversify";
import BetLevelsContainer from "../../../assets/scripts/components/bet-levels/bet-levels-container";
import { BetControlStore } from "../../../assets/scripts/handlers/stores/bet-control-store";

// Mock ComponentUtils
jest.mock("db://shared-components/shared/utils", () => ({
    ComponentUtils: {
        setNodeTransform: jest.fn(),
        setOpacityNode: jest.fn(),
    },
    AnimationUtils: {
        fadeOut: jest.fn(),
        fadeIn: jest.fn(),
    },
}));

// Mock ObserverComponent
jest.mock("db://shared-components/shared/common-components/observer-component/scripts/observer-component", () => ({
    ObserverComponent: class MockObserverComponent {
        onLoad() {}
        onDestroy() {}
        node = new (require("cc").Node)();
    },
}));

// Mock BetControlStore
jest.mock("../../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(() => ({
        betLevels: [],
        stakeSelectorShow: false,
        stakeIndex: -1,
        setStake: jest.fn(),
        setStakeSelectorShow: jest.fn(),
    })),
}));

// Mock BetLevelItem
jest.mock("../../../assets/scripts/components/bet-levels/bet-level-item", () => ({
    default: class MockBetLevelItem {
        setData = jest.fn();
        setActive = jest.fn();
        onStakeChanged = jest.fn();
    },
}));

// Mock tween and instantiate
jest.mock("cc", () => {
    const actual = jest.requireActual("cc");
    const mockTweenChain = {
        to: jest.fn().mockReturnThis(),
        call: jest.fn().mockReturnThis(),
        start: jest.fn().mockReturnThis(),
    };
    return {
        ...actual,
        tween: jest.fn(() => mockTweenChain),
        instantiate: jest.fn(),
        v3: jest.fn((x: number, y: number, z: number) => ({ x, y, z })),
    };
});

describe("BetLevelsContainer", () => {
    let container: Container;
    let component: BetLevelsContainer;
    let mockBetControlStore: jest.Mocked<BetControlStore>;
    let mockContainerNode: Node;
    let mockItemPrefab: Prefab;
    let mockInstantiate: jest.MockedFunction<typeof instantiate>;

    beforeEach(() => {
        container = new Container();

        // Create mock store
        const MockedBetControlStore = jest.requireMock("../../../assets/scripts/handlers/stores/bet-control-store").BetControlStore;
        mockBetControlStore = new MockedBetControlStore() as jest.Mocked<BetControlStore>;

        // Create component instance
        component = new BetLevelsContainer();

        // Set up component properties
        mockContainerNode = new Node();
        mockContainerNode.destroyAllChildren = jest.fn();
        mockContainerNode.addChild = jest.fn();
        // Override children getter to return a mutable array
        Object.defineProperty(mockContainerNode, "children", {
            value: [],
            writable: true,
            configurable: true,
        });

        mockItemPrefab = {} as Prefab;

        component.containerNode = mockContainerNode;
        component.itemPrefab = mockItemPrefab;
        component.node = new Node();

        // Mock node methods
        component.node.active = true;

        // Bind to container
        container.bind(BetControlStore).toConstantValue(mockBetControlStore);

        // Set up instantiate mock
        mockInstantiate = instantiate as jest.MockedFunction<typeof instantiate>;
        const mockItemNode = new Node();
        mockItemNode.getComponent = jest
            .fn()
            .mockReturnValue(new (jest.requireMock("../../../assets/scripts/components/bet-levels/bet-level-item").default)());
        mockInstantiate.mockReturnValue(mockItemNode);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("onLoad", () => {
        it("should destroy all children and call onHidden", () => {
            const onHiddenSpy = jest.spyOn(component as any, "onHidden");

            component.onLoad();

            expect(mockContainerNode.destroyAllChildren).toHaveBeenCalled();
            expect(onHiddenSpy).toHaveBeenCalled();
        });
    });

    describe("setBetLevels", () => {
        it("should return early when betLevels is empty", () => {
            const initBetLevelItemsSpy = jest.spyOn(component as any, "initBetLevelItems");
            const calculateContainerHeightSpy = jest.spyOn(component as any, "calculateContainerHeight");

            component.setBetLevels([]);

            expect(initBetLevelItemsSpy).not.toHaveBeenCalled();
            expect(calculateContainerHeightSpy).not.toHaveBeenCalled();
        });

        it("should sort bet levels and initialize items", () => {
            const initBetLevelItemsSpy = jest.spyOn(component as any, "initBetLevelItems");
            const calculateContainerHeightSpy = jest.spyOn(component as any, "calculateContainerHeight");
            const unsortedBetLevels = [100, 50, 200];

            component.setBetLevels(unsortedBetLevels);

            expect((component as any).betLevels).toEqual([50, 100, 200]);
            expect(initBetLevelItemsSpy).toHaveBeenCalled();
            expect(calculateContainerHeightSpy).toHaveBeenCalled();
        });
    });

    describe("initBetLevelItems", () => {
        beforeEach(() => {
            (component as any).betLevels = [10, 20, 30];
            (component as any).stakeIndex = 1;
        });

        it("should create bet level items for each bet level", () => {
            const mockBetLevelItem = new (jest.requireMock("../../../assets/scripts/components/bet-levels/bet-level-item").default)();
            const mockNode = new Node();
            mockNode.getComponent = jest.fn().mockReturnValue(mockBetLevelItem);
            mockInstantiate.mockReturnValue(mockNode);

            const updateStateSelectedSpy = jest.spyOn(component as any, "updateStateSelected");

            (component as any).initBetLevelItems();

            expect(mockInstantiate).toHaveBeenCalledTimes(3);
            expect(mockContainerNode.addChild).toHaveBeenCalledTimes(3);
            expect(mockBetLevelItem.setData).toHaveBeenCalledWith("10", 0);
            expect(mockBetLevelItem.setData).toHaveBeenCalledWith("20", 1);
            expect(mockBetLevelItem.setData).toHaveBeenCalledWith("30", 2);
            expect(updateStateSelectedSpy).toHaveBeenCalledWith(1);
        });

        it("should set up onStakeChanged callback for each item", () => {
            const mockBetLevelItem = new (jest.requireMock("../../../assets/scripts/components/bet-levels/bet-level-item").default)();
            const mockNode = new Node();
            mockNode.getComponent = jest.fn().mockReturnValue(mockBetLevelItem);
            mockInstantiate.mockReturnValue(mockNode);

            const onStakeToggleChangedSpy = jest.spyOn(component as any, "onStakeToggleChanged");

            (component as any).initBetLevelItems();

            // Test that callback is properly set
            mockBetLevelItem.onStakeChanged(1);
            expect(onStakeToggleChangedSpy).toHaveBeenCalledWith(1);
        });
    });

    describe("calculateContainerHeight", () => {
        const { ComponentUtils } = jest.requireMock("db://shared-components/shared/utils");

        it("should calculate height for less than max items", () => {
            (component as any).betLevels = [10, 20, 30]; // 3 items
            const expectedHeight = 3 * 60 + 4 * 10; // 3 items * 60 height + 4 margins * 10

            (component as any).calculateContainerHeight();

            expect(ComponentUtils.setNodeTransform).toHaveBeenCalledWith(mockContainerNode, { height: expectedHeight });
        });

        it("should calculate height for max items or more", () => {
            (component as any).betLevels = [10, 20, 30, 40, 50, 60]; // 6 items (more than max 5)
            const expectedHeight = 5 * 60 + 6 * 10; // max 5 items * 60 height + 6 margins * 10

            (component as any).calculateContainerHeight();

            expect(ComponentUtils.setNodeTransform).toHaveBeenCalledWith(mockContainerNode, { height: expectedHeight });
        });
    });

    describe("onHide", () => {
        it("should animate hide with fade out and scale down", () => {
            const { AnimationUtils } = jest.requireMock("db://shared-components/shared/utils");
            const { tween, v3 } = jest.requireMock("cc");
            const onHiddenSpy = jest.spyOn(component as any, "onHidden");

            (component as any).onHide();

            expect(AnimationUtils.fadeOut).toHaveBeenCalledWith(component.node, 0.2);
            expect(tween).toHaveBeenCalledWith(component.node);
            // Get the mock tween chain that was returned
            const mockTweenChain = tween(component.node);
            expect(mockTweenChain.to).toHaveBeenCalledWith(0.2, { scale: v3(1, 0, 0) });
        });
    });

    describe("onHidden", () => {
        it("should deactivate node and set opacity to 0", () => {
            const { ComponentUtils } = jest.requireMock("db://shared-components/shared/utils");

            (component as any).onHidden();

            expect(component.node.active).toBe(false);
            expect(ComponentUtils.setOpacityNode).toHaveBeenCalledWith(component.node, 0);
        });
    });

    describe("onShow", () => {
        it("should activate node and animate show with fade in and scale up", () => {
            const { AnimationUtils } = jest.requireMock("db://shared-components/shared/utils");
            const { tween, v3 } = jest.requireMock("cc");

            (component as any).onShow();

            expect(component.node.active).toBe(true);
            expect(AnimationUtils.fadeIn).toHaveBeenCalledWith(component.node, 0.2);
            expect(tween).toHaveBeenCalledWith(component.node);
            // Get the mock tween chain that was returned
            const mockTweenChain = tween(component.node);
            expect(mockTweenChain.to).toHaveBeenCalledWith(0.2, { scale: v3(1, 1, 1) });
        });
    });

    describe("onStakeToggleChanged", () => {
        it("should call setStake with the correct bet level", () => {
            (component as any).betLevels = [10, 20, 30];
            const setStakeSpy = jest.spyOn(component, "setStake");

            (component as any).onStakeToggleChanged(1);

            expect(setStakeSpy).toHaveBeenCalledWith(20);
        });
    });

    describe("setStake", () => {
        it("should return the stake value", () => {
            const result = component.setStake(100);

            expect(result).toBe(100);
        });
    });

    describe("renderStakeSelectorShow", () => {
        it("should call onShow when showStakeSelector is true", () => {
            const onShowSpy = jest.spyOn(component as any, "onShow");

            component.renderStakeSelectorShow(true);

            expect(onShowSpy).toHaveBeenCalled();
        });

        it("should call onHide when showStakeSelector is false", () => {
            const onHideSpy = jest.spyOn(component as any, "onHide");

            component.renderStakeSelectorShow(false);

            expect(onHideSpy).toHaveBeenCalled();
        });
    });

    describe("renderStakeIndex", () => {
        it("should update stakeIndex and call updateStateSelected", () => {
            const updateStateSelectedSpy = jest.spyOn(component as any, "updateStateSelected");

            component.renderStakeIndex(2);

            expect((component as any).stakeIndex).toBe(2);
            expect(updateStateSelectedSpy).toHaveBeenCalledWith(2);
        });
    });

    describe("updateStateSelected", () => {
        it("should return early when stakeIndex is -1", () => {
            const mockChild = new Node();
            const mockBetLevelItem = new (jest.requireMock("../../../assets/scripts/components/bet-levels/bet-level-item").default)();
            mockChild.getComponent = jest.fn().mockReturnValue(mockBetLevelItem);
            // Set children using the writable property
            Object.defineProperty(mockContainerNode, "children", {
                value: [mockChild],
                writable: true,
                configurable: true,
            });

            (component as any).updateStateSelected(-1);

            expect(mockChild.getComponent).not.toHaveBeenCalled();
        });

        it("should set active state for each item based on stakeIndex", () => {
            const mockChild1 = new Node();
            const mockChild2 = new Node();
            const mockChild3 = new Node();
            const mockBetLevelItem1 = new (jest.requireMock("../../../assets/scripts/components/bet-levels/bet-level-item").default)();
            const mockBetLevelItem2 = new (jest.requireMock("../../../assets/scripts/components/bet-levels/bet-level-item").default)();
            const mockBetLevelItem3 = new (jest.requireMock("../../../assets/scripts/components/bet-levels/bet-level-item").default)();

            mockChild1.getComponent = jest.fn().mockReturnValue(mockBetLevelItem1);
            mockChild2.getComponent = jest.fn().mockReturnValue(mockBetLevelItem2);
            mockChild3.getComponent = jest.fn().mockReturnValue(mockBetLevelItem3);

            // Set children using the writable property
            Object.defineProperty(mockContainerNode, "children", {
                value: [mockChild1, mockChild2, mockChild3],
                writable: true,
                configurable: true,
            });

            (component as any).updateStateSelected(1);

            expect(mockBetLevelItem1.setActive).toHaveBeenCalledWith(false);
            expect(mockBetLevelItem2.setActive).toHaveBeenCalledWith(true);
            expect(mockBetLevelItem3.setActive).toHaveBeenCalledWith(false);
        });

        it("should handle case when item component is null", () => {
            const mockChild = new Node();
            mockChild.getComponent = jest.fn().mockReturnValue(null);
            // Set children using the writable property
            Object.defineProperty(mockContainerNode, "children", {
                value: [mockChild],
                writable: true,
                configurable: true,
            });

            expect(() => {
                (component as any).updateStateSelected(0);
            }).not.toThrow();
        });
    });

    describe("closeStakeSelector", () => {
        it("should exist as a method for observer handle", () => {
            expect(typeof component.closeStakeSelector).toBe("function");

            // Should not throw when called
            expect(() => {
                component.closeStakeSelector();
            }).not.toThrow();
        });
    });
});
