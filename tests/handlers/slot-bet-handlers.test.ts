import gc from "@sg/game-client-base";
import { Container } from "inversify";
import "reflect-metadata";
import { SLOT_BET_CHOICES, SlotNotification, SlotState } from "../../assets/scripts/definitions";
import { SlotBetHandler } from "../../assets/scripts/handlers/handlers/slot-bet-handlers";
import { BetControlStore } from "../../assets/scripts/handlers/stores/bet-control-store";
import { SlotBoardStore } from "../../assets/scripts/handlers/stores/slot-board-store";

// Mock BetControlStore
jest.mock("../../assets/scripts/handlers/stores/bet-control-store", () => ({
    BetControlStore: jest.fn().mockImplementation(function (this: any) {
        this.stake = 100;
        this._totalBet = 2500;
        Object.defineProperty(this, "totalBet", {
            get() {
                return this._totalBet;
            },
            set(value) {
                this._totalBet = value;
            },
        });
        this.triggerAutoSpin = false;
        this.autoSpinEnabled = false;
        this.autoSpinCount = 0;
        this.autoSpinSelectedValue = 10;
        this.autoSpinDialogOpenEvent = null;
        this.showLineSelection = null;
        this._freeSpinEnabled = false;
        Object.defineProperty(this, "freeSpinEnabled", {
            get() {
                return this._freeSpinEnabled;
            },
            set(value) {
                this._freeSpinEnabled = value;
            },
        });
        this.acceptAutoSpinValue = jest.fn();
        this.decreaseAutoSpinCount = jest.fn();
        this.cancelAutoSpin = jest.fn();
        this.clearFreeSpins = jest.fn();
        return this;
    }),
}));

// Mock SlotBoardStore
jest.mock("../../assets/scripts/handlers/stores/slot-board-store", () => ({
    SlotBoardStore: jest.fn().mockImplementation(function (this: any) {
        this._isReadyBet = true;
        Object.defineProperty(this, "isReadyBet", {
            get() {
                return this._isReadyBet;
            },
            set(value) {
                this._isReadyBet = value;
            },
        });
        this.slotState = SlotState.READY;
        this.bottomMessageState = SlotNotification.READY;
        this.forceStopSettle = null;
        this.resetOnNewSpin = jest.fn();
        this.reset = jest.fn();
        return this;
    }),
}));

// Mock gc.Bet.BetHandler parent class and BetStore
jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        Bet: {
            ...actualGc.Bet,
            BetHandler: jest.fn().mockImplementation(function (this: any) {
                this.createBetData = jest.fn().mockReturnValue({});
                this.handleBetData = jest.fn();
                this.showWarningProcessingBet = jest.fn();
                this.showNoticePlaceBetFailure = jest.fn();
                return this;
            }),
            BetStore: jest.fn().mockImplementation(function (this: any) {
                this.isProcessingBet = false;
                this._availableBalance = 10000;
                Object.defineProperty(this, "availableBalance", {
                    get() {
                        return this._availableBalance;
                    },
                    set(value) {
                        this._availableBalance = value;
                    },
                });
                return this;
            }),
        },
    };
});

