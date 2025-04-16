import { BundleManager } from "bundle-management";

import { _decorator, AudioSource, Prefab } from "cc";
import BonusDialog from "./BonusDialog";
import { ClassicSlotSound } from "./classic-slot-sound";
const { ccclass, property } = _decorator;

@ccclass
export default class StandardSlotBonusDialog extends BonusDialog {
    @property({ type: Prefab, visible: false, override: true })
    bonusItem: Prefab = null;

    @property({ type: AudioSource, visible: false, override: true })
    soundBigWin: AudioSource = null;

    async initBonusItems() {
        await this.loadBonusItemPrefab();
        super.initBonusItems();
    }

    playBonusItemSound() {
        this.playSoundCallback(ClassicSlotSound.BONUS_ITEM);
    }

    async loadBonusItemPrefab() {
        const path = `preload/prefabs/bonus-item`;
        const devPath = `../games/*/${path}`;
        try {
            const prefab = await BundleManager.getInstance().loadAsset<Prefab>({
                bundleId: this.gameId.toString(),
                path: path,
                pathForDevMode: devPath,
                type: Prefab,
            });

            this.bonusItem = prefab;
        } catch (e) {
            console.warn(`Missing prefab for ${path} `, e);
        }
    }
}
