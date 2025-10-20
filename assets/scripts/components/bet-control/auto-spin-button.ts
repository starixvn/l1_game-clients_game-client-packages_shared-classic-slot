import { _decorator, Label, Node } from "cc";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { SlotBetHandler } from "../../handlers/handlers/slot-bet-handlers";
import { BetControlStore } from "../../handlers/stores/bet-control-store";
const { ccclass, property } = _decorator;
const { handle, render } = Observer;

@ccclass
export default class AutoSpinButton extends ObserverComponent {
    @property(Label)
    lblAutoSpin: Label = null;

    @property(Node)
    nodeAutoSpin: Node = null;

    @render(BetControlStore, (store) => store.autoSpinCount)
    rendeAutoSpinCount(autoSpinCount: number) {
        this.lblAutoSpin.string = autoSpinCount.toString();
    }

    @render(BetControlStore, (store) => store.autoSpinEnabled)
    renderAutoSpinEnabled(autoSpinEnabled: boolean) {
        this.nodeAutoSpin.active = autoSpinEnabled;
    }


    @handle(SlotBetHandler, (store) => store.cancelAutoSpin())
    cancelAutoSpin() {
        AudioUtils.playClick();
    }
}
