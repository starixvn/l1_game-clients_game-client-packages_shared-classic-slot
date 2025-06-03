import { Node, Prefab } from "cc";
import { Container } from "inversify";
import "reflect-metadata";
import AutoSpinDialogContainer from "../../../assets/scripts/components/bet-control/auto-spin-dialog-container";
import { BetControlStore } from "../../../assets/scripts/handlers/stores/bet-control-store";

// Mock game client base
jest.mock("@sg/game-client-base", () => ({
    FormatUtils: {
        numberWithCommas: jest.fn((num: number) => num.toLocaleString()),
    },
    Audios: {
        AudioHandler: class MockAudioHandler {},
    },
    Translator: {
        getLanguageId: jest.fn().mockReturnValue("en"),
    },
}));

// Mock ObserverComponent with ALL lifecycle methods
jest.mock("db://shared-components/shared/common-components/observer-component/scripts/observer-component", () => ({
    ObserverComponent: class MockObserverComponent {
        onLoad() {}
        onDestroy() {}
        start() {}
        update() {}
        node = require("cc").Node ? new (require("cc").Node)() : { on: jest.fn(), off: jest.fn(), addChild: jest.fn() };
    },
}));

// Mock BetControlStore
jest.mock("../../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(() => ({
        autoSpinDialogOpenEvent: null,
    })),
}));

// Mock classic-slot-utils
jest.mock("../../../assets/scripts/utils/classic-slot-utils", () => ({
    loadSharedClassicSlotAsset: jest.fn(),
}));

// Mock cc functions
jest.mock("cc", () => {
    const actualCc = jest.requireActual("cc");
    return {
        ...actualCc,
        instantiate: jest.fn(),
    };
});

