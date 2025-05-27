import { _decorator, Component, Node, v3, Vec3 } from "cc";
import { AnimationUtils, ComponentUtils } from "db://shared-components/shared/utils";
import SlotReel from "../slot-board/slot-reel";
import SlotReelItem from "../slot-board/slot-reel-item";

const { ccclass, property } = _decorator;

@ccclass
export default class PreviewOddsPopup extends Component {
    @property(Node)
    previewOverlay: Node = null;

    gameId: number;

    private currentPreviewItem: Node = null;
    onSymbolPreview = (symbol, worldPosition: Vec3, isInfoOnLeft: boolean) => {};

    addPreviewPopup(reels: SlotReel[]) {
        reels.forEach((reel, index) => {
            const isInfoOnLeft = index === reels.length - 1 || index === reels.length - 2;

            reel.items.forEach((item) => {
                this.addReelItemEvent(item, isInfoOnLeft);
            });
        });
    }

    addReelItemEvent(item: SlotReelItem, isInfoOnLeft: boolean) {
        item.node.on(Node.EventType.TOUCH_END, () => {
            if (this.currentPreviewItem === item.node) {
                this.hideSymbolPreview();
                return;
            }
            this.currentPreviewItem = item.node;
            const transform = ComponentUtils.getTransform(item.node);
            const worldPosition = transform.convertToWorldSpaceAR(v3());
            this.onSymbolTouched(item, worldPosition, isInfoOnLeft);
        });
    }

    showPreview(previewNode: Node, worldPosition: Vec3) {
        this.previewOverlay.active = true;
        this.hideOtherPreview();
        this.previewOverlay.addChild(previewNode);
        const transform = ComponentUtils.getTransform(this.previewOverlay);
        previewNode.position = transform.convertToNodeSpaceAR(worldPosition);
        AnimationUtils.fadeIn(previewNode, 0.3);
    }

    hideOtherPreview() {
        this.previewOverlay.children.forEach((node) => {
            AnimationUtils.fadeOut(node, 0.3).then(() => {
                node?.isValid && node.destroy();
                this.previewOverlay.active = this.previewOverlay.children.length > 0;
            });
        });
    }

    protected onSymbolTouched(symbol, worldPosition: Vec3, isInfoOnLeft: boolean) {
        this.onSymbolPreview(symbol, worldPosition, isInfoOnLeft);
    }

    hideSymbolPreview() {
        this.previewOverlay.active = false;
        this.previewOverlay.destroyAllChildren();
        this.currentPreviewItem = null;
    }
}
