import "reflect-metadata";
//rest
import { EventTouch, Input, KeyCode, Node, PolygonCollider2D, Vec2 } from "cc";
import { Container } from "inversify";

// Mock game client base
jest.mock("@sg/game-client-base", () => ({
    FormatUtils: {
        numberWithCommas: jest.fn((num: number) => num.toLocaleString()),
    },
    Bet: {
        BetStore: class MockBetStore {},
        BetHandler: class MockBetHandler {},
    },
    Connection: {
        ConnectionHandlers: {
            RetryGameHandler: class MockRetryGameHandler {},
        },
    },
    Error: {
        ErrorHandlers: class MockErrorHandlers {},
    },
    Rounds: {
        RoundTimeStore: class MockRoundTimeStore {},
        RoundStore: class MockRoundStore {},
    },
    GameConfigs: {
        GameConfigStore: class MockGameConfigStore {},
    },
    Bonuses: {
        BonusStore: class MockBonusStore {},
    },
    JackpotPools: {
        JackpotPoolStore: class MockJackpotPoolStore {},
    },
    Leaderboard: {
        LeaderboardStore: class MockLeaderboardStore {},
    },
    Settings: {
        SettingsStore: class MockSettingsStore {},
        GameUserSettingHandler: class MockGameUserSettingHandler {},
    },
    Player: {
        MainPlayerStore: class MockMainPlayerStore {},
    },
    Audios: {
        AudioHandler: class MockAudioHandler {},
    },
    GameUserSettings: {
        GameUserSettingHandler: class MockGameUserSettingHandler {},
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
}));

// Mock AudioIds
jest.mock("db://assets/game/audios/AudioIds", () => ({
    AudioIds: {
        SPIN_BUTTON: "spin_button",
        CLICK: "click",
    },
}));

// Mock AudioUtils
jest.mock("db://shared-components/game/audios/utils", () => ({
    AudioUtils: {
        playSFX: jest.fn(),
        playClick: jest.fn(),
    },
}));

// Mock AnimationUtils
jest.mock("db://shared-components/shared/utils/utils", () => ({
    AnimationUtils: {
        playSpine: jest.fn(),
    },
}));

// Mock definitions (SlotState)
jest.mock("../../../assets/scripts/definitions", () => ({
    SlotState: {
        READY: "ready",
        SPINNING: "spinning",
        SETTLING: "settling",
        BET: "bet",
    },
    SlotNotification: {},
    SLOT_BET_CHOICES: [],
}));

// Mock BetControlStore
jest.mock("../../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: class MockBetControlStore {
        turboEnabled = false;
        triggerAutoSpin = false;
        stake = 100;
    },
}));

// Mock SlotBetHandler
jest.mock("../../../assets/scripts/handlers/handlers/slot-bet-handlers", () => ({
    SlotBetHandler: class MockSlotBetHandler {
        callTriggerAction = jest.fn();
        clearTriggerAction = jest.fn();
    },
}));

// Mock SlotBoardStore
jest.mock("../../../assets/scripts/handlers/stores/slot-board-store", () => ({
    SlotBoardStore: class MockSlotBoardStore {
        slotState = "ready";
        isReadyBet = true;
    },
}));

// Mock handlers index
jest.mock("../../../assets/scripts/handlers", () => ({
    BetControlStore: class MockBetControlStore {
        turboEnabled = false;
        triggerAutoSpin = false;
        stake = 100;
    },
    SlotBetHandler: class MockSlotBetHandler {
        callTriggerAction = jest.fn();
        clearTriggerAction = jest.fn();
    },
}));

// Mock ObserverComponent
jest.mock("db://shared-components/shared/common-components/observer-component/scripts/observer-component", () => ({
    ObserverComponent: class MockObserverComponent {
        onLoad() {}
        onDestroy() {}
        node = new Node();
    },
}));