describe("AutoSpinDialogContainer", () => {
    let container: Container;
    let component: AutoSpinDialogContainer;
    let betControlStoreMock: jest.Mocked<BetControlStore>;
    let loadSharedClassicSlotAssetMock: jest.Mock;
    let instantiateMock: jest.Mock;
    let mockPrefab: Prefab;
    let mockDialog: Node;

    beforeEach(() => {
        // Initialize container
        container = new Container();

        // Create mock instances
        const MockedBetControlStore = jest.requireMock("../../../assets/scripts/handlers/stores/bet-control-store").BetControlStore;
        betControlStoreMock = new MockedBetControlStore() as jest.Mocked<BetControlStore>;

        // Get mock functions
        loadSharedClassicSlotAssetMock = jest.requireMock("../../../assets/scripts/utils/classic-slot-utils").loadSharedClassicSlotAsset;
        instantiateMock = require("cc").instantiate as jest.Mock;

        // Create mock prefab and dialog
        mockPrefab = new Prefab();
        mockDialog = new Node();

        // Bind to container
        container.bind(BetControlStore).toConstantValue(betControlStoreMock);
        container.bind(AutoSpinDialogContainer).toSelf();

        // Create component instance
        component = new AutoSpinDialogContainer();

        // Set up node
        component.node = new Node();
        component.node.addChild = jest.fn();

        // Clear mock call counts
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("renderAutoSpinDialogOpen", () => {
        it("should call show when autoSpinDialogOpenEvent is truthy", () => {
            // Arrange
            const showSpy = jest.spyOn(component, "show").mockImplementation(async () => {});
            const mockEvent = { someData: "test" };

            // Act
            component.renderAutoSpinDialogOpen(mockEvent);

            // Assert
            expect(showSpy).toHaveBeenCalled();
        });

        it("should not call show when autoSpinDialogOpenEvent is falsy", () => {
            // Arrange
            const showSpy = jest.spyOn(component, "show").mockImplementation(async () => {});

            // Act
            component.renderAutoSpinDialogOpen(null);

            // Assert
            expect(showSpy).not.toHaveBeenCalled();
        });

        it("should not call show when autoSpinDialogOpenEvent is undefined", () => {
            // Arrange
            const showSpy = jest.spyOn(component, "show").mockImplementation(async () => {});

            // Act
            component.renderAutoSpinDialogOpen(undefined);

            // Assert
            expect(showSpy).not.toHaveBeenCalled();
        });

        it("should not call show when autoSpinDialogOpenEvent is false", () => {
            // Arrange
            const showSpy = jest.spyOn(component, "show").mockImplementation(async () => {});

            // Act
            component.renderAutoSpinDialogOpen(false);

            // Assert
            expect(showSpy).not.toHaveBeenCalled();
        });
    });

    describe("show", () => {
        it("should load prefab and add dialog to node", async () => {
            // Arrange
            loadSharedClassicSlotAssetMock.mockResolvedValue(mockPrefab);
            instantiateMock.mockReturnValue(mockDialog);

            // Act
            await component.show();

            // Assert
            expect(loadSharedClassicSlotAssetMock).toHaveBeenCalledWith("prefabs/auto-spin-dialog", Prefab);
            expect(instantiateMock).toHaveBeenCalledWith(mockPrefab);
            expect(component.node.addChild).toHaveBeenCalledWith(mockDialog);
        });

        it("should handle prefab loading error gracefully", async () => {
            // Arrange
            const mockError = new Error("Failed to load prefab");
            loadSharedClassicSlotAssetMock.mockRejectedValue(mockError);

            // Act & Assert
            await expect(component.show()).rejects.toThrow("Failed to load prefab");
            expect(loadSharedClassicSlotAssetMock).toHaveBeenCalledWith("prefabs/auto-spin-dialog", Prefab);
            expect(instantiateMock).not.toHaveBeenCalled();
            expect(component.node.addChild).not.toHaveBeenCalled();
        });

        it("should call loadSharedClassicSlotAsset with correct parameters", async () => {
            // Arrange
            loadSharedClassicSlotAssetMock.mockResolvedValue(mockPrefab);
            instantiateMock.mockReturnValue(mockDialog);

            // Act
            await component.show();

            // Assert
            expect(loadSharedClassicSlotAssetMock).toHaveBeenCalledTimes(1);
            expect(loadSharedClassicSlotAssetMock).toHaveBeenCalledWith("prefabs/auto-spin-dialog", Prefab);
        });

        it("should instantiate the loaded prefab", async () => {
            // Arrange
            loadSharedClassicSlotAssetMock.mockResolvedValue(mockPrefab);
            instantiateMock.mockReturnValue(mockDialog);

            // Act
            await component.show();

            // Assert
            expect(instantiateMock).toHaveBeenCalledTimes(1);
            expect(instantiateMock).toHaveBeenCalledWith(mockPrefab);
        });

        it("should add the instantiated dialog as child to component node", async () => {
            // Arrange
            loadSharedClassicSlotAssetMock.mockResolvedValue(mockPrefab);
            instantiateMock.mockReturnValue(mockDialog);

            // Act
            await component.show();

            // Assert
            expect(component.node.addChild).toHaveBeenCalledTimes(1);
            expect(component.node.addChild).toHaveBeenCalledWith(mockDialog);
        });
    });

    describe("integration", () => {
        it("should show dialog when renderAutoSpinDialogOpen receives truthy event", async () => {
            // Arrange
            loadSharedClassicSlotAssetMock.mockResolvedValue(mockPrefab);
            instantiateMock.mockReturnValue(mockDialog);
            const mockEvent = { isOpen: true };

            // Act
            await component.renderAutoSpinDialogOpen(mockEvent);

            // Assert
            expect(loadSharedClassicSlotAssetMock).toHaveBeenCalledWith("prefabs/auto-spin-dialog", Prefab);
            expect(instantiateMock).toHaveBeenCalledWith(mockPrefab);
            expect(component.node.addChild).toHaveBeenCalledWith(mockDialog);
        });
    });
});
