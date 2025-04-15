import { _decorator, AudioSource, Button, Component, instantiate, Label, Node, Prefab, Tween, tween } from "cc";
import { ComponentUtils } from "db://shared-components/shared/utils";
import AnimatedTime from "../../common/animated-time/view-models/AnimatedTime";
import AudioManager from "../../common/audio/AudioManager";
import { numberWithCommas } from "../../common/helpers/NumberHelper";
import BonusItem from "./BonusItem";
import { ClassicSlotSound } from "./ClassicSlotSound";
import { SlotGameBaseConfigs } from "./SlotGameBaseConfigs";
const { ccclass, property } = _decorator;

@ccclass
export default class BonusDialog extends Component {
    @property(Node)
    content: Node = null;

    @property(Label)
    bonusCount: Label = null;

    @property(AnimatedTime)
    timer: AnimatedTime = null;

    @property(Node)
    totalBonusNode: Node = null;

    @property(Label)
    totalBonusLabel: Label = null;

    @property({ type: AudioSource })
    soundBigWin: AudioSource = null;

    @property(Prefab)
    bonusItem: Prefab = null;

    protected _gameId;
    public set gameId(value: number) {
        this._gameId = value;
        this.initBonusItems();
    }
    public get gameId(): number {
        return this._gameId;
    }

    items: BonusItem[] = [];

    public onBonusFinished = () => {};
    public onItemClicked = (index: number) => {};
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

    openBonus(index: number, value: number) {
        const item = this.items[index];
        item && item.open(value);
        this.openedBonus++;
        this.totalValue += value;
        this.updateBonusCount();
        this.checkFinishBonus();
    }

    hideTimer() {
        this.timer.node.active = false;
        this.timerTween.stop();
    }

    showTotalAmount() {
        this.playSoundCallback(ClassicSlotSound.BONUS_TOTAL);
        if (this.soundBigWin) {
            AudioManager.getInstance().playSFX(this.soundBigWin.clip);
        }
        this.hideTimer();
        this.totalBonusNode.active = true;
        this.totalBonusLabel.string = `+${numberWithCommas(this.totalValue, 2)}`;
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
        // this.timerTween = GameUtils.initSlotCountDownTimer(this.timer, duration, this.hideTimer.bind(this));
    }
}
