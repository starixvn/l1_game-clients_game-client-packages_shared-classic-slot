import "reflect-metadata";
//rest
import { Label, Node, Toggle } from "cc";
import { Container } from "inversify";
import AutoSpinDialog from "../../../assets/scripts/components/bet-control/auto-spin-dialog";
import { SlotBetHandler } from "../../../assets/scripts/handlers";
import { BetControlStore } from "../../../assets/scripts/handlers/stores/bet-control-store";

// Mock game client base - COMPLETE structure
jest.mock("@sg/game-client-base", () => ({
    FormatUtils: {
        numberWithCommas: jest.fn((num: number) => num.toLocaleString()),
    },
    Shared: {
        utils: {
            StorageManager: {
                setPrefixKey: jest.fn(),
            },
        },
    },
}));

// Mock ObserverComponent with ALL lifecycle methods
jest.mock("db://shared-components/shared/common-components/observer-component/scripts/observer-component", () => ({
    ObserverComponent: class MockObserverComponent {
        onLoad() { }
        onDestroy() { }
        start() { }
        update() { }
        node = { on: jest.fn(), off: jest.fn(), destroy: jest.fn(), addChild: jest.fn() };
    },
}));

// Mock Dialog component
jest.mock("db://shared-components/shared/common-components/dialogs/dialog", () => ({
    Dialog: class MockDialog {
        onHideComplete = null;
        hide = jest.fn();
    },
}));

// Mock AudioUtils
jest.mock("db://shared-components/game/audios/utils", () => ({
    AudioUtils: {
        playClick: jest.fn(),
    },
}));

// Mock BetControlStore
jest.mock("../../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(() => ({
        turboEnabled: false,
        autoSpinOptions: [10, 30, 50, 80, 100, 200, 500, 1000],
        autoSpinSelectedValue: 10,
        setTurbo: jest.fn(),
    })),
}));

// Mock SlotBetHandler
jest.mock("../../../assets/scripts/handlers", () => ({
    SlotBetHandler: jest.fn().mockImplementation(() => ({
        confirmAutoSpin: jest.fn(),
    })),
}));

