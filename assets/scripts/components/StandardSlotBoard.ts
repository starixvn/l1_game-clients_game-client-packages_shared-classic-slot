import { _decorator, Node } from "cc";
import PreviewOddsPopup from "./PreviewOddsPopup";
import SlotBoard from "./SlotBoard";
import StandardSlotReelItem from "./StandardSlotReelItem";
const { ccclass, property } = _decorator;

@ccclass
export default class StandardSlotBoard extends SlotBoard {
    @property(PreviewOddsPopup)
    previewPopup: PreviewOddsPopup = null;

    turbo: boolean;
    symbolCountPerReel = 24;
    stepSymbolPerReel = 6;

    initReels() {
        super.initReels();
        this.previewPopup.addPreviewPopup(this.reels);
    }

    setItemWinningEffect() {
        this.reels.forEach((reel) => {
            reel.items.forEach((item: StandardSlotReelItem) => {
                item.addWinningEffect();
            });
        });
    }

    updateSymbolDuration(duration: number) {
        this.reels.forEach((reel) => {
            reel.items.forEach((item: StandardSlotReelItem) => {
                item.updateDuration(duration);
            });
        });
    }

    showPreview(previewNode: Node, worldPosition: Vec3) {
        this.previewPopup.showPreview(previewNode, worldPosition);
    }

    spin(duration: number, turbo: boolean): Promise<void> {
        this.previewPopup.hideSymbolPreview();
        return super.spin(duration, turbo);
    }

    getSymbolCountPerReel(index: number) {
        if (this.turbo) {
            return this.symbolCountPerReel;
        } else {
            return this.symbolCountPerReel + index * this.stepSymbolPerReel;
        }
    }
}
