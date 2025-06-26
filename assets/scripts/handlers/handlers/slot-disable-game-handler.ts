import gc from "@sg/game-client-base";
import inversify from "inversify";
import { SlotBoardStore } from "../stores/slot-board-store";

const { injectable, inject } = inversify;

@injectable()
export class SlotDisableGameHandler extends gc.DisabledGame.DisableGameHandlers {
    @inject(SlotBoardStore) protected slotBoardStore: SlotBoardStore;
    @inject(gc.JoinGame.JoinGameStore) protected joinGameStore: gc.JoinGame.JoinGameStore;

    handleUM(um: boolean) {
        this.disabledGameStore.disabled = um;
        if (um) {
            const notJoinGame = Object.keys(this.joinGameStore.toGame).length === 0;
            if (this.slotBoardStore.isReadyBet || notJoinGame) {
                setTimeout(() => {
                    this.showPopupHandle();
                }, 0);
            }
        }
    }
}
