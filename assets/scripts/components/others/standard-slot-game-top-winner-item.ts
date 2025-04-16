// import gc from "@sg/game-client-base";
// import { _decorator } from "cc";
// import SlotGameTopWinnerItem from "./slot-game-top-winner-item";
// import SlotUtils from "./slot-utils";
// const { ccclass } = _decorator;

// @ccclass
// export default class StandardSlotGameTopWinnerItem extends SlotGameTopWinnerItem {
//     setOtherValues(player: any, showBigWin: boolean) {
//         const { freeSpin, totalAmount, winningAmount, exchangeRateCode, rate, baseTotalAmount, baseWinningAmount, pool } = player;

//         let amountValue = "";

//         if (showBigWin) {
//             amountValue = freeSpin
//                 ? "Free Spin"
//                 : gc.FormatUtils.numberWithCommas(
//                       //TODO: fix
//                       //   GameUtils.getValueByExchangeRateCode
//                       //   (baseTotalAmount ?? totalAmount * rate, exchangeRateCode)
//                       baseTotalAmount ?? totalAmount * rate,
//                       2
//                   );
//         } else {
//             pool && (amountValue = SlotUtils.formatNamePool(pool));
//         }

//         this.amount.string = amountValue;

//         const winValue = showBigWin ? baseWinningAmount ?? winningAmount * rate : winningAmount;
//         this.win.string = gc.FormatUtils.numberWithCommas(
//             //TODO: fix
//             // GameUtils.getValueByExchangeRateCode(winValue, exchangeRateCode)
//             winValue,
//             2
//         );
//     }
// }
