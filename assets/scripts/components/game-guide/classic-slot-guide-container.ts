import { _decorator } from "cc";
import { GameGuideContainer } from "db://shared-components/game/game-guide/scripts/game-guide-container";
import Observer from "observer";
import { JackpotPoolStore } from "../../handlers";
import { ClassicSlotGuide } from "./classic-slot-guide";

const { ccclass, property } = _decorator;
const { observer, render, handle } = Observer;

@ccclass
export class ClassicSlotGuideContainer extends GameGuideContainer {
    protected jackpotEnabled: boolean;
    @render(JackpotPoolStore, (store) => store.jackpotEnabled)
    renderJackpotEnabled(jackpotEnabled: { enabled: boolean }) {
        this.jackpotEnabled = jackpotEnabled.enabled;
    }

    protected openDialog(scrollToId: string) {
        const guide = this.createNode();
        guide.getComponent(ClassicSlotGuide)?.initUrlForSlotGame("", scrollToId, this.jackpotEnabled);
    }
}
