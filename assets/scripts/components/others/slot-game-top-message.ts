import { _decorator, Component, Label, macro } from "cc";
import { ChangeNodeColor } from "db://shared-components/shared/common-components/change-node-color";
import * as _ from "lodash-es";
export enum RoundType {
    BEFORESPIN = 0,
    SPINNING = 1,
    SETTLED = 2,
}

const { ccclass, property } = _decorator;

@ccclass
export default class SlotGameTopMessage extends Component {
    @property(Label)
    msg3: Label = null;

    onLoad() {
        this.schedule(this.updateTopMessage, 5, macro.REPEAT_FOREVER, 0);
    }

    updateMsgHaveMaxWin(value: number) {
        //TODO: fix
        // this.msg3.string = i18n.t("messages.topMessage3", { maxWin: value });
    }

    updateTopMessage() {
        this.node.children.forEach((child) => {
            child.active = false;
        });
        const items = [1, 2, 3];
        const item = items[_.random(items.length - 1)];
        this.node.children[item - 1].active = true;
    }

    showTopMessage() {
        this.node.active = true;
    }

    hideTopMessage() {
        this.node.active = false;
    }

    updateColor(textColor: string) {
        this.getComponentsInChildren(ChangeNodeColor).forEach((comp) => {
            comp.updateColor(textColor);
        });
    }
}
