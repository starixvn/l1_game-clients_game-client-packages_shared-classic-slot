import { _decorator, Button, Component, instantiate, Node, Prefab, Sprite, Tween } from "cc";
import RawTwoDigitsTimer from "db://shared-components/game/game-timer/scripts/raw-two-digits-timer";
import { AnimationUtils } from "db://shared-components/shared/utils";
import { ClassicSlotSound } from "./classic-slot-sound";
import JackpotGameItem from "./JackpotGameItem";
import JackpotWinningAmount from "./JackpotWinningAmount";
import { StandardSlotGameConfigs } from "./StandardSlotGameConfigs";

const { ccclass, property } = _decorator;

interface IWinningJackpot {
    winnerName: string;
    pool: string;
    amount: number;
}
@ccclass
export default class JackpotGame extends Component {
    @property(Node)
    content: Node = null;

    @property(RawTwoDigitsTimer)
    timer: RawTwoDigitsTimer = null;

    @property(Node)
    winningNode: Node = null;

    @property(Prefab)
    jackpotItem: Prefab = null;

    @property(Prefab)
    jackpotWinningAmountPrefab: Prefab = null;

    @property(Sprite)
    sprTitle: Sprite = null;

    items: JackpotGameItem[] = [];

    public onJackpotGameFinished = () => {};
    public onItemClicked = (index: number) => {};
    public slotGameConfigs: StandardSlotGameConfigs;
    private timerTween: Tween;
    prizes = 0;
    public playSoundCallback = (type: ClassicSlotSound) => {};

    onLoad() {
        this.loadTitleJackpot();
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

    async openJackpot(data: IWinningJackpot) {
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
            amount: GameUtils.getValueByCurrency(amount),
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
            await GameUtils.delayTime(this.slotGameConfigs.showJackpotWinningAmountDuration);
            this.onJackpotGameFinished();
            this.node.destroy();
        } catch (error) {
            console.log(error);
        }
    }

    start() {
        const duration = this.slotGameConfigs.jackpotTimeOut;
        this.timerTween = GameUtils.initSlotCountDownTimer(this.timer, duration, this.hideTimer.bind(this));
    }

    async loadTitleJackpot() {
        try {
            const title = `jackpot-title-${window.i18n.curLang}`;
            const frame = await GameUtils.loadResourceAsset<SpriteFrame>(`shared/slot-game/textures/jackpot/${title}`, SpriteFrame);
            this.sprTitle.spriteFrame = frame;
        } catch (error) {
            console.log("Failed to load jackpot title image");
        }
    }
}
