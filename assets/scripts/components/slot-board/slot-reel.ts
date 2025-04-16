import { _decorator, Component, instantiate, Layout, Node, Prefab, Tween, tween, v3 } from "cc";
import { ComponentUtils } from "db://shared-components/shared/utils/component-utils";
import { AnimationUtils } from "db://shared-components/shared/utils/utils";
import * as _ from "lodash-es";
import { getSlotGameConfigs, globalEmitter, InternalEvents } from "../../utils/classic-slot-utils";
import { SpecialSymbol } from "../config/slot-game-base-configs";
import { ClassicSlotSound } from "../others/classic-slot-sound";
import SlotReelItem from "./slot-reel-item";

const { ccclass, property } = _decorator;

@ccclass
export default class SlotReel extends Component {
    itemCount = 18;

    @property(Prefab)
    itemPrefab: Prefab = null;

    @property
    itemDisplayCount = 3;

    items: SlotReelItem[] = [];

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
        const slotGameConfig = getSlotGameConfigs();
        for (let i = 0; i < this.itemCount; i++) {
            const node = instantiate(this.itemPrefab);
            this.node.addChild(node);
            const item = node.getComponent(SlotReelItem);
            item.gameId = this.gameId;
            this.items.push(item);
            const random = _.random(slotGameConfig.itemTypeCount - 1);
            item.setItem(random);
        }

        const transform = ComponentUtils.getTransform(this.items[0].node);
        this.itemHeight = transform.height;
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
        const transform = ComponentUtils.getTransform(this.node);
        return -(transform.height - offsetHeight);
    }
    checkBlurSymbol(turbo: boolean) {
        !turbo ? this.blurSymbols() : this.normalSymbols();
    }

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
        this.node.position = v3(this.node.position.x, 0);
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
        ComponentUtils.moveToOtherNode(item.node, this.winningContainer);
    }

    hideWinningEffect() {
        this.items.forEach((item) => {
            ComponentUtils.moveToOtherNode(item.node, this.node);
            item.showWinningEffect(false);
        });
    }

    showHighlightSpecialSymbols(symbol: number) {
        for (let i = 0; i < this.itemDisplayCount; i++) {
            const item = this.getItemBottom(i);
            if (item.index === symbol) {
                ComponentUtils.moveToOtherNode(item.node, this.winningContainer);
                item.showWinningEffect(true);
                break;
            }
        }
    }

    itemCountPerReel = 24;

    blurSymbols() {
        this.items.forEach((item, index) => {
            if (index < 4 || index >= this.itemCount - 4) {
                item.handleBlurAnim(false);
            } else {
                item.handleBlurAnim(true);
            }
        });
    }

    normalSymbols() {
        this.items.forEach((item) => {
            item.handleBlurAnim(false);
        });
    }

    getChangeDataDelayTime(spinDuration: number): number {
        return 0.4 * spinDuration;
    }

    spinWithData(spinDuration: number, data: number[], turbo: boolean) {
        if (!turbo) {
            spinDuration = (spinDuration * this.itemCount) / this.itemCountPerReel;
        }
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

    playSpinAnimTurbo(spinDuration: number, offset: number, onReelStopped: () => void) {
        tween(this.node)
            .to(spinDuration, { position: v3(this.node.position.x, offset) }, { easing: AnimationUtils.easeInOut(3) })
            .call(() => {
                this.onSpinFinish();
                onReelStopped();
            })
            .start();
    }
    playSpinAnim(turbo: boolean, spinDuration: number, offset: number, onReelStopped: () => void) {
        if (!turbo) {
            const moveDownDuration = 0.25;
            const moveUpDuration = 0.35;
            const normalSpinDuration = spinDuration - moveUpDuration - moveDownDuration;

            tween(this.node)
                .to(moveDownDuration, { position: v3(this.node.position.x, -300) }, { easing: "backIn" })
                .to(normalSpinDuration, { position: v3(this.node.position.x, offset + 300) })
                .parallel(
                    tween().to(moveUpDuration, { position: v3(this.node.position.x, offset) }, { easing: "backOut" }),
                    tween()
                        .delay(0.15)
                        .call(() => {
                            globalEmitter.emit(InternalEvents.SLOT_PLAY_SOUND, ClassicSlotSound.REEL_STOP);
                        })
                )

                .call(() => {
                    this.onSpinFinish();
                    onReelStopped();
                })
                .start();
        } else {
            this.playSpinAnimTurbo(spinDuration, offset, onReelStopped);
        }
    }
}
