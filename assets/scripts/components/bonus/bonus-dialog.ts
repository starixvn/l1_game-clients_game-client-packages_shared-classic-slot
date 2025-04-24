import gc from "@sg/game-client-base";
import { _decorator, Button, instantiate, Label, Node, Prefab, Tween, tween } from "cc";
import RawTimer from "db://shared-components/game/game-timer/scripts/raw-timer";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import { SlotGameBaseConfigs } from "../../config/slot-game-base-configs";
import { SlotSettlementHandler } from "../../handlers/handlers/slot-settlement-handlers";
import { SlotBoardStore } from "../../handlers/stores/slot-board-store";
import { SlotDurationStore } from "../../handlers/stores/slot-duration-store";
import { initTimer } from "../../utils/classic-slot-utils";
import { ClassicSlotSound } from "../others/classic-slot-sound";
import BonusItem from "./bonus-item";
const { handle, render } = Observer;
const { ccclass, property } = _decorator;

@ccclass
export default class BonusDialog extends ObserverComponent {
    @property(Node)
    content: Node = null;

    @property(Label)
    bonusCount: Label = null;

    @property(RawTimer)
    timer: RawTimer = null;

    @property(Node)
    totalBonusNode: Node = null;

    @property(Label)
    totalBonusLabel: Label = null;

    @property(Prefab)
    bonusItem: Prefab = null;

    items: BonusItem[] = [];

    public onBonusFinished = () => {};
    public slotGameConfigs: SlotGameBaseConfigs;

    private totalBonus = 0;
    private openedBonus = 0;
    private totalValue = 0;
    private timerTween: Tween;
    private readonly bonusNumber = 10;

    public playSoundCallback = (type: ClassicSlotSound) => {};

    initBonusItems() {
        this.createBonusItems();
        this.content.children.forEach((child, index) => {
            const item = child.getComponent(BonusItem);
            item && this.items.push(item);
            child.on("click", () => {
                if (this.openedBonus < this.totalBonus) {
                    this.playSoundCallback(ClassicSlotSound.CLICK);
                    this.playBonusItemSound();
                    this.onItemClicked(index);
                    const button = child.getComponent(Button);
                    button.interactable = false;
                }
            });
        });
    }

    @handle(SlotSettlementHandler, (handler, index: number) => handler.requestOpenBonus(index))
    protected onItemClicked(index: number) {
        return index;
    }

    playBonusItemSound() {
        //empty
    }

    createBonusItems() {
        if (!this.bonusItem) {
            return;
        }

        this.content.destroyAllChildren();

        for (let i = 0; i < this.bonusNumber; i++) {
            const item = instantiate(this.bonusItem);
            item.name = `bonus${i}`;
            this.content.addChild(item);
        }
    }

    @render(SlotDurationStore, (store) => store.config)
    renderConfig(config: SlotGameBaseConfigs) {
        this.slotGameConfigs = config;
    }

    @render(SlotBoardStore, (store) => store.bonusChest, { fireImmediately: false })
    openBonus(bonusChest: { chest: number; amount: number }) {
        if (!bonusChest) {
            return;
        }
        const { chest, amount } = bonusChest;
        const item = this.items[chest];
        item && item.open(amount);
        this.openedBonus++;
        this.totalValue += amount;
        this.updateBonusCount();
        this.checkFinishBonus();
    }

    hideTimer() {
        this.timer.node.active = false;
        this.timerTween.stop();
    }

    showTotalAmount() {
        this.playSoundCallback(ClassicSlotSound.BONUS_TOTAL);
        //TODO: fix
        // FunctionUtils.playSFX(this.soundBigWin.clip);
        this.hideTimer();
        this.totalBonusNode.active = true;
        this.totalBonusLabel.string = `+${gc.FormatUtils.numberWithCommas(this.totalValue, 2)}`;
    }

    checkFinishBonus() {
        if (this.openedBonus === this.totalBonus) {
            const delayTime = 1;
            tween(this)
                .delay(delayTime)
                .call(() => this.showTotalAmount())
                .delay(this.showTotalBonusWinTime(delayTime))
                .call(() => {
                    this.onBonusFinished();
                    this.node.destroy();
                })
                .start();
        }
    }

    showTotalBonusWinTime(delayTime: number): number {
        return this.slotGameConfigs.showTotalBonusAmountDuration - delayTime;
    }

    setBonusCount(count: number) {
        this.totalBonus = count;
        this.updateBonusCount();
    }

    updateBonusCountItemTextColor(color: string) {
        ComponentUtils.setNodeColor(this.bonusCount.node, color);
    }

    updateBonusCount() {
        this.bonusCount.string = `${this.totalBonus - this.openedBonus}`;
    }

    start() {
        const duration = this.slotGameConfigs.bonusTimeOut;
        this.timerTween = initTimer(this.timer, duration, this.hideTimer.bind(this));
    }
}
