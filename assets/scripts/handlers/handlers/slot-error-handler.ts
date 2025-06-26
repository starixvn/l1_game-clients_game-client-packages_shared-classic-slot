import gc from "@sg/game-client-base";
import inversify from "inversify";
import { SlotBetHandler } from "./slot-bet-handlers";
const { injectable, inject } = inversify;
@injectable()
export class SlotErrorHandler extends gc.Error.ErrorHandlers {
    @inject(gc.Bet.BetStore) protected readonly betStore: gc.Bet.BetStore;
    @inject(SlotBetHandler) protected readonly slotBetHandler: SlotBetHandler;

    eventHandleList = [
        {
            name: gc.GameServiceMessage.ApiError.eventName,
            handle: this.slotHandleApiError,
        },
        {
            name: `notice,${gc.GameServiceMessage.BetResponse.eventName}`,
            handle: this.slotHandleNotice,
        },
        {
            name: `${gc.GameServiceMessage.ApiError.eventName},${gc.GameServiceMessage.BetResponse.eventName}`,
            handle: this.handlePlaceBetError,
        },
    ];

    endGameApiError: gc.GameServiceMessage.ApiError = null;

    handlePlaceBetError(data: { endBet: number; apiError: gc.GameServiceMessage.ApiError }) {
        const { endBet, apiError } = data;
        if (endBet === -1 && apiError) {
            this.betStore.lastReceivedBet = { value: endBet, isAnimated: false };
        }
    }

    slotHandleApiError(apiError: gc.GameServiceMessage.ApiError) {
        setTimeout(() => {
            if (this.betStore.lastReceivedBet?.value === -1) {
                this.handleApiError(apiError);
                this.slotBetHandler.handlePlaceBetFailed();
            } else {
                this.endGameApiError = apiError;
            }
        }, 10);
    }

    handleEndGameApiError() {
        if (this.endGameApiError) {
            this.handleApiError(this.endGameApiError);
            this.slotBetHandler.handlePlaceBetFailed();
        }
    }

    slotHandleNotice(data: { endBet: number; notice: { errorCode: string } }) {
        const { endBet, notice } = data;
        if (endBet === -1 && notice.errorCode) {
            this.slotBetHandler.handlePlaceBetFailed();
        }
    }
}
