import gc from "@sg/game-client-base";
import { _decorator, Component, Label, sp } from "cc";
import { AnimationUtils } from "db://shared-components/shared/utils";
const { ccclass, property } = _decorator;

@ccclass
export default class BonusItem extends Component {
    @property(sp.Skeleton)
    openChestSkeleton: sp.Skeleton = null;

    @property(Label)
    value: Label = null;

    private isOpenItem = false;

    onLoad() {
        console.log("Loaded");
        this.openChestSkeleton.setAnimation(0, "entry", false);
        AnimationUtils.delayTime(1).then(() => {
            if (this.isOpenItem) {
                return;
            }
            this.openChestSkeleton.setAnimation(0, "idle", true);
        });
    }

    async open(value: number) {
        console.log("open");
        this.openChestSkeleton.setAnimation(0, "open", false);
        this.isOpenItem = true;
        await AnimationUtils.delayTime(0.5);

        if (value > 0) {
            this.value.string = gc.FormatUtils.numberWithCommas(value);
        }
    }
}
