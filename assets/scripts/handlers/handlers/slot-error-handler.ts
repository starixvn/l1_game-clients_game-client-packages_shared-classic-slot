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
            name: "notice",
            handle: this.slotHandleNotice,
        },
    ];

    endGameApiError: gc.GameServiceMessage.ApiError = null;

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

    slotHandleNotice(notice: { errorCode: string }) {
        if (notice && notice.errorCode === "SB1929") {
            this.slotBetHandler.handlePlaceBetFailed();
        }
    }
}
