import { _decorator, Color, Component, Label, Node } from "cc";
import { ComponentUtils } from "db://shared-components/shared/utils";
import { Winner } from "../../handlers/stores/top-winners-store";
import { formatStringXMode } from "db://shared-common-slot/x-mode/scripts/utils/xMode-utils";
const { ccclass, property } = _decorator;

@ccclass
export default class SlotGameTopWinnerItem extends Component {
    @property(Node)
    bg: Node = null;

    @property(Label)
    time: Label = null;

    @property(Label)
    player: Label = null;

    @property(Label)
    amount: Label = null;

    @property(Label)
    win: Label = null;

    @property(Color)
    highlightColor: Color = null;

    setData(player: Winner, index: number) {
        const amountValue = Number(player.amountString.replace(/,/g, ""));
        const amountXMode = formatStringXMode(amountValue);
        this.bg.active = index % 2 > 0;
        this.time.string = player.time;
        this.player.string = player.name;        
        this.amount.string = amountValue > 0 ? amountXMode : player.amountString;
        this.win.string = formatStringXMode(player.winningAmount);
        if (player.highlight) {
            this.setTextColor(this.highlightColor ? this.highlightColor : Color.YELLOW);
        }
    }

    setTextColor(color: Color) {
        ComponentUtils.setNodeColor(this.time.node, color);
        ComponentUtils.setNodeColor(this.player.node, color);
        ComponentUtils.setNodeColor(this.amount.node, color);
        ComponentUtils.setNodeColor(this.win.node, color);
    }
}
