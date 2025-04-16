import { _decorator, Node, sp } from "cc";
import SlotReelItem from "./slot-reel-item";
const { ccclass, property } = _decorator;

@ccclass
export default class SlotReelItemWithSpine extends SlotReelItem {
    @property({ visible: false, override: true })
    winningEffect: Node = null;

    @property({ visible: false, override: true })
    effectSpine: sp.Skeleton = null;

    showWinningEffect(show: boolean) {
        this.content.children.forEach((child) => {
            const spine = child.getChildByName("icon").getComponent(sp.Skeleton);
            if (spine) {
                const anim = show ? "highlight" : "idle";
                spine.setAnimation(0, anim, true);
            }
            this.showMoreEffect(child, show);
        });
    }

    showMoreEffect(node: Node, show: boolean) {
        const effectNode = node.getChildByName("winningEffect");
        if (effectNode) {
            effectNode.active = show;
        }
    }
}
