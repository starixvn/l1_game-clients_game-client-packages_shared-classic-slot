import { _decorator } from "cc";
import { NodeContainer } from "db://shared-components/shared/common-components/node-container/node-container";
import Observer from "observer";
import { BetControlStore } from "../../handlers";
const { ccclass, property } = _decorator;
const { render } = Observer;

@ccclass
export default class LineSelectionContainer extends NodeContainer {
    @render(BetControlStore, (store) => store.showLineSelection)
    protected renderWinningLine(showLineSelection: any) {
        if (showLineSelection) {
            this.createNode();
        }
    }
}
