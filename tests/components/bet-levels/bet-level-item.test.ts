import "reflect-metadata";

import { Label, Node } from "cc";
import BetLevelItem from "../../../assets/scripts/components/bet-levels/bet-level-item";

// Mock AudioUtils
jest.mock("db://shared-components/game/audios/utils", () => ({
    AudioUtils: {
        playClick: jest.fn(),
    },
}));

describe("BetLevelItem", () => {
    let component: BetLevelItem;
    let mockLabel: Label;
    let mockNodeActive: Node;
    let mockNodeInactive: Node;

    beforeEach(() => {
        // Create component instance
        component = new BetLevelItem();

        // Set up component properties
        mockLabel = new Label();
        mockNodeActive = new Node();
        mockNodeInactive = new Node();

        component.lblValue = mockLabel;
        component.nodeActive = mockNodeActive;
        component.nodeInactive = mockNodeInactive;

        // Mock node active properties
        mockNodeActive.active = false;
        mockNodeInactive.active = false;

        // Mock onStakeChanged callback
        component.onStakeChanged = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("onClick", () => {
        it("should play click sound and call onStakeChanged with index", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            (component as any).index = 2;

            component.onClick();

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect(component.onStakeChanged).toHaveBeenCalledWith(2);
        });

        it("should call onStakeChanged with default index 0", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            // index is initialized to 0 by default

            component.onClick();

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect(component.onStakeChanged).toHaveBeenCalledWith(0);
        });
    });

    describe("setActive", () => {
        it("should set nodeActive to active and nodeInactive to inactive when active is true", () => {
            component.setActive(true);

            expect(mockNodeActive.active).toBe(true);
            expect(mockNodeInactive.active).toBe(false);
        });

        it("should set nodeActive to inactive and nodeInactive to active when active is false", () => {
            component.setActive(false);

            expect(mockNodeActive.active).toBe(false);
            expect(mockNodeInactive.active).toBe(true);
        });
    });

    describe("setData", () => {
        it("should set label string and index with provided values", () => {
            const value = "100";
            const index = 5;

            component.setData(value, index);

            expect(mockLabel.string).toBe("100");
            expect((component as any).index).toBe(5);
        });

        it("should handle empty string value", () => {
            const value = "";
            const index = 0;

            component.setData(value, index);

            expect(mockLabel.string).toBe("");
            expect((component as any).index).toBe(0);
        });

        it("should handle numeric string values", () => {
            const value = "250";
            const index = 3;

            component.setData(value, index);

            expect(mockLabel.string).toBe("250");
            expect((component as any).index).toBe(3);
        });
    });

    describe("integration", () => {
        it("should work correctly when setData followed by onClick", () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const mockCallback = jest.fn();
            component.onStakeChanged = mockCallback;

            // Set data
            component.setData("150", 7);

            // Click the item
            component.onClick();

            expect(mockLabel.string).toBe("150");
            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect(mockCallback).toHaveBeenCalledWith(7);
        });

        it("should work correctly when setActive is called with different states", () => {
            // Initially set to inactive
            component.setActive(false);
            expect(mockNodeActive.active).toBe(false);
            expect(mockNodeInactive.active).toBe(true);

            // Toggle to active
            component.setActive(true);
            expect(mockNodeActive.active).toBe(true);
            expect(mockNodeInactive.active).toBe(false);

            // Toggle back to inactive
            component.setActive(false);
            expect(mockNodeActive.active).toBe(false);
            expect(mockNodeInactive.active).toBe(true);
        });
    });

    describe("initialization", () => {
        it("should have default values after creation", () => {
            const newComponent = new BetLevelItem();

            expect((newComponent as any).index).toBe(0);
            expect(typeof newComponent.onStakeChanged).toBe("function");
        });

        it("should have onStakeChanged as a function that can be overridden", () => {
            const customCallback = jest.fn();
            component.onStakeChanged = customCallback;

            component.onStakeChanged(123);

            expect(customCallback).toHaveBeenCalledWith(123);
        });
    });
});
