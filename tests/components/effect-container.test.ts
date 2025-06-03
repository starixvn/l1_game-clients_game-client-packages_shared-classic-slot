import "reflect-metadata";

import { Node, Prefab } from "cc";
import { Container } from "inversify";
import EffectContainer from "../../assets/scripts/components/effect-container";
import { SlotBoardStore } from "../../assets/scripts/handlers/stores/slot-board-store";

// Mock AudioIds
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

// Mock AudioUtils
jest.mock("db://shared-components/game/audios/utils", () => ({
    AudioUtils: {
        playSFX: jest.fn(),
    },
}));

// Mock ObserverComponent
jest.mock("db://shared-components/shared/common-components/observer-component/scripts/observer-component", () => ({
    ObserverComponent: class MockObserverComponent {
        node = new (require("cc").Node)();
        onLoad() {}
        onDestroy() {}
    },
}));

// Mock stores
jest.mock("../../assets/scripts/handlers/stores/slot-board-store", () => ({
    SlotBoardStore: jest.fn().mockImplementation(() => ({
        receivedFreeSpins: null,
        receivedBigWin: null,
        receivedJackpot: null,
        receivedBonus: null,
    })),
}));

// Mock BonusDialog
jest.mock("../../assets/scripts/components/bonus/bonus-dialog", () => ({
    default: class MockBonusDialog {
        initBonusItems = jest.fn();
        setBonusCount = jest.fn();
        onBonusFinished = null;
    },
}));

// Mock CallbackAnimation
jest.mock("../../assets/scripts/components/callback-animation/callback-animation", () => ({
    default: class MockCallbackAnimation {
        setDuration = jest.fn();
        onFinishedCallback = null;
        autoDestroyNode = true;
        play = jest.fn();
    },
}));

// Mock BigWinAnimation
jest.mock("../../assets/scripts/components/others/big-win-animation", () => ({
    default: class MockBigWinAnimation {
        setAmount = jest.fn();
    },
}));

// Mock JackpotGame
jest.mock("../../assets/scripts/components/others/jackpot-game", () => ({
    default: class MockJackpotGame {
        prizes = 0;
        initJackpotItems = jest.fn();
        onJackpotGameFinished = null;
    },
}));

