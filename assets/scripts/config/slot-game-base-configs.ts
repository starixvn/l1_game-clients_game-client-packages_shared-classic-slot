export interface SlotGameBaseConfigs {
    readonly itemTypeCount: number;
    readonly jackpotSymbolIndex: number;
    readonly showTotalBonusAmountDuration: number;
    readonly bonusTimeOut: number;
    readonly showJackpotWinningAmountDuration?: number;
    readonly jackpotTimeOut?: number;

    readonly normalMode: CustomDuration;
    readonly turboMode: CustomDuration;
}

export interface CustomDuration {
    readonly spinDuration: number;
    readonly winningDuration: number;
    readonly noWinningDuration: number;
    readonly bigWinDuration: number;
    readonly freespinDuration: number;
    readonly jackpotDuration: number;
    readonly bonusDuration: number;
    readonly showBigWinValueDuration: number;
    readonly delayShowBigWinValue: number;
    readonly transitionDuration: number;
}
