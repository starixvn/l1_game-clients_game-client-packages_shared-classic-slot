import { _decorator, Enum, Node } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { JackpotPoolStore } from "../handlers/stores/jackpot-pool-store";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;

export enum GameMode {
    Normal = "normal",
    Jackpot = "jackpot",
}

@ccclass
export default class JackpotVisibility extends ObserverComponent {
    @property(Node)
    target: Node = null;

    @property({ type: Enum(GameMode) })
    mode = GameMode.Jackpot;

    @render(JackpotPoolStore, (store) => store.jackpotEnabled)
    renderJackpotEnabled(jackpotEnabled: boolean) {
        const active = this.mode === GameMode.Jackpot ? jackpotEnabled : !jackpotEnabled;
        this.target.active = active;
    }
}
