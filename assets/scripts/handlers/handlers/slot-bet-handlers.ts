import gc from "@sg/game-client-base";
import inversify from "inversify";
import { BetControlStore } from "../stores/bet-control-store";
const { injectable, inject } = inversify;

@injectable()
export class SlotBetHandler extends gc.Bet.BetHandler {
    @inject(BetControlStore) private betControlStore: BetControlStore;

    protected timeoutHolding: NodeJS.Timeout;
    protected readonly HOLDING_THRESHOLD = 1000;

    handle() {
        this.callBet();
    }

    callBet() {
        const betData = this.createBetData({});
        Object.assign(betData, {
            amount: this.betControlStore.stake,
            betChoice: this.betControlStore.betChoice,
        });

        this.handleBetData(betData);
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

        const availableBalance = this.betStore.availableBalance;
        if (this.gameSetting?.validateBalanceWhenBet && amount > availableBalance) {
            this.showNoticePlaceBetFailure();
            return false;
        }

        return true;
    }
}
