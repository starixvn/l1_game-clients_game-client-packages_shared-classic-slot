import { _decorator, Component, Label, tween } from "cc";
import { AnimationUtils } from "db://shared-components/shared/utils";
import { getXMode } from "db://shared-common-slot/x-mode/scripts/utils/xMode-utils";
const { ccclass, property } = _decorator;

interface BigWinType {
    amount: number;
    duration?: number;
    delayTime?: number;
    noZeroSuffix?: boolean;
}

@ccclass
export default class BigWinAnimation extends Component {
    @property(Label)
    amountLabel: Label = null;

    setAmount(data: BigWinType) {
        const { amount } = data;
        const duration = data.duration ?? 0;
        const delayTime = data.delayTime ?? 0;

        tween(this.amountLabel.node)
            .delay(delayTime)
            .call(() => AnimationUtils.floatToNumber({ label: this.amountLabel, amount, duration, noZeroSuffix: true, xMode: getXMode() }))
            .start();
    }

    async setAmountSlow(amount: number, onComplete: () => void) {
        await AnimationUtils.floatToNumber2({ label: this.amountLabel, amount });
        onComplete();
    }
}
