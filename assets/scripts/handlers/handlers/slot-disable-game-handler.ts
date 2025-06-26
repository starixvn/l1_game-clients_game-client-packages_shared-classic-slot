import gc from "@sg/game-client-base";
import inversify from "inversify";
import { SlotBoardStore } from "../stores/slot-board-store";

const { injectable, inject } = inversify;

@injectable()
export class SlotDisableGameHandler extends gc.DisabledGame.DisableGameHandlers {
    @inject(SlotBoardStore) protected slotBoardStore: SlotBoardStore;

    handleUM(um: boolean) {
        this.disabledGameStore.disabled = um;
        if (um) {
            if (this.slotBoardStore.isReadyBet) {
                setTimeout(() => {
                    this.showPopupHandle();
                }, 0);
            }
        }
    }
}
