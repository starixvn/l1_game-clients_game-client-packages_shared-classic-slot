import "reflect-metadata";

import { Node, Prefab } from "cc";
import { AudioIds } from "db://assets/game/audios/AudioIds";
import { Container } from "inversify";
import BonusDialog from "../../assets/scripts/components/bonus/bonus-dialog";
import CallbackAnimation from "../../assets/scripts/components/callback-animation/callback-animation";
import EffectContainer from "../../assets/scripts/components/effect-container";
import BigWinAnimation from "../../assets/scripts/components/others/big-win-animation";
import JackpotGame from "../../assets/scripts/components/others/jackpot-game";
import { SlotBoardStore } from "../../assets/scripts/handlers/stores/slot-board-store";
import { CLASSIC_SLOT_BUNDLE } from "../../assets/scripts/utils/classic-slot-utils";

// Mock instantiate function
jest.mock("cc", () => ({
    ...jest.requireActual("cc"),
    instantiate: jest.fn(),
}));

// Mock game client base - COMPLETE structure
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
    Shared: {
        utils: {
            StorageManager: {
                setPrefixKey: jest.fn(),
            },
        },
    },
    Rounds: {
        RoundTimeStore: class MockRoundTimeStore {},
        RoundStore: class MockRoundStore {},
    },
    GameConfigs: {
        GameConfigStore: class MockGameConfigStore {},
    },
    Player: {
        MainPlayerStore: class MockMainPlayerStore {},
    },
    GameUserSettings: {
        GameUserSettingHandler: class MockGameUserSettingHandler {},
    },
}));

// Mock ObserverComponent with ALL lifecycle methods
jest.mock("db://shared-components/shared/common-components/observer-component/scripts/observer-component", () => ({
    ObserverComponent: class MockObserverComponent {
        onLoad() {}
        onDestroy() {}
        start() {}
        update() {}
        node = require("cc").Node ? new (require("cc").Node)() : { on: jest.fn(), off: jest.fn() };
    },
}));

// Mock Observer
jest.mock("observer", () => ({
    render: jest.fn(() => jest.fn()),
    handle: jest.fn(() => jest.fn()),
}));

// Mock AudioUtils
jest.mock("db://shared-components/game/audios/utils", () => ({
    AudioUtils: {
        playSFX: jest.fn(),
    },
}));

// Mock bundleManager
jest.mock("db://shared-components/shared/common-components/bundle-manager/bundle-manager", () => ({
    bundleManager: {
        loadResourcesAsset: jest.fn(),
        loadAssetsFromBundle: jest.fn(),
    },
}));

// Mock classic-slot-utils
jest.mock("../../assets/scripts/utils/classic-slot-utils", () => ({
    CLASSIC_SLOT_BUNDLE: "classic-slot-bundle",
}));

// Mock component dependencies
jest.mock("../../assets/scripts/components/bonus/bonus-dialog", () => ({
    default: class MockBonusDialog {
        initBonusItems = jest.fn();
        setBonusCount = jest.fn();
        onBonusFinished = null;
    },
}));

jest.mock("../../assets/scripts/components/callback-animation/callback-animation", () => ({
    default: class MockCallbackAnimation {
        setDuration = jest.fn();
        autoDestroyNode = false;
        onFinishedCallback = null;
        play = jest.fn();
    },
}));

jest.mock("../../assets/scripts/components/others/big-win-animation", () => ({
    default: class MockBigWinAnimation {
        setAmount = jest.fn();
    },
}));

jest.mock("../../assets/scripts/components/others/jackpot-game", () => ({
    default: class MockJackpotGame {
        prizes = 0;
        initJackpotItems = jest.fn();
        onJackpotGameFinished = null;
    },
}));

// Mock SlotBoardStore
jest.mock("../../assets/scripts/handlers/stores/slot-board-store", () => ({
    SlotBoardStore: jest.fn().mockImplementation(() => ({
        receivedBonus: null,
        receivedJackpot: null,
        receivedFreeSpins: null,
        receivedBigWin: null,
    })),
}));

