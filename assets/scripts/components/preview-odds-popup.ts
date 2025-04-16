import { _decorator, Component, Node, v3, Vec3 } from "cc";

const { ccclass, property } = _decorator;

@ccclass
export default class PreviewOddsPopup extends Component {
    @property(Node)
    previewOverlay: Node = null;

    gameId: number;

    private currentPreviewItem: Node = null;
    onSymbolPreview = (symbol, worldPosition: Vec3, isInfoOnLeft: boolean) => {};

    addPreviewPopup(reels) {
        reels.forEach((reel, index) => {
            const isInfoOnLeft = index === reels.length - 1 || index === reels.length - 2;

            reel.items.forEach((item) => {
                this.addReelItemEvent(item, isInfoOnLeft);
            });
        });
    }

    addReelItemEvent(item, isInfoOnLeft) {
        item.node.on(Node.EventType.TOUCH_END, () => {
            if (this.currentPreviewItem === item.node) {
                this.hideSymbolPreview();
                return;
            }
            this.currentPreviewItem = item.node;
            const worldPosition = item.node.convertToWorldSpaceAR(v3());
            this.onSymbolTouched(item, worldPosition, isInfoOnLeft);
        });
    }

    showPreview(previewNode: Node, worldPosition: Vec3) {
        this.previewOverlay.active = true;
        this.hideOtherPreview();
        this.previewOverlay.addChild(previewNode);
        previewNode.position = this.previewOverlay.convertToNodeSpaceAR(worldPosition);
        GameUtils.showNode(previewNode);
    }

    hideOtherPreview() {
        this.previewOverlay.children.forEach((node) =>
            GameUtils.hideNode2(node, {
                onHidden: () => {
                    node.destroy();
                    this.previewOverlay.active = this.previewOverlay.childrenCount > 0;
                },
            })
        );
    }

    protected onSymbolTouched(symbol, worldPosition: Vec3, isInfoOnLeft: boolean) {
        if (this.gameId) {
            const storage = GameUtils.getGameSetting(this.gameId);
            if (!storage.autoSpin) {
                this.onSymbolPreview(symbol, worldPosition, isInfoOnLeft);
            }
            return;
        }
        this.onSymbolPreview(symbol, worldPosition, isInfoOnLeft);
    }

    hideSymbolPreview() {
        this.previewOverlay.active = false;
        this.previewOverlay.destroyAllChildren();
        this.currentPreviewItem = null;
    }
}
