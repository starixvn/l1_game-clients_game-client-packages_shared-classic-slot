import gc from "@sg/game-client-base";
import { GameVisibilityStore } from "db://shared-components/shared/common-components/game-visibility/game-visibility-store";
import inversify from "inversify";
import { SlotBoardStore } from "../stores/slot-board-store";
const { injectable, inject } = inversify;

enum TopWinnerEvent {
    BigWinningWinners = "getBigWinningWinners",
    JackpotWinners = "getJackpotWinners",
}

@injectable()
export class InterruptionHandlers {
    @inject(gc.Connection.ConnectionStore) protected readonly connectionStore: gc.Connection.ConnectionStore;
    @inject(gc.Notification.NotificationStore) protected readonly notificationStore: gc.Notification.NotificationStore;
    @inject(GameVisibilityStore) protected readonly gameVisibilityStore: GameVisibilityStore;
    @inject(SlotBoardStore) protected readonly slotBoardStore: SlotBoardStore;
    @inject(gc.Auth.AuthHandlers.TriggerRecheckIn) protected readonly triggerRecheckIn: gc.Auth.AuthHandlers.TriggerRecheckIn;
    onGameHide() {
        this.slotBoardStore.gameHidden = true;
    }

    onGameShow() {
        this.slotBoardStore.gameHidden = false;
        this.triggerRecheckIn.handle();
        if (!this.connectionStore.isConnected) {
            this.connectionStore.reconnect();
        }
        if (!this.notificationStore.isConnected) {
            this.notificationStore.reconnect();
        }
    }
}
