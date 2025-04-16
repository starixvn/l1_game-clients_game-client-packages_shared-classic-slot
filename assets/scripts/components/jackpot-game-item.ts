import { _decorator, Component, sp } from "cc";
import HoverItemBase from "../../common/HoverItemBase";
const { ccclass, property } = _decorator;

@ccclass
export default class JackpotGameItem extends Component {
    @property(sp.Skeleton)
    openChestSkeleton: sp.Skeleton = null;

    onLoad() {
        this.initEventJackpotItem();
    }

    open() {
        this.openChestSkeleton.clearTracks();
        this.openChestSkeleton.setAnimation(0, "open", false);
    }

    initEventJackpotItem() {
        const callback = {
            onMove: (e) => {
                this.openChestSkeleton && this.openChestSkeleton.setAnimation(0, "hover", false);
            },
            onLeave: (e) => {
                this.openChestSkeleton && this.openChestSkeleton.setAnimation(0, "idle", false);
            },
        };
        this.node.getComponent(HoverItemBase).touchCallback = callback;
    }
}
