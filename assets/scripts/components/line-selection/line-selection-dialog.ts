import { _decorator, Component, instantiate, Label, Node, Sprite } from "cc";
import { Dialog } from "db://shared-components/shared/common-components/dialogs/dialog";
import { SLOT_LINES } from "../../definitions";
import { getSpriteLine } from "../../utils/classic-slot-utils";

const { ccclass, property } = _decorator;

@ccclass
export default class LineSelectionDialog extends Component {
    @property(Node)
    itemSample: Node = null;

    @property(Node)
    container: Node = null;

    dialog: Dialog = null;

    onLoad() {
        this.dialog = this.getComponent(Dialog);
        this.dialog.onHideComplete = () => {
            this.node.destroy();
        };
        this.initItems();
    }

    initItems() {
        for (let i = 0; i < SLOT_LINES; i++) {
            const item = i === 0 ? this.itemSample : instantiate(this.itemSample);
            this.setValue(item, i);
            this.container.addChild(item);
        }
    }

    setValue(item: Node, index: number) {
        const label = item.getComponentInChildren(Label);
        if (label) {
            label.string = `${index + 1}`;
        }

        const sprite = item.getChildByName("line").getComponent(Sprite);
        if (sprite) {
            sprite.spriteFrame = getSpriteLine(index);
        }
    }
}