// Mock FSB Promotion dependencies - not available in current codebase
jest.mock("db://shared-common-slot/fsb-promotion/scripts/handlers/fsb-promotion-ui-handler", () => ({
    FSBPromotionUIHandler: class MockFSBPromotionUIHandler {
        triggerFSBManual = jest.fn();
    },
}));

// Mock CustomButton
jest.mock("db://shared-components/shared/common-components/button/custom-button", () => ({
    CustomButton: class MockCustomButton {
        node = new Node();
        interactable = true;
    },
    StateChangedEvent: "state-changed",
}));

// Mock ButtonState
jest.mock("db://shared-components/shared/common-components/button/button-state", () => ({
    ButtonState: {
        HOVER: "hover",
        NORMAL: "normal",
    },
}));

// Mock cc module missing components
jest.mock("cc", () => ({
    ...jest.requireActual("cc"),
    Intersection2D: {
        pointInPolygon: jest.fn()
    },
    math: {
        v2: jest.fn()
    },
    input: {
        on: jest.fn(),
        off: jest.fn()
    },
    game: {
        canvas: {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            focus: jest.fn()
        }
    },
    Input: {
        EventType: {
            KEY_DOWN: "keydown",
            KEY_UP: "keyup"
        }
    },
    Node: class MockNode {
        static EventType = {
            TOUCH_START: "touch-start",
            TOUCH_MOVE: "touch-move", 
            TOUCH_CANCEL: "touch-cancel",
            TOUCH_END: "touch-end"
        };
        on = jest.fn();
        off = jest.fn();
    },
    KeyCode: {
        ENTER: 13,
        NONE: 0
    },
    EventTouch: class MockEventTouch {},
    PolygonCollider2D: class MockPolygonCollider2D {},
    Vec2: class MockVec2 {}
}));

// Import after mocking
import { ButtonState } from "db://shared-components/shared/common-components/button/button-state";
import { CustomButton, StateChangedEvent } from "db://shared-components/shared/common-components/button/custom-button";
import { AnimationUtils } from "db://shared-components/shared/utils/utils";
import SpinButton from "../../../assets/scripts/components/bet-control/spin-button";
import { SlotState } from "../../../assets/scripts/definitions";