describe("AutoSpinDialog", () => {
    let container: Container;
    let component: AutoSpinDialog;
    let mockBetControlStore: jest.Mocked<BetControlStore>;
    let mockSlotBetHandler: jest.Mocked<SlotBetHandler>;
    let mockDialog: any;
    let mockToggleTurbo: Toggle;
    let mockChoicesContainer: Node;

    beforeEach(() => {
        container = new Container();

        // Create mock instances
        const MockedBetControlStore = jest.requireMock("../../../assets/scripts/handlers/stores/bet-control-store").BetControlStore;
        mockBetControlStore = new MockedBetControlStore();

        const MockedSlotBetHandler = jest.requireMock("../../../assets/scripts/handlers").SlotBetHandler;
        mockSlotBetHandler = new MockedSlotBetHandler();

        // Create component instance
        component = new AutoSpinDialog();

        // Create mock UI components using real Cocos Creator classes
        const { Dialog } = jest.requireMock("db://shared-components/shared/common-components/dialogs/dialog");

        mockDialog = new Dialog();
        mockToggleTurbo = new Toggle();
        mockChoicesContainer = new Node();

        // Mock addChild to properly update children array
        const childrenArray: Node[] = [];
        jest.spyOn(mockChoicesContainer, "addChild").mockImplementation((child: Node) => {
            childrenArray.push(child);
            return child;
        });

        // Mock children getter to return our array
        Object.defineProperty(mockChoicesContainer, "children", {
            get: () => childrenArray,
            configurable: true,
        });

        // Set up mock choice nodes using real Node class
        const createMockChoiceNode = (name: string) => {
            const node = new Node();
            node.name = name;
            node.getComponent = jest.fn().mockReturnValue(new Toggle());
            node.getComponentInChildren = jest.fn().mockReturnValue(new Label());
            return node;
        };

        // Add mock choice nodes to container using addChild
        const choiceValues = ["10", "30", "50", "80", "100", "200", "500", "1000"];
        choiceValues.forEach((value) => {
            const choiceNode = createMockChoiceNode(value);
            mockChoicesContainer.addChild(choiceNode);
        });

        // Set up component properties
        component.dialog = mockDialog;
        component.toggleTurbo = mockToggleTurbo;
        component.choicesContainer = mockChoicesContainer;
        component.node = new Node();

        // Initialize private properties
        (component as any).tempSelectedValue = -1;
        (component as any).confirmed = false;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("onLoad", () => {
        it("should set dialog onHideComplete callback and call super.onLoad", () => {
            const superOnLoadSpy = jest
                .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(component)), "onLoad")
                .mockImplementation(() => { });

            component.onLoad();

            expect(component.dialog.onHideComplete).toBeDefined();
            expect(superOnLoadSpy).toHaveBeenCalled();

            superOnLoadSpy.mockRestore();
        });

        it("should call onDidHide and node.destroy when dialog hide completes", () => {
            const onDidHideSpy = jest.spyOn(component as any, "onDidHide").mockImplementation(() => { });

            component.onLoad();
            component.dialog.onHideComplete();

            expect(onDidHideSpy).toHaveBeenCalled();
            expect(component.node.destroy).toHaveBeenCalled();
        });
    });

    describe("renderToggleTurbo", () => {
        it("should update toggle turbo when turboEnabled is different from current state", () => {
            component.toggleTurbo.isChecked = false;

            component.renderToggleTurbo(true);

            expect(component.toggleTurbo.isChecked).toBe(true);
        });

        it("should not update toggle turbo when turboEnabled is same as current state", () => {
            component.toggleTurbo.isChecked = true;

            component.renderToggleTurbo(true);

            expect(component.toggleTurbo.isChecked).toBe(true);
        });

        it("should handle false turboEnabled", () => {
            component.toggleTurbo.isChecked = true;

            component.renderToggleTurbo(false);

            expect(component.toggleTurbo.isChecked).toBe(false);
        });
    });

    describe("setOptions", () => {
        it("should set options for all choice nodes with correct formatting", () => {
            const options = [10, 30, 50, 80, 100, 200, 500, 1000];
            const mockFormatUtils = jest.requireMock("@sg/game-client-base").FormatUtils;
            mockFormatUtils.numberWithCommas.mockImplementation((num: number) => num.toLocaleString());

            component.setOptions(options);

            options.forEach((value, index) => {
                const child = component.choicesContainer.children[index];
                expect(child.name).toBe(value.toString());
                expect(child.getComponentInChildren).toHaveBeenCalled();
            });
        });

        it("should handle empty options array", () => {
            component.setOptions([]);

            // Should not throw error and should process existing children
            expect(component.choicesContainer.children.length).toBe(8); // Original mock children
        });

        it("should handle null label components gracefully", () => {
            const options = [10, 30];
            component.choicesContainer.children[0].getComponentInChildren = jest.fn().mockReturnValue(null);

            expect(() => component.setOptions(options)).not.toThrow();
        });
    });

    describe("setLastSelected", () => {
        it("should set tempSelectedValue and check corresponding toggle", () => {
            const selectedValue = 50;
            const mockToggle = component.choicesContainer.children.find((child) => child.name === "50").getComponent(Toggle);

            component.setLastSelected(selectedValue);

            expect((component as any).tempSelectedValue).toBe(selectedValue);
            expect(mockToggle.isChecked).toBe(true);
        });

        it("should handle value not found in options", () => {
            const selectedValue = 999; // Not in options

            component.setLastSelected(selectedValue);

            expect((component as any).tempSelectedValue).toBe(selectedValue);
            // Should not throw error
        });

        it("should handle null toggle component", () => {
            const selectedValue = 10;
            component.choicesContainer.children[0].getComponent = jest.fn().mockReturnValue(null);

            expect(() => component.setLastSelected(selectedValue)).not.toThrow();
            expect((component as any).tempSelectedValue).toBe(selectedValue);
        });
    });

    describe("onChoiceClick", () => {
        it("should play click sound and set tempSelectedValue from event target", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const mockEvent = { target: { name: "100" } } as any;

            component.onChoiceClick(mockEvent);

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect((component as any).tempSelectedValue).toBe(100);
        });

        it("should handle string numbers correctly", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const mockEvent = { target: { name: "500" } } as any;

            component.onChoiceClick(mockEvent);

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect((component as any).tempSelectedValue).toBe(500);
        });
    });

    describe("onCloseClick", () => {
        it("should play click sound and hide dialog", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");

            component.onCloseClick();

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect(component.dialog.hide).toHaveBeenCalled();
        });
    });

    describe("onConfirmClick", () => {
        it("should play click sound, set confirmed flag and hide dialog", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");

            component.onConfirmClick();

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect((component as any).confirmed).toBe(true);
            expect(component.dialog.hide).toHaveBeenCalled();
        });
    });

    describe("onDidHide", () => {
        it("should call onConfirmCallback when confirmed is true", () => {
            const onConfirmCallbackSpy = jest.spyOn(component, "onConfirmCallback").mockImplementation(() => 50);
            (component as any).confirmed = true;
            (component as any).tempSelectedValue = 50;

            (component as any).onDidHide();

            expect(onConfirmCallbackSpy).toHaveBeenCalledWith(50);
        });

        it("should not call onConfirmCallback when confirmed is false", () => {
            const onConfirmCallbackSpy = jest.spyOn(component, "onConfirmCallback").mockImplementation(() => 50);
            (component as any).confirmed = false;

            (component as any).onDidHide();

            expect(onConfirmCallbackSpy).not.toHaveBeenCalled();
        });
    });

    describe("onConfirmCallback", () => {
        it("should return the autoSpinCount parameter", () => {
            const autoSpinCount = 100;

            const result = component.onConfirmCallback(autoSpinCount);

            expect(result).toBe(autoSpinCount);
        });

        it("should handle different autoSpinCount values", () => {
            expect(component.onConfirmCallback(10)).toBe(10);
            expect(component.onConfirmCallback(500)).toBe(500);
            expect(component.onConfirmCallback(0)).toBe(0);
        });
    });

    describe("onToggleTurbo", () => {
        it("should play click sound and return toggle checked state", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const mockToggle = new Toggle();
            mockToggle.isChecked = true;

            const result = component.onToggleTurbo(mockToggle);

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it("should handle unchecked toggle", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const mockToggle = new Toggle();
            mockToggle.isChecked = false;

            const result = component.onToggleTurbo(mockToggle);

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe("integration tests", () => {
        it("should properly initialize with all properties", () => {
            expect(component).toBeDefined();
            expect(component.dialog).toBeDefined();
            expect(component.toggleTurbo).toBeDefined();
            expect(component.choicesContainer).toBeDefined();
            expect((component as any).tempSelectedValue).toBe(-1);
            expect((component as any).confirmed).toBe(false);
        });

        it("should handle complete workflow: select option, confirm, and hide", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const onConfirmCallbackSpy = jest.spyOn(component, "onConfirmCallback").mockImplementation(() => 100);

            // Set up dialog lifecycle
            component.onLoad();

            // Select option
            const mockEvent = { target: { name: "100" } } as any;
            component.onChoiceClick(mockEvent);

            // Confirm selection
            component.onConfirmClick();

            // Simulate dialog hide complete
            component.dialog.onHideComplete();

            expect(AudioUtils.playClick).toHaveBeenCalledTimes(2); // Choice click + confirm click
            expect((component as any).tempSelectedValue).toBe(100);
            expect((component as any).confirmed).toBe(true);
            expect(component.dialog.hide).toHaveBeenCalled();
            expect(onConfirmCallbackSpy).toHaveBeenCalledWith(100);
            expect(component.node.destroy).toHaveBeenCalled();
        });

        it("should handle complete workflow: select option, close without confirming", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const onConfirmCallbackSpy = jest.spyOn(component, "onConfirmCallback").mockImplementation(() => 100);

            // Set up dialog lifecycle
            component.onLoad();

            // Select option
            const mockEvent = { target: { name: "100" } } as any;
            component.onChoiceClick(mockEvent);

            // Close without confirming
            component.onCloseClick();

            // Simulate dialog hide complete
            component.dialog.onHideComplete();

            expect(AudioUtils.playClick).toHaveBeenCalledTimes(2); // Choice click + close click
            expect((component as any).tempSelectedValue).toBe(100);
            expect((component as any).confirmed).toBe(false);
            expect(component.dialog.hide).toHaveBeenCalled();
            expect(onConfirmCallbackSpy).not.toHaveBeenCalled(); // Should not confirm
            expect(component.node.destroy).toHaveBeenCalled();
        });
    });
});
