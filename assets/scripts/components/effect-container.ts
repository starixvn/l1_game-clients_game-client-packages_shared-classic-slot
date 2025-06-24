import { _decorator, instantiate, Node, Prefab } from "cc";
import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { SlotBoardStore } from "../handlers/stores/slot-board-store";
import BonusDialog from "./bonus/bonus-dialog";
import CallbackAnimation from "./callback-animation/callback-animation";
import BigWinAnimation from "./others/big-win-animation";
import JackpotGame from "./others/jackpot-game";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;
@ccclass
export default class EffectContainer extends ObserverComponent {
    @property(Prefab)
    protected effectTransitionPrefab: Prefab = null;
    @property(Prefab)
    protected effectJackpot: Prefab = null;
    @property(Prefab)
    protected effectBonus: Prefab = null;
    @property(Prefab)
    protected effectFreeSpin: Prefab = null;
    @property(Prefab)
    protected effectBigWin: Prefab = null;
    @property(Prefab)
    protected jackpotGamePrefab: Prefab = null;
    @property(Prefab)
    protected bonusDialogPrefab: Prefab = null;

    @render(SlotBoardStore, (store) => store.receivedFreeSpins, { fireImmediately: false })
    async receivedFreeSpins(receivedFreeSpins: { freeSpins: any; duration: number }) {
        if (!receivedFreeSpins) {
            return;
        }
        try {
            const transtition = await this.playEffectTransition();
            const { duration } = receivedFreeSpins;
            AudioUtils.playSFX(AudioIds.FREESPIN);
            const effect = instantiate(this.effectFreeSpin);
            const animation = effect.getComponent(CallbackAnimation);
            animation.setDuration(duration);
            await this.showEffect(effect);
            transtition?.destroy();
        } catch (e) {}
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
            const effect = instantiate(this.effectBigWin);
            const callbackAnim = effect.getComponent(CallbackAnimation);
            callbackAnim.setDuration(duration);
            const bigWinAnimation = effect.getComponent(BigWinAnimation);
            bigWinAnimation.setAmount({ amount, duration: showBigWinValue, delayTime: delayShowBigWinValue });
            await this.showEffect(effect);
            transtition?.destroy();
        } catch (e) {}
    }

    @render(SlotBoardStore, (store) => store.receivedJackpot, { fireImmediately: false })
    async receivedJackpot(receivedJackpot: { jackpot: any; duration: number }) {
        if (!receivedJackpot) {
            return;
        }
        try {
            const { jackpot, duration } = receivedJackpot;
            const transtition = await this.playEffectTransition();
            AudioUtils.playSFX(AudioIds.JACKPOT_HIT);
            const effect = instantiate(this.effectJackpot);
            const animation = effect.getComponent(CallbackAnimation);
            animation.setDuration(duration);
            await this.showEffect(effect);
            transtition?.destroy();
            await this.showJackpotGame(jackpot.prizes);
        } catch (e) {}
    }

    protected showJackpotGame(prizes: number) {
        return new Promise<void>((resolve) => {
            const node = instantiate(this.jackpotGamePrefab);
            this.node.addChild(node);
            const dialog = node.getComponent(JackpotGame);
            dialog.prizes = prizes;
            dialog.initJackpotItems();
            dialog.onJackpotGameFinished = resolve;
        });
    }

    @render(SlotBoardStore, (store) => store.receivedBonus, { fireImmediately: false })
    async receivedBonus(receivedBonus: { bonus: any; duration: number }) {
        if (!receivedBonus) {
            return Promise.resolve();
        }
        try {
            const { bonus, duration } = receivedBonus;
            const transtition = await this.playEffectTransition();
            AudioUtils.playSFX(AudioIds.BONUS);
            const effect = instantiate(this.effectBonus);
            const animation = effect.getComponent(CallbackAnimation);
            animation.setDuration(duration);
            await this.showEffect(effect);
            AudioUtils.playSFX(AudioIds.BONUS_POPUP);
            this.showBonusDialog(bonus, () => {
                transtition?.destroy();
            });
        } catch (e) {}
    }

    showBonusDialog(bonus: any, onBonusFinished: () => void) {
        const node = instantiate(this.bonusDialogPrefab);
        this.node.addChild(node);
        const dialog = node.getComponent(BonusDialog);
        dialog.initBonusItems();
        dialog.setBonusCount(bonus);
        dialog.onBonusFinished = onBonusFinished;
    }

    protected async playEffectTransition() {
        if (!this.effectTransitionPrefab) {
            return null;
        }
        const effect = instantiate(this.effectTransitionPrefab);
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
