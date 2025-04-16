import { _decorator, Component, instantiate, Node, Prefab } from "cc";
import { ComponentUtils } from "db://shared-components/shared/utils";
import BetLevelItem from "./bet-level-item";
const { ccclass, property } = _decorator;

@ccclass
export default class BetLevelsContainer extends Component {
    @property(Prefab)
    stakeLevelItemPrefab: Prefab = null;

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
    }

    setBetLevels(betLevels: number[]) {
        if (betLevels.length <= 0) {
            return;
        }
        betLevels.sort((a, b) => a - b);
        this.betLevels = betLevels;
        this.initBetLevelItems();
        this.calculateContainerHeight();
    }

    initBetLevelItems() {
        this.betLevels.forEach((value, index) => {
            const node = instantiate(this.stakeLevelItemPrefab);
            this.containerNode.addChild(node);

            const itemComp = node.getComponent(BetLevelItem);
            itemComp.setData(`${value}`, index);
            itemComp.onClickListener = {
                onStakeToggleChanged: (event: Event, param: string) => {
                    this.onClickListener.onStakeToggleChanged(event, param);
                },
            };
        });
    }

    private calculateContainerHeight() {
        let height = 0;
        if (this.betLevels.length >= this.itemsOfColumnMax) {
            height = this.itemsOfColumnMax * this.itemHeight + (this.itemsOfColumnMax + 1) * 10;
        } else {
            height = this.betLevels.length * this.itemHeight + (this.betLevels.length + 1) * 10;
        }

        ComponentUtils.setNodeTransform(this.containerNode, { height });
    }

    onHideBetLevelContainer() {
        this.onClickListener.onHideStakeContainer();
    }
}
