import { _decorator, Button, instantiate, Node, Prefab, Tween } from "cc";
import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import RawTimer from "db://shared-components/game/game-timer/scripts/raw-timer";
import { bundleManager } from "db://shared-components/shared/common-components/bundle-manager/bundle-manager";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { AnimationUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import { CustomDuration, SlotGameBaseConfigs } from "../../config/slot-game-base-configs";
import { SlotSettlementHandler } from "../../handlers";
import { SlotBoardStore } from "../../handlers/stores/slot-board-store";
import { SlotDurationStore } from "../../handlers/stores/slot-duration-store";
import { initTimer } from "../../utils/classic-slot-utils";
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
    jackpotWinningAmountPrefab: Prefab = null;

    items: JackpotGameItem[] = [];

    protected jackpotItem: Prefab = null;
    public onJackpotGameFinished = () => { };
    public prizes = 0;
    protected slotGameConfigs: SlotGameBaseConfigs;
    private configDuration: CustomDuration;
    private timerTween: Tween;
    private spinTime = 0;

    private showing = false;
    private hasInterruption = false;

    @render(SlotBoardStore, (store) => store.hasInterruption)
    renderHasInterruption(hasInterruption: boolean) {
        this.hasInterruption = hasInterruption;
        if (hasInterruption) {
            if (this.showing) {
                this.onFinishJackpotGame();
            }
        }
    }

    @handle(SlotSettlementHandler, (handler, index: number) => handler.requestOpenJackpot(index))
    onItemClicked(index: number) {
        return index;
    }

    async loadPrefabJackpotItem() {
        const path = `prefabs/dialogs/jackpot-item`;
        this.jackpotItem = await bundleManager.loadResourcesAsset<Prefab>(path, Prefab);
    }

    async initJackpotItems() {
        try {
            await this.loadPrefabJackpotItem();
            this.createJackpotItems();
            this.content.children.forEach((child, index) => {
                const item = child.getComponent(JackpotGameItem);
                item && this.items.push(item);

                child.on("click", () => {
                    AudioUtils.playSFX(AudioIds.JACKPOT_ITEM);
                    this.onItemClicked(index);
                    item.open();
                    this.items.forEach((item) => {
                        const button = item.getComponent(Button);
                        button.interactable = false;
                    });
                });
            });
        } catch (error) { }
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

    @render(SlotBoardStore, (store) => store.spinTime)
    renderSpinTime(spinTime: number) {
        this.spinTime = spinTime;
    }

    @render(SlotDurationStore, (store) => store.configDuration)
    renderConfigDuration(configDuration: CustomDuration) {
        this.configDuration = configDuration;
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
        AudioUtils.playSFX(AudioIds.JACKPOT_WIN);
        this.hideTimer();
        this.winningNode.active = true;
    }

    async checkFinishJackpot() {
        try {
            this.showJackpotWin();
            await AnimationUtils.delayTime(this.slotGameConfigs.showJackpotWinningAmountDuration);
            this.onFinishJackpotGame();
        } catch (error) {
            console.log(error);
        }
    }

    private onFinishJackpotGame() {
        this.onJackpotGameFinished();
        this.hideTimer();
        this.node.destroy();
    }

    show() {
        const oldSpinDuration = 5;
        const spinTime = this.spinTime + this.configDuration.jackpotDuration;
        const calculateDuration = this.slotGameConfigs.jackpotTimeOut + oldSpinDuration - spinTime;
        const duration = Math.min(calculateDuration, this.slotGameConfigs.jackpotTimeOut);
        this.timerTween = initTimer(this.timer, duration, this.hideTimer.bind(this));
        this.showing = true;
        if (this.hasInterruption) {
            this.onFinishJackpotGame();
        }
    }
}