describe("SpinButton", () => {
    let container: Container;
    let spinButton: SpinButton;
    let mockSpine: any;
    let mockPolygonCollider: jest.Mocked<PolygonCollider2D>;
    let mockCustomButton: jest.Mocked<CustomButton>;

    beforeEach(() => {
        jest.clearAllMocks();

        container = new Container();

        // Create SpinButton instance
        spinButton = new SpinButton();

        // Create mock components
        mockSpine = {
            timeScale: 1,
            setAnimation: jest.fn(),
            clearAnimation: jest.fn(),
        };

        mockPolygonCollider = {
            worldPoints: [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100, y: 100 },
                { x: 0, y: 100 },
            ],
        } as any;

        mockCustomButton = {
            node: new Node(),
            interactable: true,
        } as any;

        // Initialize UI components
        spinButton.spine = mockSpine;
        spinButton.polygonCollider2D = mockPolygonCollider;

        // Add getComponent method before spying on it
        spinButton.getComponent = jest.fn();

        // Mock getComponent to return our mock button
        jest.spyOn(spinButton, "getComponent").mockReturnValue(mockCustomButton);

        // Mock node methods
        jest.spyOn(spinButton.node, "on").mockImplementation(() => {});
        jest.spyOn(spinButton.node, "off").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("Animation Methods", () => {
        describe("playAnimationSpin", () => {
            it("should play spin animation with normal time scale", () => {
                spinButton.playAnimationSpin();

                expect(AnimationUtils.playSpine).toHaveBeenCalledWith(mockSpine, "spin", true);
                expect(mockSpine.timeScale).toBe(1);
            });
        });

        describe("playAnimationIdle", () => {
            it("should play idle animation with normal time scale", () => {
                spinButton.playAnimationIdle();

                expect(AnimationUtils.playSpine).toHaveBeenCalledWith(mockSpine, "idle", true);
                expect(mockSpine.timeScale).toBe(1);
            });
        });

        describe("playAnimationSpinTurbo", () => {
            it("should play spin animation with double time scale", () => {
                spinButton.playAnimationSpinTurbo();

                expect(AnimationUtils.playSpine).toHaveBeenCalledWith(mockSpine, "spin", true);
                expect(mockSpine.timeScale).toBe(2);
            });
        });

        describe("playAnimationSpinExtra", () => {
            it("should set spin-extra animation on EXTRA track", () => {
                spinButton.playAnimationSpinExtra();

                expect(mockSpine.setAnimation).toHaveBeenCalledWith(2, "spin-extra", true); // SpineAnimationTrack.EXTRA = 2
            });
        });

        describe("stopAnimationSpinExtra", () => {
            it("should clear animation on EXTRA track", () => {
                spinButton.stopAnimationSpinExtra();

                expect(mockSpine.clearAnimation).toHaveBeenCalledWith(2); // SpineAnimationTrack.EXTRA = 2
            });
        });

        describe("changeAnimationSpinning", () => {
            beforeEach(() => {
                // Make protected properties accessible for testing
                (spinButton as any).isSpinning = true;
            });

            it("should play turbo animation when turbo is enabled", () => {
                (spinButton as any).isTurbo = true;
                const playTurboSpy = jest.spyOn(spinButton, "playAnimationSpinTurbo");

                spinButton.changeAnimationSpinning();

                expect(playTurboSpy).toHaveBeenCalled();
            });

            it("should play normal spin animation when turbo is disabled", () => {
                (spinButton as any).isTurbo = false;
                const playSpinSpy = jest.spyOn(spinButton, "playAnimationSpin");

                spinButton.changeAnimationSpinning();

                expect(playSpinSpy).toHaveBeenCalled();
            });

            it("should not change animation when not spinning", () => {
                (spinButton as any).isSpinning = false;
                const playTurboSpy = jest.spyOn(spinButton, "playAnimationSpinTurbo");
                const playSpinSpy = jest.spyOn(spinButton, "playAnimationSpin");

                spinButton.changeAnimationSpinning();

                expect(playTurboSpy).not.toHaveBeenCalled();
                expect(playSpinSpy).not.toHaveBeenCalled();
            });
        });
    });

    describe("Button State Management", () => {
        describe("onButtonStateChanged", () => {
            it("should play hover animation when button state is HOVER", () => {
                spinButton.onButtonStateChanged(ButtonState.HOVER);

                expect(mockSpine.setAnimation).toHaveBeenCalledWith(1, "hover", true); // SpineAnimationTrack.HOVER = 1
            });

            it("should clear hover animation when button state is not HOVER", () => {
                spinButton.onButtonStateChanged(ButtonState.NORMAL);

                expect(mockSpine.clearAnimation).toHaveBeenCalledWith(1); // SpineAnimationTrack.HOVER = 1
            });
        });
    });

    describe("Touch Events", () => {
        let mockEvent: jest.Mocked<EventTouch>;

        beforeEach(() => {
            mockEvent = {
                getUILocation: jest.fn().mockReturnValue({ x: 50, y: 50 } as Vec2),
            } as any;
        });

        describe("touchInPolygon", () => {
            it("should return true when touch is inside polygon", () => {
                const { Intersection2D, math } = require("cc");
                Intersection2D.pointInPolygon.mockReturnValue(true);

                const result = (spinButton as any).touchInPolygon(mockEvent);

                expect(mockEvent.getUILocation).toHaveBeenCalled();
                expect(math.v2).toHaveBeenCalledWith(50, 50);
                expect(Intersection2D.pointInPolygon).toHaveBeenCalled();
                expect(result).toBe(true);
            });

            it("should return false when touch is outside polygon", () => {
                const { Intersection2D, math } = require("cc");
                Intersection2D.pointInPolygon.mockReturnValue(false);
                mockEvent.getUILocation.mockReturnValue({ x: 200, y: 200 } as Vec2);

                const result = (spinButton as any).touchInPolygon(mockEvent);

                expect(mockEvent.getUILocation).toHaveBeenCalled();
                expect(math.v2).toHaveBeenCalledWith(200, 200);
                expect(Intersection2D.pointInPolygon).toHaveBeenCalled();
                expect(result).toBe(false);
            });
        });

        describe("onTouchStart", () => {
            it("should call trigger action when touch is inside polygon", () => {
                jest.spyOn(spinButton as any, "touchInPolygon").mockReturnValue(true);
                // Mock the actual method call without testing @handle decorator
                const callTriggerSpy = jest.fn();
                (spinButton as any).callTriggerAction = callTriggerSpy;

                (spinButton as any).onTouchStart(mockEvent);

                expect(callTriggerSpy).toHaveBeenCalled();
            });

            it("should not call trigger action when touch is outside polygon", () => {
                jest.spyOn(spinButton as any, "touchInPolygon").mockReturnValue(false);
                // Mock the actual method call without testing @handle decorator
                const callTriggerSpy = jest.fn();
                (spinButton as any).callTriggerAction = callTriggerSpy;

                (spinButton as any).onTouchStart(mockEvent);

                expect(callTriggerSpy).not.toHaveBeenCalled();
            });
        });

        describe("handleTouchMove", () => {
            it("should clear trigger action when touch moves outside polygon", () => {
                jest.spyOn(spinButton as any, "touchInPolygon").mockReturnValue(false);
                // Mock the actual method call without testing @handle decorator
                const clearTriggerSpy = jest.fn();
                (spinButton as any).clearTriggerAction = clearTriggerSpy;

                (spinButton as any).handleTouchMove(mockEvent);

                expect(clearTriggerSpy).toHaveBeenCalled();
            });

            it("should not clear trigger action when touch stays inside polygon", () => {
                jest.spyOn(spinButton as any, "touchInPolygon").mockReturnValue(true);
                // Mock the actual method call without testing @handle decorator
                const clearTriggerSpy = jest.fn();
                (spinButton as any).clearTriggerAction = clearTriggerSpy;

                (spinButton as any).handleTouchMove(mockEvent);

                expect(clearTriggerSpy).not.toHaveBeenCalled();
            });
        });

        describe("onTouchEnd", () => {
            it("should clear trigger action on touch end", () => {
                // Mock the actual method call without testing @handle decorator
                const clearTriggerSpy = jest.fn();
                (spinButton as any).clearTriggerAction = clearTriggerSpy;

                (spinButton as any).onTouchEnd();

                expect(clearTriggerSpy).toHaveBeenCalled();
            });
        });
    });

    describe("Keyboard Events", () => {
        describe("onKeyDown", () => {
            it("should call trigger action when ENTER key is pressed", () => {
                // Mock the actual method call without testing @handle decorator
                const callTriggerSpy = jest.fn();
                (spinButton as any).callTriggerAction = callTriggerSpy;
                const event = { keyCode: KeyCode.ENTER };

                (spinButton as any).onKeyDown(event);

                expect(callTriggerSpy).toHaveBeenCalled();
            });

            it("should not call trigger action for other keys", () => {
                // Mock the actual method call without testing @handle decorator
                const callTriggerSpy = jest.fn();
                (spinButton as any).callTriggerAction = callTriggerSpy;
                const event = { keyCode: KeyCode.NONE };

                (spinButton as any).onKeyDown(event);

                expect(callTriggerSpy).not.toHaveBeenCalled();
            });
        });

        describe("onKeyUp", () => {
            it("should clear trigger action when ENTER key is released", () => {
                // Mock the actual method call without testing @handle decorator
                const clearTriggerSpy = jest.fn();
                (spinButton as any).clearTriggerAction = clearTriggerSpy;
                const event = { keyCode: KeyCode.ENTER };

                (spinButton as any).onKeyUp(event);

                expect(clearTriggerSpy).toHaveBeenCalled();
            });

            it("should not clear trigger action for other keys", () => {
                // Mock the actual method call without testing @handle decorator
                const clearTriggerSpy = jest.fn();
                (spinButton as any).clearTriggerAction = clearTriggerSpy;
                const event = { keyCode: KeyCode.NONE };

                (spinButton as any).onKeyUp(event);

                expect(clearTriggerSpy).not.toHaveBeenCalled();
            });
        });
    });

    describe("Event Registration", () => {
        describe("addEvent", () => {
            it("should register keyboard event listeners", () => {
                const { input } = require("cc");

                //@ts-ignore
                spinButton.addEvent();

                expect(input.on).toHaveBeenCalledWith(Input.EventType.KEY_DOWN, (spinButton as any).onKeyDown, spinButton);
                expect(input.on).toHaveBeenCalledWith(Input.EventType.KEY_UP, (spinButton as any).onKeyUp, spinButton);
            });
        });

        describe("removeEvent", () => {
            it("should remove keyboard event listeners", () => {
                const { input } = require("cc");

                (spinButton as any).removeEvent();

                expect(input.off).toHaveBeenCalledWith(Input.EventType.KEY_DOWN, (spinButton as any).onKeyDown, spinButton);
                expect(input.off).toHaveBeenCalledWith(Input.EventType.KEY_UP, (spinButton as any).onKeyUp, spinButton);
            });
        });

        describe("registerTouchEvents", () => {
            it("should register touch event listeners", () => {
                const { game } = require("cc");

                (spinButton as any).registerTouchEvents();

                expect(spinButton.node.on).toHaveBeenCalledWith(Node.EventType.TOUCH_START, (spinButton as any).onTouchStart, spinButton);
                expect(spinButton.node.on).toHaveBeenCalledWith(Node.EventType.TOUCH_MOVE, (spinButton as any).handleTouchMove, spinButton);
                expect(spinButton.node.on).toHaveBeenCalledWith(Node.EventType.TOUCH_CANCEL, (spinButton as any).onTouchEnd, spinButton);
                expect(spinButton.node.on).toHaveBeenCalledWith(Node.EventType.TOUCH_END, (spinButton as any).onTouchEnd, spinButton);
                expect(game.canvas.addEventListener).toHaveBeenCalledWith("blur", spinButton.onBlur);
            });
        });
    });

    describe("Component Lifecycle", () => {
        describe("onLoad", () => {
            it("should initialize component properly", () => {
                const addEventSpy = jest.spyOn(spinButton as any, "addEvent").mockImplementation(() => {});
                const registerTouchSpy = jest.spyOn(spinButton as any, "registerTouchEvents").mockImplementation(() => {});

                // Add node property and super.onLoad method
                spinButton.node = new Node();
                jest.spyOn(spinButton.node, "on").mockImplementation(() => {});

                // Mock super.onLoad
                const originalProto = Object.getPrototypeOf(Object.getPrototypeOf(spinButton));
                const superOnLoadSpy = jest.spyOn(originalProto, "onLoad").mockImplementation(() => {});

                spinButton.onLoad();

                expect(addEventSpy).toHaveBeenCalled();
                expect(registerTouchSpy).toHaveBeenCalled();
                expect(mockCustomButton.node.on).toHaveBeenCalledWith(StateChangedEvent, spinButton.onButtonStateChanged, spinButton);

                superOnLoadSpy.mockRestore();
            });
        });

        describe("onDestroy", () => {
            it("should clean up event listeners", () => {
                const { game } = require("cc");

                // Mock super.onDestroy
                const originalProto = Object.getPrototypeOf(Object.getPrototypeOf(spinButton));
                const superOnDestroySpy = jest.spyOn(originalProto, "onDestroy").mockImplementation(() => {});

                spinButton.onDestroy();

                expect(game.canvas.removeEventListener).toHaveBeenCalledWith("blur", spinButton.onBlur);
                expect(superOnDestroySpy).toHaveBeenCalled();

                superOnDestroySpy.mockRestore();
            });
        });

        describe("onBlur", () => {
            it("should clear trigger action when window loses focus", () => {
                // Mock the actual method call without testing @handle decorator
                const clearTriggerSpy = jest.fn();
                (spinButton as any).clearTriggerAction = clearTriggerSpy;

                spinButton.onBlur();

                expect(clearTriggerSpy).toHaveBeenCalled();
            });
        });
    });

    describe("Render Methods (Pure Logic - Ignore @render decorators)", () => {
        describe("renderTurboEnabled", () => {
            it("should set isTurbo to true when turbo is enabled", () => {
                spinButton.renderTurboEnabled(true);

                expect((spinButton as any).isTurbo).toBe(true);
            });

            it("should set isTurbo to false when turbo is disabled", () => {
                spinButton.renderTurboEnabled(false);

                expect((spinButton as any).isTurbo).toBe(false);
            });
        });

        describe("renderSpinButtonState", () => {
            it("should handle spinning state correctly", () => {
                const playExtraSpy = jest.spyOn(spinButton, "playAnimationSpinExtra");
                const changeAnimationSpy = jest.spyOn(spinButton, "changeAnimationSpinning");

                // Import SlotState to test the pure method logic
                spinButton.renderSpinButtonState(SlotState.SPINNING);

                expect((spinButton as any).isSpinning).toBe(true);
                expect(playExtraSpy).toHaveBeenCalled();
                expect(changeAnimationSpy).toHaveBeenCalled();
            });

            it("should handle non-spinning state correctly", () => {
                const stopExtraSpy = jest.spyOn(spinButton, "stopAnimationSpinExtra");
                const playIdleSpy = jest.spyOn(spinButton, "playAnimationIdle");

                // Import SlotState to test the pure method logic
                spinButton.renderSpinButtonState(SlotState.READY);

                expect((spinButton as any).isSpinning).toBe(false);
                expect(stopExtraSpy).toHaveBeenCalled();
                expect(playIdleSpy).toHaveBeenCalled();
            });
        });

        describe("renderCascadingState", () => {
            beforeEach(() => {
                jest.useFakeTimers();
                (spinButton as any).button = mockCustomButton;
            });

            afterEach(() => {
                jest.useRealTimers();
            });

            it("should enable button interaction when ready to bet", () => {
                spinButton.renderDisableSpinButton(false);

                jest.advanceTimersByTime(100);

                expect(mockCustomButton.interactable).toBe(true);
            });

            it("should disable button interaction when not ready to bet", () => {
                spinButton.renderDisableSpinButton(true);

                jest.advanceTimersByTime(100);

                expect(mockCustomButton.interactable).toBe(false);
            });

            it("should handle errors gracefully", () => {
                // Mock button to throw error
                Object.defineProperty(mockCustomButton, "interactable", {
                    set: jest.fn(() => {
                        throw new Error("Test error");
                    }),
                    configurable: true,
                });

                expect(() => {
                    spinButton.renderDisableSpinButton(true);
                    jest.advanceTimersByTime(100);
                }).not.toThrow();
            });
        });
    });

    describe("Handler Methods (Pure Logic - Ignore @handle decorators)", () => {
        describe("callTriggerAction", () => {
            it("should execute without errors (ignore @handle decorator logic)", () => {
                // Test the method exists and can be called
                expect(() => spinButton.callTriggerAction()).not.toThrow();
            });
        });

        describe("clearTriggerAction", () => {
            it("should execute without errors (ignore @handle decorator logic)", () => {
                // Test the method exists and can be called
                expect(() => spinButton.clearTriggerAction()).not.toThrow();
            });
        });
    });
});
