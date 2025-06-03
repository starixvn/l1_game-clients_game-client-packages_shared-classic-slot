import { Node, Prefab, instantiate } from "cc";
import { Container } from "inversify";
import "reflect-metadata";
import EffectContainer from "../../assets/scripts/components/effect-container";
import { SlotBoardStore } from "../../assets/scripts/handlers/stores/slot-board-store";

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

// Mock AudioIds and AudioUtils
jest.mock("db://assets/game/audios/AudioIds", () => ({
    AudioIds: {
        FREESPIN: "freespin",
        BIG_WIN: "big_win",
        JACKPOT_HIT: "jackpot_hit",
        BONUS: "bonus",
        BONUS_POPUP: "bonus_popup",
        TRANSITION: "transition",
    },
}));

jest.mock("db://shared-components/game/audios/utils", () => ({
    AudioUtils: {
        playSFX: jest.fn(),
    },
}));

// Mock ObserverComponent with ALL lifecycle methods
jest.mock("db://shared-components/shared/common-components/observer-component/scripts/observer-component", () => ({
    ObserverComponent: class MockObserverComponent {
        onLoad() {}
        onDestroy() {}
        start() {}
        update() {}
        node = new Node();
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

// Mock stores
jest.mock("../../assets/scripts/handlers/stores/slot-board-store", () => ({
    SlotBoardStore: jest.fn().mockImplementation(() => ({
        receivedFreeSpins: null,
        receivedBigWin: null,
        receivedJackpot: null,
        receivedBonus: null,
        reset: jest.fn(),
        resetOnNewSpin: jest.fn(),
    })),
}));

// Mock component dependencies
jest.mock("../../assets/scripts/components/bonus/bonus-dialog", () => ({
    __esModule: true,
    default: class MockBonusDialog {
        initBonusItems = jest.fn();
        setBonusCount = jest.fn();
        onBonusFinished = jest.fn();
    },
}));

jest.mock("../../assets/scripts/components/callback-animation/callback-animation", () => ({
    __esModule: true,
    default: class MockCallbackAnimation {
        setDuration = jest.fn();
        play = jest.fn();
        onFinishedCallback = jest.fn();
        autoDestroyNode = true;
    },
}));

jest.mock("../../assets/scripts/components/others/big-win-animation", () => ({
    __esModule: true,
    default: class MockBigWinAnimation {
        setAmount = jest.fn();
    },
}));

jest.mock("../../assets/scripts/components/others/jackpot-game", () => ({
    __esModule: true,
    default: class MockJackpotGame {
        prizes = 0;
        initJackpotItems = jest.fn();
        onJackpotGameFinished = jest.fn();
    },
}));

// Mock cc instantiate
jest.mock("cc", () => {
    const originalCc = jest.requireActual("cc");
    return {
        ...originalCc,
        instantiate: jest.fn().mockImplementation(() => {
            const node = new originalCc.Node();
            node.getComponent = jest.fn();
            node.destroy = jest.fn();
            return node;
        }),
    };
});

describe("EffectContainer", () => {
    let container: Container;
    let effectContainer: EffectContainer;
    let mockSlotBoardStore: jest.Mocked<SlotBoardStore>;
    let mockInstantiate: jest.MockedFunction<typeof instantiate>;
    let mockAudioUtils: any;

    beforeEach(() => {
        container = new Container();

        // Create mock store instance
        const MockSlotBoardStoreClass = jest.requireMock("../../assets/scripts/handlers/stores/slot-board-store").SlotBoardStore;
        mockSlotBoardStore = new MockSlotBoardStoreClass() as jest.Mocked<SlotBoardStore>;

        // Bind dependencies to container
        container.bind(SlotBoardStore).toConstantValue(mockSlotBoardStore);
        container.bind(EffectContainer).toSelf();

        // Get instances from container
        effectContainer = container.get(EffectContainer);

        // Set up component properties
        effectContainer.node = new Node();
        effectContainer.node.addChild = jest.fn();

        // Set up prefab properties using type assertion to access protected properties
        (effectContainer as any).effectTransitionPrefab = new Prefab();
        (effectContainer as any).effectJackpot = new Prefab();
        (effectContainer as any).effectBonus = new Prefab();
        (effectContainer as any).effectFreeSpin = new Prefab();
        (effectContainer as any).effectBigWin = new Prefab();
        (effectContainer as any).jackpotGamePrefab = new Prefab();
        (effectContainer as any).bonusDialogPrefab = new Prefab();

        // Get mocked functions
        mockInstantiate = instantiate as jest.MockedFunction<typeof instantiate>;
        mockAudioUtils = jest.requireMock("db://shared-components/game/audios/utils").AudioUtils;

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("receivedFreeSpins", () => {
        it("should return early if receivedFreeSpins is null", async () => {
            await effectContainer.receivedFreeSpins(null);

            expect(mockAudioUtils.playSFX).not.toHaveBeenCalled();
            expect(mockInstantiate).not.toHaveBeenCalled();
        });

        it("should return early if receivedFreeSpins is undefined", async () => {
            await effectContainer.receivedFreeSpins(undefined);

            expect(mockAudioUtils.playSFX).not.toHaveBeenCalled();
            expect(mockInstantiate).not.toHaveBeenCalled();
        });

        it("should play freespin effect when receivedFreeSpins is provided", async () => {
            const receivedFreeSpins = { freeSpins: {}, duration: 2000 };

            const mockEffect = new Node();
            const mockAnimation = {
                setDuration: jest.fn(),
                onFinishedCallback: jest.fn(),
                play: jest.fn(),
            };
            mockEffect.getComponent = jest.fn().mockReturnValue(mockAnimation);
            mockInstantiate.mockReturnValue(mockEffect);

            // Mock showEffect to resolve immediately
            jest.spyOn(effectContainer, "showEffect").mockResolvedValue(undefined);

            await effectContainer.receivedFreeSpins(receivedFreeSpins);

            expect(mockAudioUtils.playSFX).toHaveBeenCalledWith("freespin");
            expect(mockInstantiate).toHaveBeenCalledWith((effectContainer as any).effectFreeSpin);
            expect(mockAnimation.setDuration).toHaveBeenCalledWith(2000);
            expect(effectContainer.showEffect).toHaveBeenCalledWith(mockEffect);
        });
    });

    describe("receivedBigWin", () => {
        it("should return early if receivedBigWin is null", async () => {
            await effectContainer.receivedBigWin(null);

            expect(mockAudioUtils.playSFX).not.toHaveBeenCalled();
            expect(mockInstantiate).not.toHaveBeenCalled();
        });

        it("should return early if receivedBigWin is undefined", async () => {
            await effectContainer.receivedBigWin(undefined);

            expect(mockAudioUtils.playSFX).not.toHaveBeenCalled();
            expect(mockInstantiate).not.toHaveBeenCalled();
        });

        it("should play big win effect when receivedBigWin is provided", async () => {
            const receivedBigWin = {
                bigWin: {},
                duration: 3000,
                showBigWinValue: 1500,
                delayShowBigWinValue: 500,
                amount: 1000,
            };

            const mockEffect = new Node();
            const mockCallbackAnimation = {
                setDuration: jest.fn(),
                onFinishedCallback: jest.fn(),
                play: jest.fn(),
            };
            const mockBigWinAnimation = {
                setAmount: jest.fn(),
            };

            mockEffect.getComponent = jest.fn().mockReturnValueOnce(mockCallbackAnimation).mockReturnValueOnce(mockBigWinAnimation);
            mockInstantiate.mockReturnValue(mockEffect);

            // Mock showEffect to resolve immediately
            jest.spyOn(effectContainer, "showEffect").mockResolvedValue(undefined);

            await effectContainer.receivedBigWin(receivedBigWin);

            expect(mockAudioUtils.playSFX).toHaveBeenCalledWith("big_win");
            expect(mockInstantiate).toHaveBeenCalledWith((effectContainer as any).effectBigWin);
            expect(mockCallbackAnimation.setDuration).toHaveBeenCalledWith(3000);
            expect(mockBigWinAnimation.setAmount).toHaveBeenCalledWith({
                amount: 1000,
                duration: 1500,
                delayTime: 500,
            });
            expect(effectContainer.showEffect).toHaveBeenCalledWith(mockEffect);
        });
    });

    describe("receivedJackpot", () => {
        it("should return early if receivedJackpot is null", async () => {
            await effectContainer.receivedJackpot(null);

            expect(mockAudioUtils.playSFX).not.toHaveBeenCalled();
            expect(mockInstantiate).not.toHaveBeenCalled();
        });

        it("should return early if receivedJackpot is undefined", async () => {
            await effectContainer.receivedJackpot(undefined);

            expect(mockAudioUtils.playSFX).not.toHaveBeenCalled();
            expect(mockInstantiate).not.toHaveBeenCalled();
        });

        it("should play jackpot effect with transition and jackpot game", async () => {
            const receivedJackpot = {
                jackpot: { prizes: 5000 },
                duration: 4000,
            };

            const mockTransition = new Node();
            mockTransition.destroy = jest.fn();

            const mockEffect = new Node();
            const mockAnimation = {
                setDuration: jest.fn(),
                onFinishedCallback: jest.fn(),
                play: jest.fn(),
            };
            mockEffect.getComponent = jest.fn().mockReturnValue(mockAnimation);
            mockInstantiate.mockReturnValue(mockEffect);

            // Mock methods using type assertion for protected method
            jest.spyOn(effectContainer as any, "playEffectTransition").mockResolvedValue(mockTransition);
            jest.spyOn(effectContainer, "showEffect").mockResolvedValue(undefined);
            jest.spyOn(effectContainer as any, "showJackpotGame").mockResolvedValue(undefined);

            await effectContainer.receivedJackpot(receivedJackpot);

            expect(mockAudioUtils.playSFX).toHaveBeenCalledWith("jackpot_hit");
            expect((effectContainer as any).playEffectTransition).toHaveBeenCalled();
            expect(mockInstantiate).toHaveBeenCalledWith((effectContainer as any).effectJackpot);
            expect(mockAnimation.setDuration).toHaveBeenCalledWith(4000);
            expect(effectContainer.showEffect).toHaveBeenCalledWith(mockEffect);
            expect(mockTransition.destroy).toHaveBeenCalled();
            expect((effectContainer as any).showJackpotGame).toHaveBeenCalledWith(5000);
        });
    });

    describe("receivedBonus", () => {
        it("should return resolved promise if receivedBonus is null", async () => {
            const result = await effectContainer.receivedBonus(null);

            expect(result).toBeUndefined();
            expect(mockAudioUtils.playSFX).not.toHaveBeenCalled();
            expect(mockInstantiate).not.toHaveBeenCalled();
        });

        it("should return resolved promise if receivedBonus is undefined", async () => {
            const result = await effectContainer.receivedBonus(undefined);

            expect(result).toBeUndefined();
            expect(mockAudioUtils.playSFX).not.toHaveBeenCalled();
            expect(mockInstantiate).not.toHaveBeenCalled();
        });

        it("should play bonus effect and show bonus dialog", async () => {
            const receivedBonus = {
                bonus: { value: 1000 },
                duration: 2500,
            };

            const mockEffect = new Node();
            const mockAnimation = {
                setDuration: jest.fn(),
                onFinishedCallback: jest.fn(),
                play: jest.fn(),
            };
            mockEffect.getComponent = jest.fn().mockReturnValue(mockAnimation);
            mockInstantiate.mockReturnValue(mockEffect);

            // Mock showEffect to resolve immediately
            jest.spyOn(effectContainer, "showEffect").mockResolvedValue(undefined);
            jest.spyOn(effectContainer, "showBonusDialog").mockImplementation((bonus, callback) => {
                setTimeout(callback, 0); // Simulate async callback
            });

            const result = effectContainer.receivedBonus(receivedBonus);

            // Wait a tick for the async operations
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(mockAudioUtils.playSFX).toHaveBeenNthCalledWith(1, "bonus");
            expect(mockInstantiate).toHaveBeenCalledWith((effectContainer as any).effectBonus);
            expect(mockAnimation.setDuration).toHaveBeenCalledWith(2500);
            expect(effectContainer.showEffect).toHaveBeenCalledWith(mockEffect);

            // Wait for the bonus effect to complete
            await result;

            expect(mockAudioUtils.playSFX).toHaveBeenNthCalledWith(2, "bonus_popup");
            expect(effectContainer.showBonusDialog).toHaveBeenCalledWith({ value: 1000 }, expect.any(Function));
        });
    });

    describe("showJackpotGame", () => {
        it("should create jackpot game node and set up dialog", async () => {
            const prizes = 2500;
            const mockNode = new Node();
            const mockDialog = {
                prizes: 0,
                initJackpotItems: jest.fn(),
                onJackpotGameFinished: jest.fn(),
            };

            mockNode.getComponent = jest.fn().mockReturnValue(mockDialog);
            mockInstantiate.mockReturnValue(mockNode);

            // Execute in background since it returns a promise that resolves via callback
            const promise = (effectContainer as any).showJackpotGame(prizes);

            // Trigger the callback to resolve the promise
            setTimeout(() => {
                mockDialog.onJackpotGameFinished();
            }, 0);

            await promise;

            expect(mockInstantiate).toHaveBeenCalledWith((effectContainer as any).jackpotGamePrefab);
            expect(effectContainer.node.addChild).toHaveBeenCalledWith(mockNode);
            expect(mockDialog.prizes).toBe(2500);
            expect(mockDialog.initJackpotItems).toHaveBeenCalled();
        });
    });

    describe("showBonusDialog", () => {
        it("should create bonus dialog node and set up dialog", () => {
            const bonus = { value: 1500 };
            const mockCallback = jest.fn();
            const mockNode = new Node();
            const mockDialog = {
                initBonusItems: jest.fn(),
                setBonusCount: jest.fn(),
                onBonusFinished: jest.fn(),
            };

            mockNode.getComponent = jest.fn().mockReturnValue(mockDialog);
            mockInstantiate.mockReturnValue(mockNode);

            effectContainer.showBonusDialog(bonus, mockCallback);

            expect(mockInstantiate).toHaveBeenCalledWith((effectContainer as any).bonusDialogPrefab);
            expect(effectContainer.node.addChild).toHaveBeenCalledWith(mockNode);
            expect(mockDialog.initBonusItems).toHaveBeenCalled();
            expect(mockDialog.setBonusCount).toHaveBeenCalledWith(bonus);
            expect(mockDialog.onBonusFinished).toBe(mockCallback);
        });
    });

    describe("playEffectTransition", () => {
        it("should return null if effectTransitionPrefab is not set", async () => {
            (effectContainer as any).effectTransitionPrefab = null;

            const result = await (effectContainer as any).playEffectTransition();

            expect(result).toBeNull();
            expect(mockInstantiate).not.toHaveBeenCalled();
            expect(mockAudioUtils.playSFX).not.toHaveBeenCalled();
        });

        it("should play transition effect and return effect node", async () => {
            const mockEffect = new Node();
            const mockAnimation = {
                autoDestroyNode: true,
                onFinishedCallback: jest.fn(),
                play: jest.fn(),
            };
            mockEffect.getComponent = jest.fn().mockReturnValue(mockAnimation);
            mockInstantiate.mockReturnValue(mockEffect);

            // Mock showEffect to resolve immediately
            jest.spyOn(effectContainer, "showEffect").mockResolvedValue(undefined);

            const result = await (effectContainer as any).playEffectTransition();

            expect(mockAudioUtils.playSFX).toHaveBeenCalledWith("transition");
            expect(mockInstantiate).toHaveBeenCalledWith((effectContainer as any).effectTransitionPrefab);
            expect(mockAnimation.autoDestroyNode).toBe(false);
            expect(effectContainer.showEffect).toHaveBeenCalledWith(mockEffect);
            expect(result).toBe(mockEffect);
        });
    });

    describe("showEffect", () => {
        it("should add effect to node and play animation", async () => {
            const mockEffect = new Node();
            const mockAnimation = {
                onFinishedCallback: jest.fn(),
                play: jest.fn(),
            };
            mockEffect.getComponent = jest.fn().mockReturnValue(mockAnimation);

            // Execute showEffect and trigger the callback
            const promise = effectContainer.showEffect(mockEffect);

            // Trigger the animation callback to resolve the promise
            setTimeout(() => {
                mockAnimation.onFinishedCallback();
            }, 0);

            await promise;

            expect(effectContainer.node.addChild).toHaveBeenCalledWith(mockEffect);
            expect(mockEffect.getComponent).toHaveBeenCalled();
            expect(mockAnimation.play).toHaveBeenCalled();
        });
    });
});
