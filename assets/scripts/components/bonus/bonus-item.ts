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

    async onLoad() {
        this.openChestSkeleton.setAnimation(0, "entry", false);
        await AnimationUtils.delayTime(1);
        this.openChestSkeleton.setAnimation(0, "idle", true);
    }

    async open(value: number) {
        this.openChestSkeleton.setAnimation(0, "open", false);
        await AnimationUtils.delayTime(0.5);

        if (value > 0) {
            this.value.string = gc.FormatUtils.numberWithCommas(value);
        }
    }
}
