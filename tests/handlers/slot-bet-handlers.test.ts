// should be the first import
import "reflect-metadata";
// rest
import gc from "@sg/game-client-base";
import { Container } from "inversify";
import { SLOT_BET_CHOICES, SLOT_LINES, SlotNotification, SlotState } from "../../assets/scripts/definitions";
import { SlotBetHandler } from "../../assets/scripts/handlers/handlers/slot-bet-handlers";
import { BetControlStore } from "../../assets/scripts/handlers/stores/bet-control-store";
import { SlotBoardStore } from "../../assets/scripts/handlers/stores/slot-board-store";

// Mock the parent class methods (external dependency)
jest.mock("@sg/game-client-base", () => ({
    ...jest.requireActual("@sg/game-client-base"),
    Bet: {
        ...jest.requireActual("@sg/game-client-base").Bet,
        BetHandler: jest.fn().mockImplementation(() => ({
            createBetData: jest.fn().mockReturnValue({}),
            handleBetData: jest.fn(),
            showWarningProcessingBet: jest.fn(),
            showNoticePlaceBetFailure: jest.fn(),
            openAutoSpinDialog: jest.fn(),
            cancelAutoSpin: jest.fn(),
        })),
    },
}));

// Mock SlotBetHandler
const actualSlotBetHandler = jest.requireActual("../../assets/scripts/handlers/handlers/slot-bet-handlers").SlotBetHandler;

jest.mock("../../assets/scripts/handlers/handlers/slot-bet-handlers", () => {
    return {
        SlotBetHandler: jest.fn().mockImplementation(function () {
            const instance = {
                // Keep all real implementations from the actual SlotBetHandler
                handle: actualSlotBetHandler.prototype.handle,
                callBet: actualSlotBetHandler.prototype.callBet,
                callTriggerAction: actualSlotBetHandler.prototype.callTriggerAction,
                clearTriggerAction: actualSlotBetHandler.prototype.clearTriggerAction,
                isValidBet: actualSlotBetHandler.prototype.isValidBet,
                confirmAutoSpin: actualSlotBetHandler.prototype.confirmAutoSpin,
                actionAutoSpin: actualSlotBetHandler.prototype.actionAutoSpin,
                handleClickAutoSpin: actualSlotBetHandler.prototype.handleClickAutoSpin,
                handlePlaceBetFailed: actualSlotBetHandler.prototype.handlePlaceBetFailed,
                // Only mock methods that are from parent class or external
                resetOnNewSpin: jest.fn(),
                openAutoSpinDialog: jest.fn(),
                showLineSelection: jest.fn(),
                showWarningProcessingBet: jest.fn(),
                showNoticePlaceBetFailure: jest.fn(),
                handleBetData: jest.fn(),
                createBetData: jest.fn().mockReturnValue({}),
                cancelAutoSpin: jest.fn(),
                // Add necessary store references and bind them to the instance
                betStore: null, // Will be set in beforeEach
                betControlStore: null,
                slotBoardStore: null,
            };

            // Bind all methods to the instance to preserve 'this' context
            Object.getOwnPropertyNames(actualSlotBetHandler.prototype).forEach((key) => {
                if (typeof instance[key] === "function") {
                    instance[key] = instance[key].bind(instance);
                }
            });

            return instance;
        }),
    };
});

// Mock BetControlStore (external dependency)
jest.mock("../../assets/scripts/handlers/stores/bet-control-store", () => {
    return {
        BetControlStore: jest.fn().mockImplementation(() => ({
            betLevels: [],
            stake: 0,
            roundId: -1,
            get totalBet() {
                return this.stake * SLOT_LINES;
            },
            interactableBet: true,
            stakeSelectorShow: false,
            stakeSelectorDisabled: false,
            showLineSelection: null,
            triggerAutoSpin: false,
            autoSpinCount: 0,
            autoSpinEnabled: false,
            autoSpinDialogOpenEvent: null,
            autoSpinSelectedValue: 10,
            autoSpinOptions: [10, 30, 50, 80, 100, 200, 500, 1000],
            freeSpinCount: -1,
            freeSpinCountDisplay: -1,
            turboEnabled: false,
            get freeSpinEnabled() {
                return this.freeSpinCount > 0;
            },
            setStake: jest.fn(),
            quickChangeStake: jest.fn(),
            setStakeSelectorShow: jest.fn(),
            setBetLevels: jest.fn(),
            setTotalFreeSpins: jest.fn(),
            acceptAutoSpinValue: jest.fn(),
            decreaseAutoSpinCount: jest.fn(),
            clearFreeSpins: jest.fn(),
        })),
    };
});

