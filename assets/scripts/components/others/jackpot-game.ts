import { _decorator, Button, instantiate, Node, Prefab, Tween } from "cc";
import RawTimer from "db://shared-components/game/game-timer/scripts/raw-timer";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { AnimationUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import { SlotGameBaseConfigs } from "../../config/slot-game-base-configs";
import { SlotSettlementHandler } from "../../handlers";
import { SlotBoardStore } from "../../handlers/stores/slot-board-store";
import { SlotDurationStore } from "../../handlers/stores/slot-duration-store";
import { initTimer } from "../../utils/classic-slot-utils";
import { ClassicSlotSound } from "./classic-slot-sound";
import JackpotGameItem from "./jackpot-game-item";
import JackpotWinningAmount from "./jackpot-winning-amount";
const { handle, render } = Observer;

const { ccclass, property } = _decorator;

interface IWinningJackpot {
    winnerName: string;
    pool: string;
    amount: number;
}
@ccclass
export default class JackpotGame extends ObserverComponent {
    @property(Node)
    content: Node = null;

    @property(RawTimer)
    timer: RawTimer = null;

    @property(Node)
    winningNode: Node = null;

    @property(Prefab)
    jackpotItem: Prefab = null;

    @property(Prefab)
    jackpotWinningAmountPrefab: Prefab = null;

    items: JackpotGameItem[] = [];

    public onJackpotGameFinished = () => {};
    protected slotGameConfigs: SlotGameBaseConfigs;
    private timerTween: Tween;
    prizes = 0;
    public playSoundCallback = (type: ClassicSlotSound) => {};

    @handle(SlotSettlementHandler, (handler, index: number) => handler.requestOpenJackpot(index))
    onItemClicked(index: number) {
        return index;
    }

    initJackpotItems() {
        this.createJackpotItems();
        this.content.children.forEach((child, index) => {
            const item = child.getComponent(JackpotGameItem);
            item && this.items.push(item);

            child.on("click", () => {
                this.playSoundCallback(ClassicSlotSound.CLICK);
                this.playJackpotItemSound();
                this.onItemClicked(index);
                item.open();
                this.items.forEach((item) => {
                    const button = item.getComponent(Button);
                    button.interactable = false;
                });
            });
        });
    }

    playJackpotItemSound() {
        this.playSoundCallback(ClassicSlotSound.JACKPOT_ITEM);
    }

    createJackpotItems() {
        if (!this.jackpotItem) {
            return;
        }

        this.content.destroyAllChildren();

        for (let i = 0; i < this.prizes; i++) {
            const item = instantiate(this.jackpotItem);
            item.name = `jackpot-${i}`;
            this.content.addChild(item);
        }
    }

    @render(SlotDurationStore, (store) => store.config)
    renderConfig(config: SlotGameBaseConfigs) {
        this.slotGameConfigs = config;
    }

    @render(SlotBoardStore, (store) => store.winningJackpot, { fireImmediately: false })
    async openJackpot(data: IWinningJackpot) {
        if (!data) {
            return;
        }
        try {
            const delayTime = 1;
            await AnimationUtils.delayTime(delayTime);
            this.initJackpotWinningAmount(data, delayTime);
            this.checkFinishJackpot();
        } catch (error) {
            console.log("open jackpot error");
        }
    }

    async initJackpotWinningAmount(data: IWinningJackpot, delayTime: number) {
        if (!this.jackpotWinningAmountPrefab) {
            return;
        }

        const winningAmount = instantiate(this.jackpotWinningAmountPrefab);
        this.winningNode.addChild(winningAmount);

        const { amount, pool } = data;
        const jackpotWinningAmount = winningAmount.getComponent(JackpotWinningAmount);

        jackpotWinningAmount.setAmount({
            amount: amount,
            duration: this.slotGameConfigs.showJackpotWinningAmountDuration - delayTime,
        });
        jackpotWinningAmount.loadPoolSprite(pool);
    }

    hideTimer() {
        this.timer.node.active = false;
        this.timerTween.stop();
    }

    showJackpotWin() {
        this.playSoundCallback(ClassicSlotSound.JACKPOT_WIN);
        this.hideTimer();
        this.winningNode.active = true;
    }

    async checkFinishJackpot() {
        try {
            this.showJackpotWin();
            await AnimationUtils.delayTime(this.slotGameConfigs.showJackpotWinningAmountDuration);
            this.onJackpotGameFinished();
            this.node.destroy();
        } catch (error) {
            console.log(error);
        }
    }

    start() {
        const duration = this.slotGameConfigs.jackpotTimeOut;
        this.timerTween = initTimer(this.timer, duration, this.hideTimer.bind(this));
    }
}
