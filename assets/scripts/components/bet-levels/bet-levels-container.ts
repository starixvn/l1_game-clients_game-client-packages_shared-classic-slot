import { _decorator, instantiate, Node, Prefab, tween, v3 } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { AnimationUtils, ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import { BetControlStore } from "../../handlers/stores/bet-control-store";
import BetLevelItem from "./bet-level-item";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;
@ccclass
export default class BetLevelsContainer extends ObserverComponent {
    @property(Prefab)
    itemPrefab: Prefab = null;

    @property(Node)
    containerNode: Node = null;

    private betLevels: number[] = [];
    private readonly itemHeight = 60;
    private readonly itemsOfColumnMax = 5;

    onClickListener = {
        onStakeToggleChanged: (event, param) => {},
        onHideStakeContainer: () => {},
    };

    onLoad() {
        this.containerNode.destroyAllChildren();
        super.onLoad();
    }

    @render(BetControlStore, (store) => store.betLevels)
    setBetLevels(betLevels: number[]) {
        if (betLevels.length <= 0) {
            return;
        }
        betLevels.sort((a, b) => a - b);
        this.betLevels = betLevels;
        this.initBetLevelItems();
        this.calculateContainerHeight();
    }

    protected initBetLevelItems() {
        this.betLevels.forEach((value, index) => {
            const node = instantiate(this.itemPrefab);
            this.containerNode.addChild(node);

            const itemComp = node.getComponent(BetLevelItem);
            itemComp.setData(`${value}`, index);
            itemComp.onStakeChanged = (param: number) => {
                this.onStakeToggleChanged(param);
            };
        });
    }

    protected calculateContainerHeight() {
        let height = 0;
        if (this.betLevels.length >= this.itemsOfColumnMax) {
            height = this.itemsOfColumnMax * this.itemHeight + (this.itemsOfColumnMax + 1) * 10;
        } else {
            height = this.betLevels.length * this.itemHeight + (this.betLevels.length + 1) * 10;
        }

        ComponentUtils.setNodeTransform(this.containerNode, { height });
    }

    protected onHideBetLevelContainer() {
        this.hide();
    }

    protected hide() {
        const duration = 0.2;
        AnimationUtils.fadeOut(this.node, duration);
        tween(this.node)
            .to(duration, { scale: v3(1, 0, 0) })
            .call(() => {
                this.node.active = false;
            })
            .start();
    }

    protected onStakeToggleChanged(index: number) {
        this.setStake(this.betLevels[index]);
    }

    @handle(BetControlStore, (store, stake: number) => store.setStake(stake))
    setStake(stake: number) {
        return stake;
    }
}
