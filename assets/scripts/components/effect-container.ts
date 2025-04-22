import { _decorator, instantiate, Node, Prefab } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { paylines } from "../definitions";
import { SlotBoardStore } from "../handlers/stores/slot-board-store";
import BonusDialog from "./bonus/bonus-dialog";
import CallbackAnimation from "./callback-animation/callback-animation";
import JackpotGame from "./others/jackpot-game";
import SlotBoard from "./slot-board/slot-board";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;
@ccclass
export default class EffectContainer extends ObserverComponent {
    @property(SlotBoard)
    slotBoard: SlotBoard = null;

    @property(Node)
    lineContainer: Node = null;

    protected effectTransitionPrefab: Prefab = null;
    protected effectJackpot: Prefab = null;
    protected effectBonus: Prefab = null;
    protected effectFreeSpin: Prefab = null;
    protected jackpotGamePrefab: Prefab = null;
    protected bonusDialogPrefab: Prefab = null;

    @render(SlotBoardStore, (store) => store.receivedJackpot)
    async receivedJackpot(receivedJackpot: { jackpot: any; duration: number }) {
        if (!receivedJackpot) {
            return;
        }
        const { jackpot, duration } = receivedJackpot;
        // this.playSound(ClassicSlotSound.JACKPOT);
        this.showLine(jackpot.winningLine + 1);
        this.slotBoard.showWinningEffect(paylines[jackpot.winningLine], jackpot.symbol);
        const transtition = await this.playEffectTransition();
        const effect = instantiate(this.effectJackpot);
        const animation = effect.getComponent(CallbackAnimation);
        animation.setDuration(duration);
        await this.showEffect(effect);
        transtition?.destroy();
        await this.showJackpotGame(jackpot.prizes);
    }

    protected showJackpotGame(prizes: number) {
        return new Promise<void>((resolve) => {
            const node = instantiate(this.jackpotGamePrefab);
            this.node.addChild(node);
            const dialog = node.getComponent(JackpotGame);
            dialog.prizes = prizes;
            dialog.initJackpotItems();
            // dialog.playSoundCallback = this.bonusDialogPlaySound.bind(this);
            dialog.onJackpotGameFinished = resolve;
        });
    }

    @render(SlotBoardStore, (store) => store.receivedBonus)
    async receivedBonus(receivedBonus: { bonus: any; duration: number }) {
        if (!receivedBonus) {
            return;
        }
        const { bonus, duration } = receivedBonus;
        // this.playSound(ClassicSlotSound.BONUS);
        return new Promise<void>(async (resolve, reject) => {
            const effect = instantiate(this.effectBonus);
            const animation = effect.getComponent(CallbackAnimation);
            animation.setDuration(duration);
            await this.showEffect(effect);
            this.showBonusDialog(bonus, resolve);
        });
    }

    showBonusDialog(bonus: any, onBonusFinished: () => void) {
        const node = instantiate(this.bonusDialogPrefab);
        this.node.addChild(node);
        const dialog = node.getComponent(BonusDialog);
        // dialog.gameId = this.gameId;
        // dialog.playSoundCallback = this.bonusDialogPlaySound.bind(this);
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

        // this.playSound(ClassicSlotSound.TRANSITION);
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

    showLine(num: number, show = true) {
        const line = this.lineContainer.getChildByName(`${num}`);
        if (line) {
            line.active = show;
        }
    }
}
