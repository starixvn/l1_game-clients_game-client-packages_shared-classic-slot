import { _decorator, Button, Node } from "cc";
import LineSelectionDialog from "./LineSelectionDialog";
const { ccclass, property } = _decorator;

@ccclass
export default class StandardLineSelectionDialog extends LineSelectionDialog {
    @property({ type: Node, override: true, visible: false })
    bgActive: Node[] = [];

    @property({ type: Button, override: true, visible: false })
    confirmButton: Button = null;

    loadPaylineSprite(num): SpriteFrame {
        return this.atlas.getSpriteFrame(`line-selection-${num}`);
    }
}
