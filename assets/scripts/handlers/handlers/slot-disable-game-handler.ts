import gc from "@sg/game-client-base";
import inversify from "inversify";
import { BetControlStore } from "../stores/bet-control-store";

const { injectable, inject } = inversify;

@injectable()
export class SlotDisableGameHandler extends gc.DisabledGame.DisableGameHandlers {
    @inject(BetControlStore) protected betControlStore: BetControlStore;
    @inject(gc.JoinGame.JoinGameStore) protected joinGameStore: gc.JoinGame.JoinGameStore;

    handleUM(um: boolean) {
        this.disabledGameStore.disabled = um;
        if (um) {
            const notJoinGame = Object.keys(this.joinGameStore.toGame).length === 0;
            if (this.betControlStore.isReadyBet || notJoinGame) {
                setTimeout(() => {
                    this.showPopupHandle();
                }, 0);
            }
        }
    }
}