describe("EffectContainer", () => {
    let container: Container;
    let effectContainer: EffectContainer;
    let mockSlotBoardStore: jest.Mocked<SlotBoardStore>;
    let mockNode: Node;
    let mockPrefab: Prefab;
    let mockEffectNode: Node;
    let mockCallbackAnimation: jest.Mocked<CallbackAnimation>;
    let mockBigWinAnimation: jest.Mocked<BigWinAnimation>;
    let mockBonusDialog: jest.Mocked<BonusDialog>;
    let mockJackpotGame: jest.Mocked<JackpotGame>;

    beforeEach(() => {
        container = new Container();

        // Create mock instances
        const MockedSlotBoardStore = jest.requireMock("../../assets/scripts/handlers/stores/slot-board-store").SlotBoardStore;
        mockSlotBoardStore = new MockedSlotBoardStore() as jest.Mocked<SlotBoardStore>;

        // Create mock UI components
        mockNode = new Node();
        mockPrefab = {} as Prefab;
        mockEffectNode = new Node();
        mockCallbackAnimation = new (jest.requireMock(
            "../../assets/scripts/components/callback-animation/callback-animation"
        ).default)() as jest.Mocked<CallbackAnimation>;
        mockBigWinAnimation = new (jest.requireMock(
            "../../assets/scripts/components/others/big-win-animation"
        ).default)() as jest.Mocked<BigWinAnimation>;
        mockBonusDialog = new (jest.requireMock(
            "../../assets/scripts/components/bonus/bonus-dialog"
        ).default)() as jest.Mocked<BonusDialog>;
        mockJackpotGame = new (jest.requireMock(
            "../../assets/scripts/components/others/jackpot-game"
        ).default)() as jest.Mocked<JackpotGame>;

        // Bind to container
        container.bind(SlotBoardStore).toConstantValue(mockSlotBoardStore);

        // Create component instance
        effectContainer = new EffectContainer();
        effectContainer.node = mockNode;

        // Mock getComponent method
        effectContainer.getComponent = jest.fn();

        // Mock node methods
        jest.spyOn(mockNode, "addChild").mockImplementation(() => {});

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("loadEffectFreeSpin", () => {
        it("should load free spin effect prefab when not already loaded", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            mockBundleManager.loadResourcesAsset.mockResolvedValue(mockPrefab);

            // Act
            await effectContainer.loadEffectFreeSpin();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).toHaveBeenCalledWith("prefabs/effects/effect-freespin", Prefab);
            expect((effectContainer as any).effectFreeSpin).toBe(mockPrefab);
        });

        it("should not load prefab if already loaded", async () => {
            // Arrange
            (effectContainer as any).effectFreeSpin = mockPrefab;
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;

            // Act
            await effectContainer.loadEffectFreeSpin();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).not.toHaveBeenCalled();
        });
    });

    describe("receivedFreeSpins", () => {
        it("should handle free spins effect when data is provided", async () => {
            // Arrange
            const freeSpinsData = { freeSpins: {}, duration: 3000 };
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            const mockAudioUtils = jest.requireMock("db://shared-components/game/audios/utils").AudioUtils;

            mockBundleManager.loadResourcesAsset.mockResolvedValue(mockPrefab);
            jest.spyOn(effectContainer, "showEffect").mockResolvedValue();
            jest.spyOn(effectContainer, "loadEffectFreeSpin").mockResolvedValue();

            const mockInstantiate = jest.requireMock("cc").instantiate;
            mockInstantiate.mockReturnValue(mockEffectNode);
            jest.spyOn(mockEffectNode, "getComponent").mockReturnValue(mockCallbackAnimation);

            // Act
            await effectContainer.receivedFreeSpins(freeSpinsData);

            // Assert
            expect(mockAudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.FREESPIN);
            expect(effectContainer.loadEffectFreeSpin).toHaveBeenCalled();
            expect(mockCallbackAnimation.setDuration).toHaveBeenCalledWith(3000);
            expect(effectContainer.showEffect).toHaveBeenCalledWith(mockEffectNode);
            expect(mockEffectNode.destroy).toHaveBeenCalled();
        });

        it("should return early when no free spins data is provided", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;

            // Act
            await effectContainer.receivedFreeSpins(null);

            // Assert
            expect(mockBundleManager.loadResourcesAsset).not.toHaveBeenCalled();
        });
    });

    describe("loadEffectBigWin", () => {
        it("should load big win effect prefab when not already loaded", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            mockBundleManager.loadResourcesAsset.mockResolvedValue(mockPrefab);

            // Act
            await effectContainer.loadEffectBigWin();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).toHaveBeenCalledWith("prefabs/effects/effect-big-win", Prefab);
            expect((effectContainer as any).effectBigWin).toBe(mockPrefab);
        });

        it("should not load prefab if already loaded", async () => {
            // Arrange
            (effectContainer as any).effectBigWin = mockPrefab;
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;

            // Act
            await effectContainer.loadEffectBigWin();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).not.toHaveBeenCalled();
        });
    });

    describe("receivedBigWin", () => {
        it("should handle big win effect when data is provided", async () => {
            // Arrange
            const bigWinData = {
                bigWin: {},
                duration: 5000,
                showBigWinValue: 2000,
                delayShowBigWinValue: 1000,
                amount: 10000,
            };
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            const mockAudioUtils = jest.requireMock("db://shared-components/game/audios/utils").AudioUtils;

            mockBundleManager.loadResourcesAsset.mockResolvedValue(mockPrefab);
            jest.spyOn(effectContainer, "showEffect").mockResolvedValue();
            jest.spyOn(effectContainer, "loadEffectBigWin").mockResolvedValue();
            //@ts-ignore
            jest.spyOn(effectContainer, "playEffectTransition").mockResolvedValueOnce(mockEffectNode);

            const mockInstantiate = jest.requireMock("cc").instantiate;
            mockInstantiate.mockReturnValue(mockEffectNode);
            jest.spyOn(mockEffectNode, "getComponent").mockReturnValueOnce(mockCallbackAnimation).mockReturnValueOnce(mockBigWinAnimation);
            // Act
            await effectContainer.receivedBigWin(bigWinData);

            // Assert
            expect(mockAudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.BIG_WIN);
            expect(effectContainer.loadEffectBigWin).toHaveBeenCalled();
            expect(mockCallbackAnimation.setDuration).toHaveBeenCalledWith(5000);
            expect(mockBigWinAnimation.setAmount).toHaveBeenCalledWith({
                amount: 10000,
                duration: 2000,
                delayTime: 1000,
            });
            expect(effectContainer.showEffect).toHaveBeenCalledWith(mockEffectNode);
        });

        it("should return early when no big win data is provided", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;

            // Act
            await effectContainer.receivedBigWin(null);

            // Assert
            expect(mockBundleManager.loadResourcesAsset).not.toHaveBeenCalled();
        });
    });

    describe("loadEffectJackpot", () => {
        it("should load jackpot effect prefab when not already loaded", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            mockBundleManager.loadResourcesAsset.mockResolvedValue(mockPrefab);

            // Act
            await effectContainer.loadEffectJackpot();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).toHaveBeenCalledWith("prefabs/effects/effect-jackpot", Prefab);
            //@ts-ignore
            expect(effectContainer.effectJackpot).toBe(mockPrefab);
        });

        it("should not load prefab if already loaded", async () => {
            // Arrange
            //@ts-ignore
            effectContainer.effectJackpot = mockPrefab;
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;

            // Act
            await effectContainer.loadEffectJackpot();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).not.toHaveBeenCalled();
        });
    });

    describe("loadJackpotGame", () => {
        it("should load jackpot game prefab when not already loaded", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            mockBundleManager.loadAssetsFromBundle.mockResolvedValue(mockPrefab);

            // Act
            await effectContainer.loadJackpotGame();

            // Assert
            expect(mockBundleManager.loadAssetsFromBundle).toHaveBeenCalledWith(CLASSIC_SLOT_BUNDLE, "prefabs/jackpot-game", Prefab, null);
            //@ts-ignore
            expect(effectContainer.jackpotGamePrefab).toBe(mockPrefab);
        });

        it("should not load prefab if already loaded", async () => {
            // Arrange
            //@ts-ignore
            effectContainer.jackpotGamePrefab = mockPrefab;
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;

            // Act
            await effectContainer.loadJackpotGame();

            // Assert
            expect(mockBundleManager.loadAssetsFromBundle).not.toHaveBeenCalled();
        });
    });

    describe("receivedJackpot", () => {
        it("should handle jackpot effect when data is provided", async () => {
            // Arrange
            const jackpotData = {
                jackpot: { prizes: 50000 },
                duration: 4000,
            };
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            const mockAudioUtils = jest.requireMock("db://shared-components/game/audios/utils").AudioUtils;

            mockBundleManager.loadResourcesAsset.mockResolvedValue(mockPrefab);
            mockBundleManager.loadAssetsFromBundle.mockResolvedValue(mockPrefab);
            //@ts-ignore
            jest.spyOn(effectContainer, "playEffectTransition").mockResolvedValue(mockEffectNode);
            jest.spyOn(effectContainer, "showEffect").mockResolvedValue();
            jest.spyOn(effectContainer, "loadEffectJackpot").mockResolvedValue();
            jest.spyOn(effectContainer, "loadJackpotGame").mockResolvedValue();
            //@ts-ignore
            jest.spyOn(effectContainer, "showJackpotGame").mockResolvedValue();

            const mockInstantiate = jest.requireMock("cc").instantiate;
            mockInstantiate.mockReturnValue(mockEffectNode);
            jest.spyOn(mockEffectNode, "getComponent").mockReturnValue(mockCallbackAnimation);

            // Act
            await effectContainer.receivedJackpot(jackpotData);

            // Assert
            expect(mockAudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.JACKPOT_HIT);
            expect(effectContainer.loadEffectJackpot).toHaveBeenCalled();
            expect(mockCallbackAnimation.setDuration).toHaveBeenCalledWith(4000);
            expect(effectContainer.showEffect).toHaveBeenCalledWith(mockEffectNode);
            expect(mockEffectNode.destroy).toHaveBeenCalled();
            expect(effectContainer.loadJackpotGame).toHaveBeenCalled();
            //@ts-ignore
            expect(effectContainer.showJackpotGame).toHaveBeenCalledWith(50000);
        });

        it("should return early when no jackpot data is provided", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;

            // Act
            await effectContainer.receivedJackpot(null);

            // Assert
            expect(mockBundleManager.loadResourcesAsset).not.toHaveBeenCalled();
        });
    });

    describe("showJackpotGame", () => {
        it("should create and configure jackpot game dialog", async () => {
            // Arrange
            const prizes = 25000;
            //@ts-ignore
            effectContainer.jackpotGamePrefab = mockPrefab;

            const mockInstantiate = jest.requireMock("cc").instantiate;
            const mockGameNode = new Node();
            mockInstantiate.mockReturnValue(mockGameNode);
            jest.spyOn(mockGameNode, "getComponent").mockReturnValue(mockJackpotGame);

            // Act
            //@ts-ignore
            const promise = effectContainer.showJackpotGame(prizes);

            // Simulate the promise resolution
            setTimeout(() => {
                mockJackpotGame.onJackpotGameFinished();
            }, 0);

            await promise;

            // Assert
            expect(mockInstantiate).toHaveBeenCalledWith(mockPrefab);
            expect(mockNode.addChild).toHaveBeenCalledWith(mockGameNode);
            expect(mockGameNode.getComponent).toHaveBeenCalledWith(JackpotGame);
            expect(mockJackpotGame.prizes).toBe(25000);
            expect(mockJackpotGame.initJackpotItems).toHaveBeenCalled();
        });
    });

    describe("loadEffectBonus", () => {
        it("should load bonus effect prefab when not already loaded", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            mockBundleManager.loadResourcesAsset.mockResolvedValue(mockPrefab);

            // Act
            await effectContainer.loadEffectBonus();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).toHaveBeenCalledWith("prefabs/effects/effect-bonus", Prefab);
            //@ts-ignore
            expect(effectContainer.effectBonus).toBe(mockPrefab);
        });

        it("should not load prefab if already loaded", async () => {
            // Arrange
            //@ts-ignore
            effectContainer.effectBonus = mockPrefab;
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;

            // Act
            await effectContainer.loadEffectBonus();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).not.toHaveBeenCalled();
        });
    });

    describe("loadBonusDialog", () => {
        it("should load bonus dialog prefab when not already loaded", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            mockBundleManager.loadResourcesAsset.mockResolvedValue(mockPrefab);

            // Act
            await effectContainer.loadBonusDialog();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).toHaveBeenCalledWith("prefabs/dialogs/dialog-bonus", Prefab);
            //@ts-ignore
            expect(effectContainer.bonusDialogPrefab).toBe(mockPrefab);
        });

        it("should not load prefab if already loaded", async () => {
            // Arrange
            //@ts-ignore
            effectContainer.bonusDialogPrefab = mockPrefab;
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;

            // Act
            await effectContainer.loadBonusDialog();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).not.toHaveBeenCalled();
        });
    });

    describe("receivedBonus", () => {
        it("should handle bonus effect when data is provided", async () => {
            // Arrange
            const bonusData = { bonus: {}, duration: 3000 };
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            const mockAudioUtils = jest.requireMock("db://shared-components/game/audios/utils").AudioUtils;

            mockBundleManager.loadResourcesAsset.mockResolvedValue(mockPrefab);
            //@ts-ignore
            jest.spyOn(effectContainer, "playEffectTransition").mockResolvedValue(mockEffectNode);
            jest.spyOn(effectContainer, "showEffect").mockResolvedValue();
            jest.spyOn(effectContainer, "loadEffectBonus").mockResolvedValue();
            jest.spyOn(effectContainer, "loadBonusDialog").mockResolvedValue();
            jest.spyOn(effectContainer, "showBonusDialog").mockImplementation(() => {});

            const mockInstantiate = jest.requireMock("cc").instantiate;
            mockInstantiate.mockReturnValue(mockEffectNode);
            jest.spyOn(mockEffectNode, "getComponent").mockReturnValue(mockCallbackAnimation);

            // Act
            await effectContainer.receivedBonus(bonusData);

            // Assert
            expect(mockAudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.BONUS);
            expect(effectContainer.loadEffectBonus).toHaveBeenCalled();
            expect(mockCallbackAnimation.setDuration).toHaveBeenCalledWith(3000);
            expect(effectContainer.showEffect).toHaveBeenCalledWith(mockEffectNode);
            expect(mockAudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.BONUS_POPUP);
            expect(effectContainer.loadBonusDialog).toHaveBeenCalled();
            expect(effectContainer.showBonusDialog).toHaveBeenCalledWith({}, expect.any(Function));
        });

        it("should return Promise.resolve when no bonus data is provided", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;

            // Act
            const result = await effectContainer.receivedBonus(null);

            // Assert
            expect(result).toBeUndefined();
            expect(mockBundleManager.loadResourcesAsset).not.toHaveBeenCalled();
        });
    });

    describe("showBonusDialog", () => {
        it("should create and configure bonus dialog", () => {
            // Arrange
            const bonus = { count: 5 };
            const onBonusFinished = jest.fn();
            //@ts-ignore
            effectContainer.bonusDialogPrefab = mockPrefab;

            const mockInstantiate = jest.requireMock("cc").instantiate;
            const mockDialogNode = new Node();
            mockInstantiate.mockReturnValue(mockDialogNode);
            jest.spyOn(mockDialogNode, "getComponent").mockReturnValue(mockBonusDialog);

            // Act
            effectContainer.showBonusDialog(bonus, onBonusFinished);

            // Assert
            expect(mockInstantiate).toHaveBeenCalledWith(mockPrefab);
            expect(mockNode.addChild).toHaveBeenCalledWith(mockDialogNode);
            expect(mockDialogNode.getComponent).toHaveBeenCalledWith(BonusDialog);
            expect(mockBonusDialog.initBonusItems).toHaveBeenCalled();
            expect(mockBonusDialog.setBonusCount).toHaveBeenCalledWith(bonus);
            expect(mockBonusDialog.onBonusFinished).toBe(onBonusFinished);
        });
    });

    describe("loadEffectTransition", () => {
        it("should load transition effect prefab when not already loaded", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            mockBundleManager.loadResourcesAsset.mockResolvedValue(mockPrefab);

            // Act
            await effectContainer.loadEffectTransition();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).toHaveBeenCalledWith("prefabs/effects/effect-transition", Prefab);
            //@ts-ignore
            expect(effectContainer.effectTransition).toBe(mockPrefab);
        });

        it("should not load prefab if already loaded", async () => {
            // Arrange
            //@ts-ignore
            effectContainer.effectTransition = mockPrefab;
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;

            // Act
            await effectContainer.loadEffectTransition();

            // Assert
            expect(mockBundleManager.loadResourcesAsset).not.toHaveBeenCalled();
        });
    });

    describe("loadPrefab", () => {
        it("should call bundleManager.loadResourcesAsset with correct parameters", async () => {
            // Arrange
            const path = "test/path";
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            mockBundleManager.loadResourcesAsset.mockResolvedValue(mockPrefab);

            // Act
            const result = await effectContainer.loadPrefab(path);

            // Assert
            expect(mockBundleManager.loadResourcesAsset).toHaveBeenCalledWith(path, Prefab);
            expect(result).toBe(mockPrefab);
        });
    });

    describe("playEffectTransition", () => {
        it("should play transition effect and return the effect node", async () => {
            // Arrange
            const mockBundleManager = jest.requireMock(
                "db://shared-components/shared/common-components/bundle-manager/bundle-manager"
            ).bundleManager;
            const mockAudioUtils = jest.requireMock("db://shared-components/game/audios/utils").AudioUtils;

            mockBundleManager.loadResourcesAsset.mockReturnValue(mockPrefab);
            // Set the effectTransition property directly since we're mocking loadEffectTransition
            (effectContainer as any).effectTransition = mockPrefab;
            jest.spyOn(effectContainer, "loadEffectTransition").mockResolvedValue();
            jest.spyOn(effectContainer, "showEffect").mockResolvedValue();

            const mockInstantiate = jest.requireMock("cc").instantiate;
            mockInstantiate.mockReturnValue(mockEffectNode);
            jest.spyOn(mockEffectNode, "getComponent").mockReturnValue(mockCallbackAnimation);

            // Act
            //@ts-ignore
            const result = await effectContainer.playEffectTransition();

            // Assert
            expect(effectContainer.loadEffectTransition).toHaveBeenCalled();
            expect(mockInstantiate).toHaveBeenCalledWith(mockPrefab);
            expect(mockEffectNode.getComponent).toHaveBeenCalledWith(CallbackAnimation);
            expect(mockCallbackAnimation.autoDestroyNode).toBe(false);
            expect(mockAudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.TRANSITION);
            expect(effectContainer.showEffect).toHaveBeenCalledWith(mockEffectNode);
            expect(result).toBe(mockEffectNode);
        });
    });

    describe("showEffect", () => {
        it("should add effect to node and play animation", async () => {
            // Arrange
            const mockEffect = new Node();
            jest.spyOn(mockEffect, "getComponent").mockReturnValue(mockCallbackAnimation);

            // Act
            const promise = effectContainer.showEffect(mockEffect);

            // Simulate animation completion
            setTimeout(() => {
                mockCallbackAnimation.onFinishedCallback();
            }, 0);

            await promise;

            // Assert
            expect(mockNode.addChild).toHaveBeenCalledWith(mockEffect);
            expect(mockEffect.getComponent).toHaveBeenCalledWith(CallbackAnimation);
            expect(mockCallbackAnimation.play).toHaveBeenCalled();
        });
    });
});
