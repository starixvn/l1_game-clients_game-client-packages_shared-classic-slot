// import { _decorator, sp } from "cc";
// import GameUtils from "../../common/GameUtils";
// import BonusItem from "./BonusItem";
// const { ccclass, property } = _decorator;

// @ccclass
// export default class SpineBonusItem extends BonusItem {
//     @property({ type: Animation, override: true, visible: false })
//     openChestAnimation: Animation = null;

//     @property(sp.Skeleton)
//     openChestSkeleton: sp.Skeleton = null;

//     onLoad() {
//         this.openChestSkeleton.setAnimation(0, "entry", false);
//         GameUtils.delayTime(1);
//         this.openChestSkeleton.setAnimation(0, "idle", true);
//     }

//     open(value: number) {
//         this.openChestSkeleton.setAnimation(0, "open", false);
//         GameUtils.delayTime(0.5);

//         super.open(value);
//     }
// }
