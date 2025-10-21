import "reflect-metadata";
//rest
import gc from "@sg/game-client-base";
import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { Container } from "inversify";

// Mock game client base - this needs to be done first
jest.mock("@sg/game-client-base", () => ({
    FormatUtils: {
        numberWithCommas: jest.fn((num: number) => num.toLocaleString()),
    },
    Bet: {
        BetStore: class MockBetStore {
            // Empty mock class
        },
    },
    Connection: {
        ConnectionHandlers: {
            RetryGameHandler: class MockRetryGameHandler {
                // Empty mock class
            },
        },
    },
    Error: {
        ErrorHandlers: class MockErrorHandlers {
            // Empty mock class
        },
    },
    Rounds: {
        RoundTimeStore: class MockRoundTimeStore {
            // Empty mock class
        },
        RoundStore: class MockRoundStore {
            // Empty mock class
        },
    },
    GameConfigs: {
        GameConfigStore: class MockGameConfigStore {
            // Empty mock class
        },
    },
    Bonuses: {
        BonusStore: class MockBonusStore {
            // Empty mock class
        },
    },
    JackpotPools: {
        JackpotPoolStore: class MockJackpotPoolStore {
            // Empty mock class
        },
    },
    Leaderboard: {
        LeaderboardStore: class MockLeaderboardStore {
            // Empty mock class
        },
    },
    Settings: {
        SettingsStore: class MockSettingsStore {
            // Empty mock class
        },
    },
}));

// Mock the entire handlers module to prevent all handler imports
jest.mock("../../../assets/scripts/handlers", () => ({
    BetControlStore: jest.fn().mockImplementation(() => ({
        totalBet: 100,
        stake: 10,
        turboEnabled: false,
        autoSpinEnabled: false,
        disableIncreaseStake: false,
        disableDecreaseStake: false,
        setTurbo: jest.fn(),
        setStakeSelectorShow: jest.fn(),
        quickChangeStake: jest.fn(),
    })),
    SlotBetHandler: jest.fn().mockImplementation(() => ({
        handleClickAutoSpin: jest.fn(),
        showLineSelection: jest.fn(),
    })),
    SlotBoardStore: jest.fn().mockImplementation(() => ({
        winningBet: 0,
    })),
    FEATURE_NAME: "classic-slot",
}));

// Mock SlotBoardStore separately
jest.mock("../../../assets/scripts/handlers/stores/slot-board-store", () => ({
    SlotBoardStore: jest.fn().mockImplementation(() => ({
        winningBet: 0,
    })),
}));

// Import after mocking
import { Button, Label, sp, Toggle } from "cc";
import BetControl from "../../../assets/scripts/components/bet-control/bet-control";
import { BetControlStore, SlotBetHandler } from "../../../assets/scripts/handlers";
import { SlotBoardStore } from "../../../assets/scripts/handlers/stores/slot-board-store";

// Mock AudioUtils
jest.mock("db://shared-components/game/audios/utils", () => ({
    AudioUtils: {
        playSFX: jest.fn(),
        playClick: jest.fn(),
    }
}));

// Mock AudioIds
jest.mock("db://assets/game/audios/AudioIds", () => ({
    AudioIds: {
        WIN: "win",
    },
}));

// Mock ObserverComponent
jest.mock("db://shared-components/shared/common-components/observer-component/scripts/observer-component", () => ({
    ObserverComponent: class MockObserverComponent {
        onLoad() { }
    },
}));

// Mock floatToNumber utility
jest.mock("../../../assets/scripts/utils/classic-slot-utils", () => ({
    floatToNumber: jest.fn(({ from, to, duration, progress }) => {
        // Simulate the tween by calling progress with the final value
        progress(to);
        return {
            stop: jest.fn(),
        };
    }),
    DialogName: {
        AUTO_SPIN: "auto-spin",
        STAKE_SELECTOR: "stake-selector",
        LINE_SELECTION: "line-selection",
        PREVIEW_ODDS: "preview-odds",
        SPINNING: "spinning",
        IN_GAME_MENU: "in-game-menu",
        DUMMY_DIALOG: "dummy-dialog",
        GAME_GUIDE: "game-guide",
        CHANGE_BET: "change-bet",
    },
}));

