import { _decorator, instantiate, Prefab } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { BetControlStore } from "../../handlers/stores/bet-control-store";
import { loadSharedClassicSlotAsset } from "../../utils/classic-slot-utils";
const { handle, render } = Observer;
const { ccclass, property } = _decorator;

@ccclass
export default class AutoSpinDialogContainer extends ObserverComponent {
    @render(BetControlStore, (store) => store.autoSpinDialogOpenEvent, { fireImmediately: false })
    renderAutoSpinDialogOpen(autoSpinDialogOpenEvent: any) {
        if (autoSpinDialogOpenEvent) {
            this.show();
        }
    }

    async show() {
        const prefab = await loadSharedClassicSlotAsset<Prefab>("prefabs/auto-spin-dialog", Prefab);
        const dialog = instantiate(prefab);
        this.node.addChild(dialog);
    }
}
