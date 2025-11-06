import { _decorator, instantiate, Node, Prefab } from "cc";
import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { bundleManager } from "db://shared-components/shared/common-components/bundle-manager/bundle-manager";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { SlotBoardStore } from "../handlers/stores/slot-board-store";
import { CLASSIC_SLOT_BUNDLE } from "../utils/classic-slot-utils";
import BonusDialog from "./bonus/bonus-dialog";
import CallbackAnimation from "./callback-animation/callback-animation";
import BigWinAnimation from "./others/big-win-animation";
import JackpotGame from "./others/jackpot-game";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;
@ccclass
export default class EffectContainer extends ObserverComponent {
    @property
    portraitMode = false;

    protected effectTransition: Prefab = null;
    protected effectJackpot: Prefab = null;
    protected effectBonus: Prefab = null;
    protected effectFreeSpin: Prefab = null;
    protected effectBigWin: Prefab = null;
    protected jackpotGamePrefab: Prefab = null;
    protected bonusDialogPrefab: Prefab = null;

    async loadEffectFreeSpin() {
        if (this.effectFreeSpin) {
            return;
        }
        const path = `prefabs/effects/effect-freespin`;
        this.effectFreeSpin = await this.loadPrefab(path);
    }
    @render(SlotBoardStore, (store) => store.receivedFreeSpins, { fireImmediately: false })
    async receivedFreeSpins(receivedFreeSpins: { freeSpins: any; duration: number }) {
        if (!receivedFreeSpins) {
            return;
        }
        try {
            const transtition = await this.playEffectTransition();
            const { duration } = receivedFreeSpins;
            AudioUtils.playSFX(AudioIds.FREESPIN);
            await this.loadEffectFreeSpin();
            const effect = instantiate(this.effectFreeSpin);
            const animation = effect.getComponent(CallbackAnimation);
            animation.setDuration(duration);
            await this.showEffect(effect);
            transtition?.destroy();
        } catch (e) { }
    }

    async loadEffectBigWin() {
        if (this.effectBigWin) {
            return;
        }
        const path = `prefabs/effects/effect-big-win`;
        this.effectBigWin = await this.loadPrefab(path);
    }

    @render(SlotBoardStore, (store) => store.receivedBigWin, { fireImmediately: false })
    async receivedBigWin(receivedBigWin: {
        bigWin: any;
        duration: number;
        showBigWinValue: number;
        delayShowBigWinValue: number;
        amount: number;
    }) {
        if (!receivedBigWin) {
            return;
        }
        try {
            const transtition = await this.playEffectTransition();
            const { duration, showBigWinValue, delayShowBigWinValue, amount } = receivedBigWin;
            AudioUtils.playSFX(AudioIds.BIG_WIN);
            await this.loadEffectBigWin();
            const effect = instantiate(this.effectBigWin);
            const callbackAnim = effect.getComponent(CallbackAnimation);
            callbackAnim.setDuration(duration);
            const bigWinAnimation = effect.getComponent(BigWinAnimation);
            bigWinAnimation.setAmount({ amount, duration: showBigWinValue, delayTime: delayShowBigWinValue });
            await this.showEffect(effect);
            transtition?.destroy();
        } catch (e) { }
    }

    async loadEffectJackpot() {
        if (this.effectJackpot) {
            return;
        }
        const path = `prefabs/effects/effect-jackpot`;
        this.effectJackpot = await this.loadPrefab(path);
    }

    async loadJackpotGame() {
        if (this.jackpotGamePrefab) {
            return;
        }
        const path = this.portraitMode ? `v-portrait/prefabs/jackpot-game-portrait` : `prefabs/jackpot-game`;

        this.jackpotGamePrefab = await bundleManager.loadAssetsFromBundle<Prefab>(CLASSIC_SLOT_BUNDLE, path, Prefab, null);
    }

    @render(SlotBoardStore, (store) => store.receivedJackpot, { fireImmediately: false })
    async receivedJackpot(receivedJackpot: { jackpot: any; duration: number, onComplete: () => void }) {
        if (!receivedJackpot) {
            return;
        }
        const { duration, onComplete } = receivedJackpot;
        try {
            const transtition = await this.playEffectTransition();
            AudioUtils.playSFX(AudioIds.JACKPOT_HIT);
            await this.loadEffectJackpot();
            const effect = instantiate(this.effectJackpot);
            const animation = effect.getComponent(CallbackAnimation);
            animation.setDuration(duration);
            await this.showEffect(effect);
            onComplete();
            transtition?.destroy();
        } catch (e) {
            onComplete();
        }
    }

