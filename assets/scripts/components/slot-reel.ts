import _ = require("lodash");
import { _decorator, Component, instantiate, Layout, Node, Prefab, Tween, tween, v2 } from "cc";
import GameUtils from "../../common/GameUtils";
import { SlotGameBaseConfigs, SpecialSymbol } from "./slot-game-base-configs";
import SlotReelItem from "./SlotReelItem";

const { ccclass, property } = _decorator;

@ccclass
export default class SlotReel extends Component {
    itemCount = 18;

    @property(Prefab)
    itemPrefab: Prefab = null;

    @property
    itemDisplayCount = 3;

    items: SlotReelItem[] = [];

    public slotGameConfig: SlotGameBaseConfigs;
    public winningContainer: Node;
    private layout: Layout;
    private itemHeight = 0;
    private spacingY = 0;
    public gameId: number;

    private initialized = false;
    onLoad() {
        this.init();
    }

    private init() {
        this.layout = this.node.getComponent(Layout);
        this.spacingY = this.layout.spacingY;
        this.initialized = true;
    }

    createReel() {
        if (!this.initialized) {
            this.init();
        }
        for (let i = 0; i < this.itemCount; i++) {
            const node = instantiate(this.itemPrefab);
            this.node.addChild(node);
            const item = node.getComponent(SlotReelItem);
            item.gameId = this.gameId;
            this.items.push(item);
            const random = _.random(this.slotGameConfig.itemTypeCount - 1);
            item.setItem(random);
        }

        this.itemHeight = this.items[0].node.height;
        this.layout.updateLayout();
        this.layout.enabled = false;
    }

    setReelData(items: number[]) {
        items.forEach((row, index) => {
            this.getItemTop(index).setItem(row);
            this.getItemBottom(index).setItem(row);
        });
    }

    getMovingOffset(): number {
        const offsetHeight = 3 * this.itemHeight + 2 * this.spacingY;
        return -(this.node.height - offsetHeight);
    }

    spinWithData(spinDuration = 1, data: number[], turbo: boolean) {
        return new Promise<void>((resolve) => {
            const offset = this.getMovingOffset();

            tween(this.node)
                .delay(this.getChangeDataDelayTime(spinDuration))
                .call(() => this.setReelData(data))
                .start();
            this.playSpinAnim(turbo, spinDuration, offset, resolve);
            this.checkBlurSymbol(turbo);
        });
    }
    checkBlurSymbol(turbo: boolean) {
        !turbo ? this.blurSymbols() : this.normalSymbols();
    }

    protected playSpinAnim(turbo: boolean, spinDuration: number, offset: number, onReelStopped: () => void) {
        tween(this.node)
            .to(spinDuration, { position: v2(this.node.x, offset) }, { easing: (dt) => easeInOut(3).easing(dt) })
            .call(() => {
                this.onSpinFinish();
                onReelStopped();
            })
            .start();
    }

    getChangeDataDelayTime(spinDuration: number): number {
        return 0.2 * spinDuration;
    }

    protected blurSymbols() {
        // empty
    }

    protected normalSymbols() {}

    stop() {
        Tween.stopAllByTarget(this.node);
        this.onSpinFinish();
    }

    onSpinFinish() {
        for (let i = 0; i < this.itemDisplayCount; i++) {
            const bottomItem = this.getItemBottom(i);
            const topItem = this.getItemTop(i);
            bottomItem.setItem(topItem.index);
        }
        this.node.y = 0;
    }

    getItemBottom(index: number) {
        return this.items[this.itemCount + index - this.itemDisplayCount];
    }

    getItemTop(index: number) {
        return this.items[index];
    }

    showWinningEffect(index: number, symbol: number) {
        const item = this.getItemBottom(index);
        const itemCopy = this.getItemTop(index);
        const highlight = item.index === symbol || (item.index === SpecialSymbol.WILD && symbol !== SpecialSymbol.JACKPOT);
        item.showWinningEffect(highlight);
        itemCopy.showWinningEffect(highlight);
        GameUtils.moveToOtherNode(item.node, this.winningContainer);
    }

    hideWinningEffect() {
        this.items.forEach((item) => {
            GameUtils.moveToOtherNode(item.node, this.node);
            item.showWinningEffect(false);
        });
    }

    showHighlightSpecialSymbols(symbol: number) {
        for (let i = 0; i < this.itemDisplayCount; i++) {
            const item = this.getItemBottom(i);
            if (item.index === symbol) {
                GameUtils.moveToOtherNode(item.node, this.winningContainer);
                item.showWinningEffect(true);
                break;
            }
        }
    }
}