// Mock SlotBoardStore (external dependency)
jest.mock("../../assets/scripts/handlers/stores/slot-board-store", () => {
    return {
        SlotBoardStore: jest.fn().mockImplementation(() => ({
            slotState: SlotState.NOT_READY,
            bottomMessageState: SlotNotification.READY,
            spinResult: { result: [], duration: 0, turbo: false },
            receivedBonus: null,
            receivedJackpot: null,
            receivedFreeSpins: null,
            receivedBigWin: null,
            winningJackpot: null,
            bonusChest: null,
            winningItemsOnLines: [],
            winningLines: [],
            highlightSpecialSymbols: [],
            forceStopSettle: null,
            winningBet: 0,
            get isReadyBet() {
                return this.slotState === SlotState.READY || this.slotState === SlotState.SETTLED;
            },
            reset() {
                this.receivedBonus = null;
                this.receivedJackpot = null;
                this.receivedFreeSpins = null;
                this.receivedBigWin = null;
                this.highlightSpecialSymbols = [];
                this.winningJackpot = null;
                this.bonusChest = null;
                this.slotState = SlotState.READY;
            },
            resetOnNewSpin() {
                this.winningItemsOnLines = [];
                this.winningLines = [];
            },
        })),
    };
});

describe("SlotBetHandler", () => {
    let container: Container;
    let slotBetHandler: SlotBetHandler;
    let betControlStore: BetControlStore;
    let slotBoardStore: SlotBoardStore;
    let mockBetStore: jest.Mocked<gc.Bet.BetStore>;
    let mockBalance: number;

    beforeEach(() => {
        container = new Container();

        mockBalance = 1000;
        // Create mock BetStore
        mockBetStore = {
            isProcessingBet: false,
            get availableBalance() {
                return mockBalance;
            },
            set availableBalance(value: number) {
                mockBalance = value;
            },
        } as any;

        // Create mock dependencies for SlotBoardStore
        const mockRoundTimeStore = {} as gc.Rounds.RoundTimeStore;
        const mockRoundStore = {} as gc.Rounds.RoundStore;
        const mockGameConfigStore = {} as gc.GameConfigs.GameConfigStore;
        const mockMainPlayerStore = {} as gc.Player.MainPlayerStore;
        const mockGameUserSettingHandler = {} as gc.GameUserSettings.GameUserSettingHandler;

        // Bind mock dependencies
        container.bind(gc.Rounds.RoundTimeStore).toConstantValue(mockRoundTimeStore);
        container.bind(gc.Rounds.RoundStore).toConstantValue(mockRoundStore);
        container.bind(gc.GameConfigs.GameConfigStore).toConstantValue(mockGameConfigStore);
        container.bind(gc.Player.MainPlayerStore).toConstantValue(mockMainPlayerStore);
        container.bind(gc.GameUserSettings.GameUserSettingHandler).toConstantValue(mockGameUserSettingHandler);

        container.bind(SlotBetHandler).toSelf();
        container.bind(BetControlStore).toSelf();
        container.bind(SlotBoardStore).toSelf();
        container.bind(gc.Bet.BetStore).toConstantValue(mockBetStore);

        slotBetHandler = container.get(SlotBetHandler);
        betControlStore = container.get(BetControlStore);
        slotBoardStore = container.get(SlotBoardStore);

        // Assign store references to handler and ensure betStore is the same instance
        Object.assign(slotBetHandler, {
            betControlStore,
            slotBoardStore,
            betStore: mockBetStore, // Use the same mockBetStore instance
        });

        // Mock necessary methods and properties
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks();
    });

    describe("handle", () => {
        it("should call callBet method", () => {
            const callBetSpy = jest.spyOn(slotBetHandler, "callBet");
            slotBetHandler.handle();
            expect(callBetSpy).toHaveBeenCalled();
        });
    });

    describe("callBet", () => {
        it("should not proceed if board is not ready for bet", () => {
            slotBoardStore.slotState = SlotState.NOT_READY;
            const handleBetDataSpy = jest.spyOn(slotBetHandler, "handleBetData");

            slotBetHandler.callBet();

            expect(handleBetDataSpy).not.toHaveBeenCalled();
        });

        it("should set correct states and call handleBetData when board is ready", () => {
            slotBoardStore.slotState = SlotState.READY;
            betControlStore.stake = 100;
            const handleBetDataSpy = jest.spyOn(slotBetHandler, "handleBetData");

            slotBetHandler.callBet();

            expect(slotBoardStore.slotState).toBe(SlotState.BET);
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SPINNING);
            expect(handleBetDataSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 100,
                    betChoice: SLOT_BET_CHOICES,
                })
            );
        });
    });

    describe("callTriggerAction", () => {
        it("should call bet and set trigger after threshold when auto spin is not enabled", () => {
            betControlStore.triggerAutoSpin = false;
            const callBetSpy = jest.spyOn(slotBetHandler, "callBet");

            slotBetHandler.callTriggerAction();

            expect(callBetSpy).toHaveBeenCalled();
            expect(betControlStore.triggerAutoSpin).toBe(false);

            jest.advanceTimersByTime(1000);
            expect(betControlStore.triggerAutoSpin).toBe(true);
        });

        it("should not call bet when auto spin is already enabled", () => {
            betControlStore.triggerAutoSpin = true;
            const callBetSpy = jest.spyOn(slotBetHandler, "callBet");

            slotBetHandler.callTriggerAction();

            expect(callBetSpy).not.toHaveBeenCalled();
        });
    });

    describe("clearTriggerAction", () => {
        it("should clear auto spin trigger and timeout", () => {
            betControlStore.triggerAutoSpin = true;
            slotBetHandler.callTriggerAction();

            slotBetHandler.clearTriggerAction();

            expect(betControlStore.triggerAutoSpin).toBe(false);
        });
    });

    describe("isValidBet", () => {
        it("should return false when bet is processing", () => {
            mockBetStore.isProcessingBet = true;
            const showWarningSpy = jest.spyOn(slotBetHandler, "showWarningProcessingBet");

            const result = slotBetHandler.isValidBet(100);

            expect(result).toBe(false);
            expect(showWarningSpy).toHaveBeenCalled();
        });

        it("should return false when total bet exceeds available balance", () => {
            mockBetStore.isProcessingBet = false;
            mockBalance = 50;
            betControlStore.stake = 20; // This will make totalBet = stake * SLOT_LINES
            betControlStore.freeSpinCount = -1; // This will make freeSpinEnabled = false

            const result = slotBetHandler.isValidBet(100);

            expect(result).toBe(false);
        });

        it("should return true for valid bet conditions", () => {
            mockBetStore.isProcessingBet = false;
            mockBalance = 200;
            betControlStore.stake = 1; // This will make totalBet = stake * SLOT_LINES
            betControlStore.freeSpinCount = -1; // This will make freeSpinEnabled = false

            const result = slotBetHandler.isValidBet(100);

            expect(result).toBe(true);
        });
    });

    describe("auto spin functionality", () => {
        it("should confirm auto spin and start after delay", () => {
            const actionAutoSpinSpy = jest.spyOn(slotBetHandler, "actionAutoSpin");

            slotBetHandler.confirmAutoSpin(5);

            expect(betControlStore.acceptAutoSpinValue).toHaveBeenCalledWith(5);
            jest.advanceTimersByTime(300);
            expect(actionAutoSpinSpy).toHaveBeenCalled();
        });

        it("should handle auto spin action correctly", () => {
            jest.spyOn(betControlStore, "decreaseAutoSpinCount").mockReturnValue(true);
            const callBetSpy = jest.spyOn(slotBetHandler, "callBet");

            slotBetHandler.actionAutoSpin();

            expect(callBetSpy).toHaveBeenCalled();
        });

        it("should cancel auto spin when count reaches zero", () => {
            jest.spyOn(betControlStore, "decreaseAutoSpinCount").mockReturnValue(false);
            const cancelAutoSpinSpy = jest.spyOn(slotBetHandler, "cancelAutoSpin");
            const openDialogSpy = jest.spyOn(slotBetHandler, "openAutoSpinDialog");

            slotBetHandler.actionAutoSpin();

            expect(cancelAutoSpinSpy).toHaveBeenCalled();
            expect(openDialogSpy).toHaveBeenCalled();
        });
    });
});
