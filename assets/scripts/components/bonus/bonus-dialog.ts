import gc from "@sg/game-client-base";
import { _decorator, Button, instantiate, Label, Node, Prefab, Tween, tween } from "cc";
import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import RawTimer from "db://shared-components/game/game-timer/scripts/raw-timer";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import { CustomDuration, SlotGameBaseConfigs } from "../../config/slot-game-base-configs";
import { SlotSettlementHandler } from "../../handlers/handlers/slot-settlement-handlers";
import { SlotBoardStore } from "../../handlers/stores/slot-board-store";
import { SlotDurationStore } from "../../handlers/stores/slot-duration-store";
import { initTimer, resourceCaches } from "../../utils/classic-slot-utils";
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

    public onBonusFinished = () => { };
    public slotGameConfigs: SlotGameBaseConfigs;
    private configDuration: CustomDuration;
    private receivedJackpot = false;
    private totalBonus = 0;
    private openedBonus = 0;
    private totalValue = 0;
    private timerTween: Tween;
    private readonly bonusNumber = 10;
    private spinTime = 0;

    private showing = false;
    private hasInterruption = false;

    @render(SlotBoardStore, (store) => store.hasInterruption)
    renderHasInterruption(hasInterruption: boolean) {
        this.hasInterruption = hasInterruption;
        if (hasInterruption) {
            if (this.showing) {
                this.onFinishBonusDialog();
            }
        }
    }

    initBonusItems() {
        this.createBonusItems();
        this.content.children.forEach((child, index) => {
            const item = child.getComponent(BonusItem);
            item && this.items.push(item);
            child.on("click", () => {
                if (this.openedBonus < this.totalBonus) {
                    AudioUtils.playSFX(AudioIds.BONUS_ITEM);
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

    @render(SlotDurationStore, (store) => store.configDuration)
    renderConfigDuration(configDuration: CustomDuration) {
        this.configDuration = configDuration;
    }

    @render(SlotBoardStore, (store) => store.spinTime)
    renderSpinTime(spinTime: number) {
        this.spinTime = spinTime;
    }

    @render(SlotBoardStore, (store) => store.receivedJackpot)
    renderReceivedJackpot(receivedJackpot: any) {
        this.receivedJackpot = receivedJackpot !== null;
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
        AudioUtils.playSFX(AudioIds.BONUS_TOTAL);
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
                    this.onFinishBonusDialog();
                })
                .start();
        }
    }

    private onFinishBonusDialog() {
        this.onBonusFinished();
        this.hideTimer();
        this.node.destroy();
    }

    showTotalBonusWinTime(delayTime: number): number {
        return this.slotGameConfigs.showTotalBonusAmountDuration - delayTime;
    }

    setBonusCount(count: number) {
        this.totalBonus = count;
        this.updateBonusCount();
        this.updateBonusCountItemTextColor(resourceCaches.colorJson.bonusCountItemTextColor);
    }

    updateBonusCountItemTextColor(color: string) {
        ComponentUtils.setNodeColor(this.bonusCount.node, color);
    }

    updateBonusCount() {
        this.bonusCount.string = `${this.totalBonus - this.openedBonus}`;
    }

    show() {
        const oldSpinDuration = 5;
        const spinAndBonusDuration = this.receivedJackpot
            ? this.configDuration.bonusDuration
            : this.spinTime + this.configDuration.bonusDuration;
        const calculateDuration = this.slotGameConfigs.bonusTimeOut + oldSpinDuration - spinAndBonusDuration;
        const duration = Math.min(calculateDuration, this.slotGameConfigs.bonusTimeOut);
        this.timerTween = initTimer(this.timer, duration, this.hideTimer.bind(this));
        this.showing = true;
        if (this.hasInterruption) {
            this.onFinishBonusDialog();
        }
    }
}
