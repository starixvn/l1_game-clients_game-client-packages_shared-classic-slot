import { Component, Label } from "cc";
import { Container } from "inversify";
import "reflect-metadata";
import BonusItem from "../../../assets/scripts/components/bonus/bonus-item";

// Mock game client base
jest.mock("@sg/game-client-base", () => ({
    FormatUtils: {
        numberWithCommas: jest.fn((num: number) => num.toLocaleString()),
    },
}));

// Mock AnimationUtils
jest.mock("db://shared-components/shared/utils", () => ({
    AnimationUtils: {
        delayTime: jest.fn().mockResolvedValue(undefined),
    },
}));

// Mock spine skeleton
const createMockSkeleton = (): any => ({
    setAnimation: jest.fn(),
});

describe("BonusItem", () => {
    let container: Container;
    let component: BonusItem;
    let mockOpenChestSkeleton: any;
    let mockValue: Label;

    beforeEach(() => {
        container = new Container();

        // Create component instance
        component = new BonusItem();

        // Set up mock skeleton
        mockOpenChestSkeleton = createMockSkeleton();

        // Set up mock label
        mockValue = new Label();
        mockValue.string = ""; // Initialize to empty string

        // Assign mocks to component
        component.openChestSkeleton = mockOpenChestSkeleton;
        component.value = mockValue;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("onLoad", () => {
        it("should set entry animation and then idle animation after delay", async () => {
            const { AnimationUtils } = jest.requireMock("db://shared-components/shared/utils");

            await component.onLoad();

            expect(mockOpenChestSkeleton.setAnimation).toHaveBeenCalledTimes(2);
            expect(mockOpenChestSkeleton.setAnimation).toHaveBeenNthCalledWith(1, 0, "entry", false);
            expect(AnimationUtils.delayTime).toHaveBeenCalledWith(1);
            expect(mockOpenChestSkeleton.setAnimation).toHaveBeenNthCalledWith(2, 0, "idle", true);
        });

        it("should handle delay time correctly", async () => {
            const { AnimationUtils } = jest.requireMock("db://shared-components/shared/utils");
            AnimationUtils.delayTime.mockResolvedValueOnce(undefined);

            await component.onLoad();

            expect(AnimationUtils.delayTime).toHaveBeenCalledWith(1);
        });
    });

    describe("open", () => {
        it("should set open animation and display formatted value after delay", async () => {
            const { AnimationUtils } = jest.requireMock("db://shared-components/shared/utils");
            const { FormatUtils } = jest.requireMock("@sg/game-client-base");
            FormatUtils.numberWithCommas.mockReturnValue("1,000");

            await component.open(1000);

            expect(mockOpenChestSkeleton.setAnimation).toHaveBeenCalledWith(0, "open", false);
            expect(AnimationUtils.delayTime).toHaveBeenCalledWith(0.5);
            expect(FormatUtils.numberWithCommas).toHaveBeenCalledWith(1000);
            expect(mockValue.string).toBe("1,000");
        });

        it("should not display value when value is 0", async () => {
            const { AnimationUtils } = jest.requireMock("db://shared-components/shared/utils");
            const { FormatUtils } = jest.requireMock("@sg/game-client-base");

            await component.open(0);

            expect(mockOpenChestSkeleton.setAnimation).toHaveBeenCalledWith(0, "open", false);
            expect(AnimationUtils.delayTime).toHaveBeenCalledWith(0.5);
            expect(FormatUtils.numberWithCommas).not.toHaveBeenCalled();
            expect(mockValue.string).toBe("");
        });

        it("should not display value when value is negative", async () => {
            const { AnimationUtils } = jest.requireMock("db://shared-components/shared/utils");
            const { FormatUtils } = jest.requireMock("@sg/game-client-base");

            await component.open(-100);

            expect(mockOpenChestSkeleton.setAnimation).toHaveBeenCalledWith(0, "open", false);
            expect(AnimationUtils.delayTime).toHaveBeenCalledWith(0.5);
            expect(FormatUtils.numberWithCommas).not.toHaveBeenCalled();
            expect(mockValue.string).toBe("");
        });

        it("should handle delay time correctly in open method", async () => {
            const { AnimationUtils } = jest.requireMock("db://shared-components/shared/utils");
            AnimationUtils.delayTime.mockResolvedValueOnce(undefined);

            await component.open(500);

            expect(AnimationUtils.delayTime).toHaveBeenCalledWith(0.5);
        });

        it("should format different number values correctly", async () => {
            const { FormatUtils } = jest.requireMock("@sg/game-client-base");
            FormatUtils.numberWithCommas.mockReturnValue("123,456.78");

            await component.open(123456.78);

            expect(FormatUtils.numberWithCommas).toHaveBeenCalledWith(123456.78);
            expect(mockValue.string).toBe("123,456.78");
        });
    });

    describe("component inheritance", () => {
        it("should extend Component class", () => {
            expect(component instanceof Component).toBe(true);
        });

        it("should have required properties", () => {
            expect(component).toHaveProperty("openChestSkeleton");
            expect(component).toHaveProperty("value");
        });
    });
});
