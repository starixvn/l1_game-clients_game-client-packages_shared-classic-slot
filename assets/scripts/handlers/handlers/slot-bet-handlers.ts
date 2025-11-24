import gc from "@sg/game-client-base";
import { FSBPromotionStore } from "db://shared-common-slot/fsb-promotion/scripts/stores/fsb-promotion-store";
import { FSBPromotionUIStore } from "db://shared-common-slot/fsb-promotion/scripts/stores/fsb-promotion-ui-store";
import { FunctionUtils } from "db://shared-components/shared/utils";
import inversify from "inversify";
import { SLOT_BET_CHOICES } from "../../definitions";
import { DialogName } from "../../utils/classic-slot-utils";
import { BetControlStore } from "../stores/bet-control-store";
import { SlotBoardStore } from "../stores/slot-board-store";
import { SlotBetResponseHandler } from "./slot-bet-response-handlers";
import { SlotUIHandler } from "./slot-ui-handler";
const { injectable, inject } = inversify;
@injectable()
export class SlotBetHandler extends gc.Bet.BetHandler {
    @inject(BetControlStore) protected betControlStore: BetControlStore;
    @inject(SlotBoardStore) protected slotBoardStore: SlotBoardStore;
    @inject(SlotUIHandler) protected slotUIHandler: SlotUIHandler;
    @inject(SlotBetResponseHandler) protected slotBetResponseHandler: SlotBetResponseHandler;
    @inject(FSBPromotionUIStore) protected fsbPromotionUIStore: FSBPromotionUIStore;
    @inject(FSBPromotionStore) protected fsbPromotionStore: FSBPromotionStore;
    @inject(gc.Player.MainPlayerStore) protected mainPlayerStore: gc.Player.MainPlayerStore;

    protected timeoutHolding: NodeJS.Timeout;
    protected readonly HOLDING_THRESHOLD = 1000;
    protected timeoutStartAutoSpin: NodeJS.Timeout;

    handle() {
        this.callBet();
    }

    isConnectionReady() {
        return this.connectionStore.isConnected && this.connectionStore.signedIn;
    }

    handleInterruption() {
        if (this.betStore.isProcessingBet) {
            this.resetBetProcessing();

            if (this.betControlStore.autoSpinEnabled || this.betControlStore.freeSpinEnabled) {
                this.callBet();
            }
        }
    }

    async callBet() {
        if (this.betStore.isProcessingBet) {
            this.showWarningProcessingBet();
            return;
        }

        if (!this.betControlStore.isReadyBet) {
            return;
        }

        await FunctionUtils.waitUntil(() => this.isConnectionReady(), 100, 20 * 60000).catch(() => { });
        if (!this.isConnectionReady()) {
            return;
        }

        this.betControlStore.didSpin = true;
        this.betControlStore.isFreeSpinEffectCompleted = false;
        this.resetOnNewSpin();

        const amount = this.fsbPromotionUIStore.isFSBPromotionInProgress
            ? this.fsbPromotionStore.promotion.betLevel
            : this.betControlStore.stake;
        const betData = this.createBetData({});
        Object.assign(betData, {
            amount: amount,
            betChoice: SLOT_BET_CHOICES,
            freeSpin: this.betControlStore.freeSpinEnabled || this.fsbPromotionUIStore.isFSBPromotionInProgress,
        });
        this.handleBetData(betData);
    }

    resetOnNewSpin() {
        this.slotBoardStore.resetOnNewSpin();
    }

    callTriggerAction() {
        if (!this.betControlStore.triggerAutoSpin) {
            //check available bet

            this.callBet();
            this.timeoutHolding = setTimeout(() => {
                this.betControlStore.triggerAutoSpin = true;
            }, this.HOLDING_THRESHOLD);
        }
    }

    clearTriggerAction() {
        this.betControlStore.triggerAutoSpin = false;
        this.timeoutHolding && clearTimeout(this.timeoutHolding);
    }

    isValidBet(amount: number) {
        if (this.betStore.isProcessingBet) {
            this.showWarningProcessingBet();
            return false;
        }

        if (this.fsbPromotionUIStore.isFSBPromotionInProgress) {
            return true;
        }

        if (!this.betControlStore.freeSpinEnabled && !this.isEnoughBalance()) {
            this.handlePlaceBetFailed();
            return false;
        }

        return true;
    }

    isEnoughBalance() {
        const availableBalance = gc.FormatUtils.formatXMode(this.betStore.availableBalance, this.mainPlayerStore.xMode);
        if (this.betControlStore.totalBet > availableBalance) {
            this.showNoticePlaceBetFailure();
            return false;
        }
        return true;
    }

    confirmAutoSpin(value: number) {
        this.betControlStore.acceptAutoSpinValue(value);
        this.timeoutStartAutoSpin = setTimeout(() => this.actionAutoSpin(), 300);
    }

    actionAutoSpin() {
        const success = this.betControlStore.decreaseAutoSpinCount();
        if (success) {
            this.callBet();
        } else {
            this.cancelAutoSpin();
            this.openAutoSpinDialog();
        }
    }

    handleClickAutoSpin() {
        if (this.betControlStore.autoSpinEnabled) {
            this.cancelAutoSpin();
        } else {
            this.openAutoSpinDialog();
        }
    }

    cancelAutoSpin() {
        this.timeoutStartAutoSpin && clearTimeout(this.timeoutStartAutoSpin);
        this.betControlStore.cancelAutoSpin();
        this.slotBoardStore.resetToReady();
    }

    openAutoSpinDialog() {
        if (!this.isEnoughBalance()) {
            return;
        }
        this.betControlStore.autoSpinDialogOpenEvent = {};
        this.slotUIHandler.triggerDialogOpen({ name: DialogName.AUTO_SPIN });
    }

    showLineSelection() {
        this.betControlStore.showLineSelection = {};
    }

    resetBetProcessing() {
        this.slotBetResponseHandler.stopProcessingBetAndClearInterval();
        this.slotBoardStore.resetToReady();
        this.clearTriggerAction();
        this.slotBoardStore.clearSettlement();
    }

    handlePlaceBetFailed(clearFreeSpins = false) {
        this.slotBetResponseHandler.stopProcessingBetAndClearInterval();
        this.cancelAutoSpin();
        this.clearTriggerAction();
        this.slotBoardStore.clearSettlement();

        if (clearFreeSpins) {
            this.betControlStore.clearFreeSpins();
        }
        this.betControlStore.didSpin = false;
    }
}
