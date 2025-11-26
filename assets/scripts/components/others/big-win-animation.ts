import gc from "@sg/game-client-base";
const { MainPlayerStore } = gc.Player;
import { _decorator, Component, Label, tween } from "cc";
import { AnimationUtils } from "db://shared-components/shared/utils";
const { ccclass, property } = _decorator;
import Observer from "observer";
const { render } = Observer;

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

    private xMode = 1;
    @render(MainPlayerStore, (store) => store.xMode)
    setXMode(value: number) {
        this.xMode = value;
    }

    setAmount(data: BigWinType) {
        const { amount } = data;
        const duration = data.duration ?? 0;
        const delayTime = data.delayTime ?? 0;

        tween(this.amountLabel.node)
            .delay(delayTime)
            .call(() => AnimationUtils.floatToNumber({ label: this.amountLabel, amount, duration, noZeroSuffix: true, xMode: this.xMode }))
            .start();
    }

    async setAmountSlow(amount: number, onComplete: () => void) {
        await AnimationUtils.floatToNumber2({ label: this.amountLabel, amount });
        onComplete();
    }
}
