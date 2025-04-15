import { _decorator } from "cc";
import GameUtils from "../../common/GameUtils";
import { numberWithCommas } from "./../../common/helpers/NumberHelper";
import SlotGameTopWinnerItem from "./SlotGameTopWinnerItem";
import SlotUtils from "./SlotUtils";
const { ccclass } = _decorator;

@ccclass
export default class StandardSlotGameTopWinnerItem extends SlotGameTopWinnerItem {
    setOtherValues(player: any, showBigWin: boolean) {
        const { freeSpin, totalAmount, winningAmount, exchangeRateCode, rate, baseTotalAmount, baseWinningAmount, pool } = player;

        let amountValue = "";

        if (showBigWin) {
            amountValue = freeSpin
                ? "Free Spin"
                : numberWithCommas(GameUtils.getValueByExchangeRateCode(baseTotalAmount ?? totalAmount * rate, exchangeRateCode), 2);
        } else {
            pool && (amountValue = SlotUtils.formatNamePool(pool));
        }

        this.amount.string = amountValue;

        const winValue = showBigWin ? baseWinningAmount ?? winningAmount * rate : winningAmount;
        this.win.string = numberWithCommas(GameUtils.getValueByExchangeRateCode(winValue, exchangeRateCode), 2);
    }
}