describe("EffectContainer", () => {
    let container: Container;
    let component: EffectContainer;
    let mockSlotBoardStore: jest.Mocked<SlotBoardStore>;
    let mockEffectNode: Node;
    let mockTransitionEffect: Node;
    let mockCallbackAnimation: any;
    let mockBigWinAnimation: any;
    let mockBonusDialog: any;
    let mockJackpotGame: any;

    beforeEach(() => {
        container = new Container();

        // Create mock store
        const MockedSlotBoardStore = jest.requireMock("../../assets/scripts/handlers/stores/slot-board-store").SlotBoardStore;
        mockSlotBoardStore = new MockedSlotBoardStore() as jest.Mocked<SlotBoardStore>;

        // Create mock nodes and components
        const { instantiate, Node } = jest.requireMock("cc");
        const MockCallbackAnimation = jest.requireMock("../../assets/scripts/components/callback-animation/callback-animation").default;
        const MockBigWinAnimation = jest.requireMock("../../assets/scripts/components/others/big-win-animation").default;
        const MockBonusDialog = jest.requireMock("../../assets/scripts/components/bonus/bonus-dialog").default;
        const MockJackpotGame = jest.requireMock("../../assets/scripts/components/others/jackpot-game").default;

        mockEffectNode = new Node();
        mockTransitionEffect = new Node();
        mockCallbackAnimation = new MockCallbackAnimation();
        mockBigWinAnimation = new MockBigWinAnimation();
        mockBonusDialog = new MockBonusDialog();
        mockJackpotGame = new MockJackpotGame();

        // Setup instantiate mock
        instantiate.mockReturnValue(mockEffectNode);

        // Setup getComponent mocks
        (mockEffectNode.getComponent as jest.Mock).mockImplementation((type) => {
            if (type === MockCallbackAnimation) return mockCallbackAnimation;
            if (type === MockBigWinAnimation) return mockBigWinAnimation;
            if (type === MockBonusDialog) return mockBonusDialog;
            if (type === MockJackpotGame) return mockJackpotGame;
            return null;
        });

        // Bind to container
        container.bind(SlotBoardStore).toConstantValue(mockSlotBoardStore);

        // Create component instance
        component = new EffectContainer();
        component.node = new Node("test-node");

        // Set up prefab properties
        (component as any).effectFreeSpin = {} as Prefab;
        (component as any).effectBigWin = {} as Prefab;
        (component as any).effectJackpot = {} as Prefab;
        (component as any).effectBonus = {} as Prefab;
        (component as any).effectTransitionPrefab = {} as Prefab;
        (component as any).jackpotGamePrefab = {} as Prefab;
        (component as any).bonusDialogPrefab = {} as Prefab;

        // Add missing methods
        component.getComponent = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe("receivedFreeSpins", () => {
        it("should return early when receivedFreeSpins is null", async () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const { instantiate } = jest.requireMock("cc");

            await component.receivedFreeSpins(null);

            expect(AudioUtils.playSFX).not.toHaveBeenCalled();
            expect(instantiate).not.toHaveBeenCalled();
        });

        it("should play free spin effect when receivedFreeSpins is provided", async () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const { AudioIds } = jest.requireMock("db://assets/game/audios/AudioIds");
            const { instantiate } = jest.requireMock("cc");
            const showEffectSpy = jest.spyOn(component, "showEffect").mockResolvedValue();

            const freeSpinData = { freeSpins: {}, duration: 2000 };

            await component.receivedFreeSpins(freeSpinData);

            expect(AudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.FREESPIN);
            expect(instantiate).toHaveBeenCalledWith((component as any).effectFreeSpin);
            expect(mockCallbackAnimation.setDuration).toHaveBeenCalledWith(2000);
            expect(showEffectSpy).toHaveBeenCalledWith(mockEffectNode);
        });
    });

    describe("receivedBigWin", () => {
        it("should return early when receivedBigWin is null", async () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const { instantiate } = jest.requireMock("cc");

            await component.receivedBigWin(null);

            expect(AudioUtils.playSFX).not.toHaveBeenCalled();
            expect(instantiate).not.toHaveBeenCalled();
        });

        it("should play big win effect when receivedBigWin is provided", async () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const { AudioIds } = jest.requireMock("db://assets/game/audios/AudioIds");
            const { instantiate } = jest.requireMock("cc");
            const showEffectSpy = jest.spyOn(component, "showEffect").mockResolvedValue();

            const bigWinData = {
                bigWin: {},
                duration: 3000,
                showBigWinValue: 1500,
                delayShowBigWinValue: 500,
                amount: 10000,
            };

            await component.receivedBigWin(bigWinData);

            expect(AudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.BIG_WIN);
            expect(instantiate).toHaveBeenCalledWith((component as any).effectBigWin);
            expect(mockCallbackAnimation.setDuration).toHaveBeenCalledWith(3000);
            expect(mockBigWinAnimation.setAmount).toHaveBeenCalledWith({
                amount: 10000,
                duration: 1500,
                delayTime: 500,
            });
            expect(showEffectSpy).toHaveBeenCalledWith(mockEffectNode);
        });
    });

    describe("receivedJackpot", () => {
        it("should return early when receivedJackpot is null", async () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");

            await component.receivedJackpot(null);

            expect(AudioUtils.playSFX).not.toHaveBeenCalled();
        });

        it("should play jackpot effect and show jackpot game", async () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const { AudioIds } = jest.requireMock("db://assets/game/audios/AudioIds");
            const { instantiate } = jest.requireMock("cc");
            const playEffectTransitionSpy = jest.spyOn(component as any, "playEffectTransition").mockResolvedValue(mockTransitionEffect);
            const showEffectSpy = jest.spyOn(component, "showEffect").mockResolvedValue(undefined);
            const showJackpotGameSpy = jest.spyOn(component as any, "showJackpotGame").mockResolvedValue(undefined);

            const jackpotData = {
                jackpot: { prizes: 5000 },
                duration: 4000,
            };

            await component.receivedJackpot(jackpotData);

            expect(AudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.JACKPOT_HIT);
            expect(playEffectTransitionSpy).toHaveBeenCalled();
            expect(instantiate).toHaveBeenCalledWith((component as any).effectJackpot);
            expect(mockCallbackAnimation.setDuration).toHaveBeenCalledWith(4000);
            expect(showEffectSpy).toHaveBeenCalledWith(mockEffectNode);
            expect(mockTransitionEffect.destroy).toHaveBeenCalled();
            expect(showJackpotGameSpy).toHaveBeenCalledWith(5000);
        });
    });

    describe("receivedBonus", () => {
        it("should return resolved promise when receivedBonus is null", async () => {
            const result = await component.receivedBonus(null);

            expect(result).toBeUndefined();
        });

        it("should play bonus effect and show bonus dialog", (done) => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const { AudioIds } = jest.requireMock("db://assets/game/audios/AudioIds");
            const { instantiate } = jest.requireMock("cc");
            const showEffectSpy = jest.spyOn(component, "showEffect").mockResolvedValue();
            const showBonusDialogSpy = jest.spyOn(component, "showBonusDialog").mockImplementation((bonus, callback) => {
                callback();
            });

            const bonusData = {
                bonus: { count: 3 },
                duration: 2500,
            };

            component.receivedBonus(bonusData).then(() => {
                expect(AudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.BONUS);
                expect(instantiate).toHaveBeenCalledWith((component as any).effectBonus);
                expect(mockCallbackAnimation.setDuration).toHaveBeenCalledWith(2500);
                expect(showEffectSpy).toHaveBeenCalledWith(mockEffectNode);
                expect(AudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.BONUS_POPUP);
                expect(showBonusDialogSpy).toHaveBeenCalled();
                done();
            });
        });
    });

    describe("showJackpotGame", () => {
        it("should create and setup jackpot game", () => {
            const { instantiate } = jest.requireMock("cc");
            const prizes = 7500;

            const promise = (component as any).showJackpotGame(prizes);

            expect(instantiate).toHaveBeenCalledWith((component as any).jackpotGamePrefab);
            expect(component.node.addChild).toHaveBeenCalledWith(mockEffectNode);
            expect(mockJackpotGame.prizes).toBe(prizes);
            expect(mockJackpotGame.initJackpotItems).toHaveBeenCalled();
            expect(typeof mockJackpotGame.onJackpotGameFinished).toBe("function");

            // Test promise resolution
            mockJackpotGame.onJackpotGameFinished();
            expect(promise).resolves.toBeUndefined();
        });
    });

    describe("showBonusDialog", () => {
        it("should create and setup bonus dialog", () => {
            const { instantiate } = jest.requireMock("cc");
            const bonus = { count: 5 };
            const onBonusFinished = jest.fn();

            component.showBonusDialog(bonus, onBonusFinished);

            expect(instantiate).toHaveBeenCalledWith((component as any).bonusDialogPrefab);
            expect(component.node.addChild).toHaveBeenCalledWith(mockEffectNode);
            expect(mockBonusDialog.initBonusItems).toHaveBeenCalled();
            expect(mockBonusDialog.setBonusCount).toHaveBeenCalledWith(bonus);
            expect(mockBonusDialog.onBonusFinished).toBe(onBonusFinished);
        });
    });

    describe("playEffectTransition", () => {
        it("should return null when effectTransitionPrefab is not set", async () => {
            (component as any).effectTransitionPrefab = null;

            const result = await (component as any).playEffectTransition();

            expect(result).toBeNull();
        });

        it("should play transition effect and return effect node", async () => {
            const { AudioUtils } = jest.requireMock("db://shared-components/game/audios/utils");
            const { AudioIds } = jest.requireMock("db://assets/game/audios/AudioIds");
            const { instantiate } = jest.requireMock("cc");
            const showEffectSpy = jest.spyOn(component, "showEffect").mockResolvedValue();

            const result = await (component as any).playEffectTransition();

            expect(instantiate).toHaveBeenCalledWith((component as any).effectTransitionPrefab);
            expect(mockCallbackAnimation.autoDestroyNode).toBe(false);
            expect(AudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.TRANSITION);
            expect(showEffectSpy).toHaveBeenCalledWith(mockEffectNode);
            expect(result).toBe(mockEffectNode);
        });
    });

    describe("showEffect", () => {
        it("should add effect to node and setup animation callback", (done) => {
            const { Node } = jest.requireMock("cc");
            const effectNode = new Node();

            const promise = component.showEffect(effectNode);

            expect(component.node.addChild).toHaveBeenCalledWith(effectNode);
            expect(mockCallbackAnimation.play).toHaveBeenCalled();
            expect(typeof mockCallbackAnimation.onFinishedCallback).toBe("function");

            // Test promise resolution
            mockCallbackAnimation.onFinishedCallback();
            promise.then(() => {
                done();
            });
        });
    });
});