    @render(SlotBoardStore, (store) => store.showJackpotGame, { fireImmediately: false })
    async triggerShowJackpotGame(showJackpotGame: { jackpot: any; duration: number, onComplete: () => void }) {
        if (!showJackpotGame) {
            return;
        }
        const { jackpot, onComplete } = showJackpotGame;
        try {
            await this.loadJackpotGame();
            await this.showJackpotGame(jackpot.prizes);
            onComplete()
        } catch (e) { onComplete() }
    }

    protected showJackpotGame(prizes: number) {
        return new Promise<void>((resolve) => {
            const node = instantiate(this.jackpotGamePrefab);
            this.node.addChild(node);
            const dialog = node.getComponent(JackpotGame);
            dialog.prizes = prizes;
            dialog.initJackpotItems();
            dialog.onJackpotGameFinished = resolve;
            dialog.show();
        });
    }

    async loadEffectBonus() {
        if (this.effectBonus) {
            return;
        }
        const path = `prefabs/effects/effect-bonus`;
        this.effectBonus = await this.loadPrefab(path);
    }

    async loadBonusDialog() {
        if (this.bonusDialogPrefab) {
            return;
        }
        const path = `prefabs/dialogs/dialog-bonus`;
        this.bonusDialogPrefab = await this.loadPrefab(path);
    }

    @render(SlotBoardStore, (store) => store.receivedBonus, { fireImmediately: false })
    async receivedBonus(receivedBonus: { bonus: any; duration: number, onComplete: () => void }) {
        if (!receivedBonus) {
            return;
        }
        const { duration, onComplete } = receivedBonus;
        try {
            const transtition = await this.playEffectTransition();
            AudioUtils.playSFX(AudioIds.BONUS);
            await this.loadEffectBonus();
            const effect = instantiate(this.effectBonus);
            const animation = effect.getComponent(CallbackAnimation);
            animation.setDuration(duration);
            await this.showEffect(effect);
            onComplete();
            transtition?.destroy();
        } catch (e) {
            onComplete();
        }
    }

    @render(SlotBoardStore, (store) => store.showBonusDialog, { fireImmediately: false })
    async triggerShowBonus(showBonusDialog: { bonus: any; duration: number; onComplete: () => void }) {
        if (!showBonusDialog) {
            return;
        }
        const { bonus, onComplete } = showBonusDialog;
        try {
            AudioUtils.playSFX(AudioIds.BONUS_POPUP);
            await this.loadBonusDialog();
            this.showBonusDialog(bonus, () => {
                onComplete();
            });
        } catch (e) {
            onComplete();
        }
    }

    showBonusDialog(bonus: any, onBonusFinished: () => void) {
        const node = instantiate(this.bonusDialogPrefab);
        this.node.addChild(node);
        const dialog = node.getComponent(BonusDialog);
        dialog.initBonusItems();
        dialog.setBonusCount(bonus);
        dialog.onBonusFinished = onBonusFinished;
        dialog.show();
    }

    async loadEffectTransition() {
        if (this.effectTransition) {
            return;
        }
        const path = `prefabs/effects/effect-transition`;
        this.effectTransition = await this.loadPrefab(path);
    }

    loadPrefab(path: string) {
        return bundleManager.loadResourcesAsset<Prefab>(path, Prefab);
    }

    protected async playEffectTransition() {
        await this.loadEffectTransition();
        const effect = instantiate(this.effectTransition);
        const animation = effect.getComponent(CallbackAnimation);
        animation.autoDestroyNode = false;

        AudioUtils.playSFX(AudioIds.TRANSITION);
        await this.showEffect(effect);

        return effect;
    }

    showEffect(effect: Node): Promise<void> {
        return new Promise<void>((resolve) => {
            this.node.addChild(effect);

            const animation = effect.getComponent(CallbackAnimation);
            animation.onFinishedCallback = () => {
                resolve();
            };
            animation.play();
        });
    }
}
