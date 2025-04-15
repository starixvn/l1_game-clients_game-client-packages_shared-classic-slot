import { SlotGameBaseConfigs } from "./SlotGameBaseConfigs";

export class StandardSlotGameConfigs implements SlotGameBaseConfigs {
    itemTypeCount = 11;
    showTotalBonusAmountDuration = 4;
    bonusTimeOut = 120;
    showJackpotWinningAmountDuration? = 4;
    jackpotTimeOut? = 60;

    normalMode = {
        spinDuration: 1,
        winningDuration: 2,
        noWinningDuration: 0.75,
        freespinDuration: 2,
        bonusDuration: 2,
        jackpotDuration: 2,

        bigWinDuration: 4,
        showBigWinValueDuration: 1,
        delayShowBigWinValue: 1.5
    };

    turboMode = {
        spinDuration: 0.3,
        winningDuration: 1,
        noWinningDuration: 0.5,
        freespinDuration: 1.5,
        bonusDuration: 1.5,
        jackpotDuration: 1.5,

        bigWinDuration: 3.2,
        showBigWinValueDuration: 0.8,
        delayShowBigWinValue: 1.2
    };
}