describe("BetControl", () => {
    let container: Container;
    let betControl: BetControl;
    let mockBetControlStore: jest.Mocked<BetControlStore>;
    let mockSlotBoardStore: jest.Mocked<SlotBoardStore>;
    let mockSlotBetHandler: jest.Mocked<SlotBetHandler>;

    beforeEach(() => {
        container = new Container();

        // Create mock stores
        const MockedBetControlStore = jest.requireMock("../../../assets/scripts/handlers").BetControlStore;
        mockBetControlStore = new MockedBetControlStore();

        const MockedSlotBoardStore = jest.requireMock("../../../assets/scripts/handlers").SlotBoardStore;
        mockSlotBoardStore = new MockedSlotBoardStore();

        const MockedSlotBetHandler = jest.requireMock("../../../assets/scripts/handlers").SlotBetHandler;
        mockSlotBetHandler = new MockedSlotBetHandler();

        // Create actual BetControl instance
        betControl = new BetControl();

        // Initialize UI components with mocks
        betControl.lblStake = new Label();
        betControl.lblTotalBet = new Label();
        betControl.lblTotalWin = new Label();
        betControl.spineEffectWin = new sp.Skeleton();
        betControl.toggleAutoSpin = new Toggle();
        betControl.toggleTurbo = new Toggle();
        betControl.btnIncreaseStake = new Button();
        betControl.btnDecreaseStake = new Button();
        betControl.tweenFloatNumber = null;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("renderTotalBet", () => {
        it("should format and display total bet amount", () => {
            const totalBet = 1000;

            betControl.renderTotalBet(totalBet);

            expect(gc.FormatUtils.numberWithCommas).toHaveBeenCalledWith(totalBet, 2, true);
            expect(betControl.lblTotalBet.string).toBe("1,000");
        });

        it("should handle zero total bet", () => {
            const totalBet = 0;

            betControl.renderTotalBet(totalBet);

            expect(gc.FormatUtils.numberWithCommas).toHaveBeenCalledWith(totalBet, 2, true);
            expect(betControl.lblTotalBet.string).toBe("0");
        });

        it("should handle large total bet amounts", () => {
            const totalBet = 1000000;

            betControl.renderTotalBet(totalBet);

            expect(gc.FormatUtils.numberWithCommas).toHaveBeenCalledWith(totalBet, 2, true);
            expect(betControl.lblTotalBet.string).toBe("1,000,000");
        });

        it("should handle decimal total bet amounts", () => {
            const totalBet = 99.99;

            betControl.renderTotalBet(totalBet);

            expect(gc.FormatUtils.numberWithCommas).toHaveBeenCalledWith(totalBet, 2, true);
        });
    });

    describe("renderStake", () => {
        it("should format and display stake amount", () => {
            const stake = 50;

            betControl.renderStake(stake);

            expect(gc.FormatUtils.numberWithCommas).toHaveBeenCalledWith(stake, 2, true);
            expect(betControl.lblStake.string).toBe("50");
        });

        it("should handle zero stake", () => {
            const stake = 0;

            betControl.renderStake(stake);

            expect(gc.FormatUtils.numberWithCommas).toHaveBeenCalledWith(stake, 2, true);
            expect(betControl.lblStake.string).toBe("0");
        });

        it("should handle decimal stake amounts", () => {
            const stake = 12.5;

            betControl.renderStake(stake);

            expect(gc.FormatUtils.numberWithCommas).toHaveBeenCalledWith(stake, 2, true);
        });

        it("should handle very large stake amounts", () => {
            const stake = 999999;

            betControl.renderStake(stake);

            expect(gc.FormatUtils.numberWithCommas).toHaveBeenCalledWith(stake, 2, true);
            expect(betControl.lblStake.string).toBe("999,999");
        });
    });

    describe("renderTotalWin", () => {
        beforeEach(() => {
            // Setup existing tween
            betControl.tweenFloatNumber = {
                stop: jest.fn(),
            } as any;
        });

        it("should stop existing tween and display zero when totalWin is 0", () => {
            const hideWinEffectSpy = jest.spyOn(betControl as any, "hideWinEffect");
            const totalWin = 0;

            betControl.renderTotalWin(totalWin);

            expect(betControl.tweenFloatNumber.stop).toHaveBeenCalled();
            expect(betControl.lblTotalWin.string).toBe("0");
            expect(hideWinEffectSpy).toHaveBeenCalled();
            expect(AudioUtils.playSFX).not.toHaveBeenCalled();
        });

        it("should play win effect and animate number when totalWin is greater than 0", () => {
            const playWinEffectSpy = jest.spyOn(betControl as any, "playWinEffect");
            const floatToNumber = jest.requireMock("../../../assets/scripts/utils/classic-slot-utils").floatToNumber;
            const originalStopSpy = betControl.tweenFloatNumber.stop;
            const totalWin = 500;

            betControl.renderTotalWin(totalWin);

            expect(originalStopSpy).toHaveBeenCalled();
            expect(AudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.WIN);
            expect(playWinEffectSpy).toHaveBeenCalled();
            expect(floatToNumber).toHaveBeenCalledWith({
                from: 0,
                to: totalWin,
                duration: 0.6,
                progress: expect.any(Function),
            });
            expect(betControl.lblTotalWin.string).toBe("500");
        });

        it("should handle large winning amounts", () => {
            const playWinEffectSpy = jest.spyOn(betControl as any, "playWinEffect");
            const totalWin = 1000000;

            betControl.renderTotalWin(totalWin);

            expect(AudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.WIN);
            expect(playWinEffectSpy).toHaveBeenCalled();
            expect(betControl.lblTotalWin.string).toBe("1,000,000");
        });

        it("should handle when no existing tween", () => {
            betControl.tweenFloatNumber = null;
            const totalWin = 100;

            expect(() => betControl.renderTotalWin(totalWin)).not.toThrow();
            expect(AudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.WIN);
        });
    });

    describe("playWinEffect", () => {
        it("should activate spine effect and play coin animation", () => {
            (betControl as any).playWinEffect();

            expect(betControl.spineEffectWin.node.active).toBe(true);
            expect(betControl.spineEffectWin.setAnimation).toHaveBeenCalledWith(0, "coin", false);
        });
    });

    describe("hideWinEffect", () => {
        it("should deactivate spine effect", () => {
            betControl.spineEffectWin.node.active = true;

            (betControl as any).hideWinEffect();

            expect(betControl.spineEffectWin.node.active).toBe(false);
        });
    });

    describe("onToggleTurbo", () => {
        it("should play click sound and return toggle state", () => {
            betControl.toggleTurbo.isChecked = true;

            const result = betControl.onToggleTurbo();

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it("should return false when toggle is unchecked", () => {
            betControl.toggleTurbo.isChecked = false;

            const result = betControl.onToggleTurbo();

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe("renderToggleTurbo", () => {
        it("should update toggle state when different from current", () => {
            betControl.toggleTurbo.isChecked = false;

            betControl.renderToggleTurbo(true);

            expect(betControl.toggleTurbo.isChecked).toBe(true);
        });

        it("should not update toggle state when same as current", () => {
            betControl.toggleTurbo.isChecked = true;
            const initialState = betControl.toggleTurbo.isChecked;

            betControl.renderToggleTurbo(true);

            expect(betControl.toggleTurbo.isChecked).toBe(initialState);
        });

        it("should handle false state", () => {
            betControl.toggleTurbo.isChecked = true;

            betControl.renderToggleTurbo(false);

            expect(betControl.toggleTurbo.isChecked).toBe(false);
        });
    });

    describe("renderToggleAutoSpin", () => {
        it("should set auto spin toggle state", () => {
            betControl.renderToggleAutoSpin(true);

            expect(betControl.toggleAutoSpin.isChecked).toBe(true);
        });

        it("should handle false state", () => {
            betControl.renderToggleAutoSpin(false);

            expect(betControl.toggleAutoSpin.isChecked).toBe(false);
        });
    });

    describe("onAutoSpinClick", () => {
        it("should play click sound", () => {
            betControl.onAutoSpinClick();

            expect(AudioUtils.playClick).toHaveBeenCalled();
        });
    });

    describe("showStakeSelector", () => {
        it("should return the show parameter", () => {
            const result = betControl.showStakeSelector(true);

            expect(result).toBe(true);
        });

        it("should return false when passed false", () => {
            const result = betControl.showStakeSelector(false);

            expect(result).toBe(false);
        });
    });

    describe("openStakeSelector", () => {
        it("should play click sound and show stake selector", () => {
            const showStakeSelectorSpy = jest.spyOn(betControl, "showStakeSelector");

            betControl.openStakeSelector();

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect(showStakeSelectorSpy).toHaveBeenCalledWith(true);
        });
    });

    describe("closeStakeSelector", () => {
        it("should play click sound and hide stake selector", () => {
            const showStakeSelectorSpy = jest.spyOn(betControl, "showStakeSelector");

            betControl.closeStakeSelector();

            expect(AudioUtils.playClick).toHaveBeenCalled();
            expect(showStakeSelectorSpy).toHaveBeenCalledWith(false);
        });
    });

    describe("renderDisableIncreaseStake", () => {
        it("should disable increase stake button when true", () => {
            betControl.renderDisableIncreaseStake(true);

            expect(betControl.btnIncreaseStake.interactable).toBe(false);
        });

        it("should enable increase stake button when false", () => {
            betControl.renderDisableIncreaseStake(false);

            expect(betControl.btnIncreaseStake.interactable).toBe(true);
        });
    });

    describe("renderDisableDecreaseStake", () => {
        it("should disable decrease stake button when true", () => {
            betControl.renderDisableDecreaseStake(true);

            expect(betControl.btnDecreaseStake.interactable).toBe(false);
        });

        it("should enable decrease stake button when false", () => {
            betControl.renderDisableDecreaseStake(false);

            expect(betControl.btnDecreaseStake.interactable).toBe(true);
        });
    });

    describe("onIncreaseStake", () => {
        it("should play click sound", () => {
            betControl.onIncreaseStake();

            expect(AudioUtils.playClick).toHaveBeenCalled();
        });
    });

    describe("onDecreaseStake", () => {
        it("should play click sound", () => {
            betControl.onDecreaseStake();

            expect(AudioUtils.playClick).toHaveBeenCalled();
        });
    });

    describe("showLineSelection", () => {
        it("should play click sound", () => {
            betControl.showLineSelection();

            expect(AudioUtils.playClick).toHaveBeenCalled();
        });
    });

    describe("integration", () => {
        it("should properly initialize with all dependencies", () => {
            expect(betControl).toBeDefined();
            expect(betControl.lblStake).toBeDefined();
            expect(betControl.lblTotalBet).toBeDefined();
            expect(betControl.lblTotalWin).toBeDefined();
            expect(betControl.spineEffectWin).toBeDefined();
            expect(betControl.toggleAutoSpin).toBeDefined();
            expect(betControl.toggleTurbo).toBeDefined();
            expect(betControl.btnIncreaseStake).toBeDefined();
            expect(betControl.btnDecreaseStake).toBeDefined();
        });

        it("should handle multiple render calls", () => {
            betControl.renderTotalBet(100);
            betControl.renderStake(10);
            betControl.renderToggleTurbo(true);
            betControl.renderToggleAutoSpin(false);

            expect(betControl.lblTotalBet.string).toBe("100");
            expect(betControl.lblStake.string).toBe("10");
            expect(betControl.toggleTurbo.isChecked).toBe(true);
            expect(betControl.toggleAutoSpin.isChecked).toBe(false);
        });

        it("should handle win effect sequence", () => {
            const hideWinEffectSpy = jest.spyOn(betControl as any, "hideWinEffect");
            const playWinEffectSpy = jest.spyOn(betControl as any, "playWinEffect");

            // Start with no win
            betControl.renderTotalWin(0);
            expect(hideWinEffectSpy).toHaveBeenCalled();
            expect(betControl.lblTotalWin.string).toBe("0");

            // Reset mocks
            jest.clearAllMocks();

            // Win some amount
            betControl.renderTotalWin(1000);
            expect(playWinEffectSpy).toHaveBeenCalled();
            expect(AudioUtils.playSFX).toHaveBeenCalledWith(AudioIds.WIN);
            expect(betControl.lblTotalWin.string).toBe("1,000");
        });
    });
});
