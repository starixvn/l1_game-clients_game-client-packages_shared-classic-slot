import { _decorator, Button, Color, Component, instantiate, Label, Node, Prefab, Toggle, ToggleContainer } from "cc";
import { ChangeNodeColor } from "db://shared-components/shared/common-components/change-node-color";
import BetLevelsContainer from "../bet-levels/bet-levels-container";

const { ccclass, property } = _decorator;

interface BottomAreaDefinedColor {
    textColor: string;
    numberColor: string;
    buttonBorderColor: string;
    winAmountColor: string;
}

@ccclass
export default class SlotBottomArea extends Component {
    @property(Toggle)
    autoSpinToggle: Toggle = null;

    @property(Toggle)
    turboToggle: Toggle = null;

    @property(Button)
    stakeButton: Button = null;

    @property(Button)
    lineButton: Button = null;

    @property(Label)
    stakeLabel: Label = null;

    @property(Label)
    lineLabel: Label = null;

    @property(Label)
    totalBet: Label = null;

    @property(Label)
    winningBet: Label = null;

    @property(Node)
    winningBetEffect: Node = null;

    @property(Node)
    betLevelsContainerNode: Node = null;

    @property(Prefab)
    betLevelsContainerPrefab: Prefab = null;

    private betLevelsContainer: BetLevelsContainer = null;

    stakeContainer: ToggleContainer = null;

    onClickListener = {
        onStakeButtonClick: () => {},
        onLineSelectionClick: () => {},
        onAutoSpinChanged: () => {},
        onHideStakeContainer: () => {},
        onTurboModeChanged: (toggle) => {},
        onStakeQuickChange: (event) => {},
        onStakeToggleChanged: (event, param) => {},
    };

    onLoad() {
        this.createBetLevelContainer();
    }

    setBetLevels(betLevels: number[]) {
        this.betLevelsContainer.setBetLevels(betLevels);
    }

    createBetLevelContainer() {
        const node = instantiate(this.betLevelsContainerPrefab);
        this.betLevelsContainerNode.addChild(node);

        this.betLevelsContainer = node.getComponent(BetLevelsContainer);
        this.stakeContainer = this.betLevelsContainer.containerNode.getComponent(ToggleContainer);
        this.betLevelsContainer.onClickListener = {
            onStakeToggleChanged: (event: Event, param: string) => {
                this.onClickListener.onStakeToggleChanged(event, param);
            },
            onHideStakeContainer: () => {
                this.onClickListener.onHideStakeContainer();
            },
        };
    }

    onStakeButtonClick() {
        this.onClickListener.onStakeButtonClick();
    }

    onLineSelectionClick() {
        this.onClickListener.onLineSelectionClick();
    }

    onAutoSpinChanged() {
        this.onClickListener.onAutoSpinChanged();
    }

    onTurboModeChanged(toggle: Toggle) {
        this.onClickListener.onTurboModeChanged(toggle);
    }

    onStakeQuickChange(event: Event) {
        this.onClickListener.onStakeQuickChange(event);
    }

    updateColor(colorList: BottomAreaDefinedColor) {
        const { textColor, numberColor, buttonBorderColor, winAmountColor } = colorList;

        this.getComponentsInChildren(ChangeNodeColor).forEach((comp) => {
            const labelComp = comp.node.getComponent(Label);
            if (labelComp) {
                comp.updateColor(comp.node.getComponent("LocalizedLabel") ? textColor : numberColor);
            } else {
                comp.updateColor(buttonBorderColor);
            }
        });

        this.winningBet.node.color = Color.WHITE.fromHEX(winAmountColor);
    }
}
