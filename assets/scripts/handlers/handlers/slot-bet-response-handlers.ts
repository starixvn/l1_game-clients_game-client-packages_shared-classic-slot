import gc from "@sg/game-client-base";
import inversify from "inversify";
import { BetControlStore } from "../stores/bet-control-store";
const { injectable, inject } = inversify;

@injectable()
export class SlotBetResponseHandler {
    @inject(BetControlStore) private betControlStore: BetControlStore;
    @inject(gc.Bet.BetStore) protected readonly betStore: gc.Bet.BetStore;
    @inject(gc.Connection.ConnectionHandlers.RetryGameHandler)
    protected readonly retryGameHandler: gc.Connection.ConnectionHandlers.RetryGameHandler;
    eventHandleList = [
        {
            name: "endBet,freeSpin",
            handle: this.handleSlotBetResponse,
        },
    ];

    stopProcessingBetAndClearInterval() {
        this.betStore.isProcessingBet = false;
        this.retryGameHandler.clearInterval();
    }

    handleSlotBetResponse(data: { endBet: number; freeSpin: boolean }) {
        console.log("handleSlotBetResponse", data);
        const { endBet, freeSpin } = data;
        this.stopProcessingBetAndClearInterval();
        if (endBet !== -1 && !freeSpin) {
            this.betStore.lastReceivedBet = { value: endBet, isAnimated: true };
        }
    }
}