describe("SlotBetHandler", () => {
    let container: Container;
    let slotBetHandler: SlotBetHandler;
    let betControlStore: jest.Mocked<BetControlStore>;
    let slotBoardStore: jest.Mocked<SlotBoardStore>;
    let betStore: jest.Mocked<gc.Bet.BetStore>;

    beforeEach(() => {
        jest.useFakeTimers();

        container = new Container();

        // Bind the class under test
        container.bind(SlotBetHandler).toSelf();

        // Bind mocked dependencies
        const mockBetControlStoreInstance = new (jest.requireMock(
            "../../assets/scripts/handlers/stores/bet-control-store"
        ).BetControlStore)();
        container.bind(BetControlStore).toConstantValue(mockBetControlStoreInstance);

        const mockSlotBoardStoreInstance = new (jest.requireMock("../../assets/scripts/handlers/stores/slot-board-store").SlotBoardStore)();
        container.bind(SlotBoardStore).toConstantValue(mockSlotBoardStoreInstance);

        const MockedBetStore = jest.requireMock("@sg/game-client-base").Bet.BetStore;
        const mockBetStoreInstance = new MockedBetStore();
        container.bind(gc.Bet.BetStore).toConstantValue(mockBetStoreInstance);

        // Get instances
        slotBetHandler = container.get(SlotBetHandler);
        betControlStore = container.get(BetControlStore) as jest.Mocked<BetControlStore>;
        slotBoardStore = container.get(SlotBoardStore) as jest.Mocked<SlotBoardStore>;
        betStore = container.get(gc.Bet.BetStore) as jest.Mocked<gc.Bet.BetStore>;

        // Assign betStore to slotBetHandler for proper inheritance from BetHandler
        Object.assign(slotBetHandler, {
            betStore: betStore,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe("handle", () => {
        it("should call callBet when handle is executed", () => {
            const callBetSpy = jest.spyOn(slotBetHandler, "callBet");

            slotBetHandler.handle();

            expect(callBetSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("callBet", () => {
        it("should not proceed when board is not ready for bet", () => {
            (slotBoardStore as any)._isReadyBet = false;
            const resetOnNewSpinSpy = jest.spyOn(slotBetHandler, "resetOnNewSpin");

            slotBetHandler.callBet();

            expect(resetOnNewSpinSpy).not.toHaveBeenCalled();
            expect(slotBoardStore.slotState).not.toBe(SlotState.BET);
        });

        it("should execute full bet flow when board is ready", () => {
            (slotBoardStore as any)._isReadyBet = true;
            betControlStore.stake = 50;
            const resetOnNewSpinSpy = jest.spyOn(slotBetHandler, "resetOnNewSpin");
            const createBetDataSpy = jest.spyOn(slotBetHandler, "createBetData");
            const handleBetDataSpy = jest.spyOn(slotBetHandler, "handleBetData");

            const mockBetData = { baseAmount: 100 };
            createBetDataSpy.mockReturnValue(mockBetData);

            slotBetHandler.callBet();

            expect(resetOnNewSpinSpy).toHaveBeenCalledTimes(1);
            expect(slotBoardStore.slotState).toBe(SlotState.BET);
            expect(slotBoardStore.bottomMessageState).toBe(SlotNotification.SPINNING);
            expect(createBetDataSpy).toHaveBeenCalledWith({});
            expect(handleBetDataSpy).toHaveBeenCalledWith({
                ...mockBetData,
                amount: 50,
                betChoice: SLOT_BET_CHOICES,
            });
        });
    });

    describe("resetOnNewSpin", () => {
        it("should call slot board store resetOnNewSpin method", () => {
            slotBetHandler.resetOnNewSpin();

            expect(slotBoardStore.resetOnNewSpin).toHaveBeenCalledTimes(1);
        });
    });

    describe("callTriggerAction", () => {
        it("should call bet and set timeout when triggerAutoSpin is false", () => {
            betControlStore.triggerAutoSpin = false;
            const callBetSpy = jest.spyOn(slotBetHandler, "callBet");

            slotBetHandler.callTriggerAction();

            expect(callBetSpy).toHaveBeenCalledTimes(1);
            expect(slotBetHandler["timeoutHolding"]).toBeDefined();

            // Advance timer to trigger setTimeout
            jest.advanceTimersByTime(1000);
            expect(betControlStore.triggerAutoSpin).toBe(true);
        });

        it("should not execute when triggerAutoSpin is already true", () => {
            betControlStore.triggerAutoSpin = true;
            const callBetSpy = jest.spyOn(slotBetHandler, "callBet");

            slotBetHandler.callTriggerAction();

            expect(callBetSpy).not.toHaveBeenCalled();
        });
    });

    describe("clearTriggerAction", () => {
        it("should clear triggerAutoSpin and timeout", () => {
            betControlStore.triggerAutoSpin = true;
            slotBetHandler["timeoutHolding"] = setTimeout(() => {}, 1000) as any;
            const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

            slotBetHandler.clearTriggerAction();

            expect(betControlStore.triggerAutoSpin).toBe(false);
            expect(clearTimeoutSpy).toHaveBeenCalled();
        });

        it("should handle when timeout is not set", () => {
            betControlStore.triggerAutoSpin = true;
            slotBetHandler["timeoutHolding"] = undefined;

            // Should not throw error
            expect(() => slotBetHandler.clearTriggerAction()).not.toThrow();
            expect(betControlStore.triggerAutoSpin).toBe(false);
        });
    });

    describe("isValidBet", () => {
        it("should return false when bet is processing", () => {
            betStore.isProcessingBet = true;
            const showWarningProcessingBetSpy = jest.spyOn(slotBetHandler, "showWarningProcessingBet");

            const result = slotBetHandler.isValidBet(100);

            expect(result).toBe(false);
            expect(showWarningProcessingBetSpy).toHaveBeenCalledTimes(1);
        });

        it("should return false when insufficient balance for regular bet", () => {
            betStore.isProcessingBet = false;
            (betControlStore as any)._freeSpinEnabled = false;
            (betControlStore as any)._totalBet = 15000;
            (betStore as any)._availableBalance = 10000;
            const showNoticePlaceBetFailureSpy = jest.spyOn(slotBetHandler, "showNoticePlaceBetFailure");
            const handlePlaceBetFailedSpy = jest.spyOn(slotBetHandler, "handlePlaceBetFailed");

            const result = slotBetHandler.isValidBet(100);

            expect(result).toBe(false);
            expect(showNoticePlaceBetFailureSpy).toHaveBeenCalledTimes(1);
            expect(handlePlaceBetFailedSpy).toHaveBeenCalledTimes(1);
        });

        it("should return true when balance is sufficient", () => {
            betStore.isProcessingBet = false;
            (betControlStore as any)._freeSpinEnabled = false;
            (betControlStore as any)._totalBet = 5000;
            (betStore as any)._availableBalance = 10000;

            const result = slotBetHandler.isValidBet(100);

            expect(result).toBe(true);
        });

        it("should return true for free spin bet regardless of balance", () => {
            betStore.isProcessingBet = false;
            (betControlStore as any)._freeSpinEnabled = true;
            (betControlStore as any)._totalBet = 15000;
            (betStore as any)._availableBalance = 10000;

            const result = slotBetHandler.isValidBet(100);

            expect(result).toBe(true);
        });
    });

    describe("confirmAutoSpin", () => {
        it("should accept auto spin value and set timeout for action", () => {
            const autoSpinValue = 50;
            const actionAutoSpinSpy = jest.spyOn(slotBetHandler, "actionAutoSpin");

            slotBetHandler.confirmAutoSpin(autoSpinValue);

            expect(betControlStore.acceptAutoSpinValue).toHaveBeenCalledWith(autoSpinValue);
            expect(slotBetHandler["timeoutStartAutoSpin"]).toBeDefined();

            // Advance timer to trigger setTimeout
            jest.advanceTimersByTime(300);
            expect(actionAutoSpinSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("actionAutoSpin", () => {
        it("should call bet when auto spin count decrease is successful", () => {
            betControlStore.decreaseAutoSpinCount.mockReturnValue(true);
            const callBetSpy = jest.spyOn(slotBetHandler, "callBet");

            slotBetHandler.actionAutoSpin();

            expect(betControlStore.decreaseAutoSpinCount).toHaveBeenCalledTimes(1);
            expect(callBetSpy).toHaveBeenCalledTimes(1);
        });

        it("should cancel auto spin and open dialog when count decrease fails", () => {
            betControlStore.decreaseAutoSpinCount.mockReturnValue(false);
            const cancelAutoSpinSpy = jest.spyOn(slotBetHandler, "cancelAutoSpin");
            const openAutoSpinDialogSpy = jest.spyOn(slotBetHandler, "openAutoSpinDialog");

            slotBetHandler.actionAutoSpin();

            expect(betControlStore.decreaseAutoSpinCount).toHaveBeenCalledTimes(1);
            expect(cancelAutoSpinSpy).toHaveBeenCalledTimes(1);
            expect(openAutoSpinDialogSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("handleClickAutoSpin", () => {
        it("should cancel auto spin when auto spin is enabled", () => {
            betControlStore.autoSpinEnabled = true;
            const cancelAutoSpinSpy = jest.spyOn(slotBetHandler, "cancelAutoSpin");

            slotBetHandler.handleClickAutoSpin();

            expect(cancelAutoSpinSpy).toHaveBeenCalledTimes(1);
        });

        it("should open auto spin dialog when auto spin is disabled", () => {
            betControlStore.autoSpinEnabled = false;
            const openAutoSpinDialogSpy = jest.spyOn(slotBetHandler, "openAutoSpinDialog");

            slotBetHandler.handleClickAutoSpin();

            expect(openAutoSpinDialogSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("cancelAutoSpin", () => {
        it("should clear timeout and cancel auto spin in store", () => {
            slotBetHandler["timeoutStartAutoSpin"] = setTimeout(() => {}, 1000) as any;
            const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

            slotBetHandler.cancelAutoSpin();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            expect(betControlStore.cancelAutoSpin).toHaveBeenCalledTimes(1);
        });

        it("should handle when timeout is not set", () => {
            slotBetHandler["timeoutStartAutoSpin"] = undefined;

            // Should not throw error
            expect(() => slotBetHandler.cancelAutoSpin()).not.toThrow();
            expect(betControlStore.cancelAutoSpin).toHaveBeenCalledTimes(1);
        });
    });

    describe("openAutoSpinDialog", () => {
        it("should set auto spin dialog open event", () => {
            slotBetHandler.openAutoSpinDialog();

            expect(betControlStore.autoSpinDialogOpenEvent).toEqual({});
        });
    });

    describe("showLineSelection", () => {
        it("should set show line selection event", () => {
            slotBetHandler.showLineSelection();

            expect(betControlStore.showLineSelection).toEqual({});
        });
    });

    describe("handlePlaceBetFailed", () => {
        it("should cancel auto spin, clear trigger action, reset board and clear free spins", () => {
            const cancelAutoSpinSpy = jest.spyOn(slotBetHandler, "cancelAutoSpin");
            const clearTriggerActionSpy = jest.spyOn(slotBetHandler, "clearTriggerAction");

            slotBetHandler.handlePlaceBetFailed();

            expect(cancelAutoSpinSpy).toHaveBeenCalledTimes(1);
            expect(clearTriggerActionSpy).toHaveBeenCalledTimes(1);
            expect(slotBoardStore.reset).toHaveBeenCalledTimes(1);
            expect(betControlStore.clearFreeSpins).toHaveBeenCalledTimes(1);
        });
    });

    describe("HOLDING_THRESHOLD", () => {
        it("should have correct holding threshold value", () => {
            expect(slotBetHandler["HOLDING_THRESHOLD"]).toBe(1000);
        });
    });
});
