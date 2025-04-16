export interface SlotGameBaseConfigs {
    readonly itemTypeCount: number;

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
}

export const paylines = [
    [1, 4, 7, 10, 13],
    [0, 3, 6, 9, 12],
    [2, 5, 8, 11, 14],
    [2, 4, 6, 10, 14],
    [0, 4, 8, 10, 12],

    [1, 3, 6, 9, 13],
    [1, 5, 8, 11, 13],
    [0, 3, 7, 11, 14],
    [2, 5, 7, 9, 12],
    [1, 5, 7, 9, 13],

    [1, 3, 7, 11, 13],
    [0, 4, 7, 10, 12],
    [2, 4, 7, 10, 14],
    [0, 4, 6, 10, 12],
    [2, 4, 8, 10, 14],

    [1, 4, 6, 10, 13],
    [1, 4, 8, 10, 13],
    [0, 3, 8, 9, 12],
    [2, 5, 6, 11, 14],
    [0, 5, 8, 11, 12],

    [2, 3, 6, 9, 14],
    [1, 3, 8, 9, 13],
    [1, 5, 6, 11, 13],
    [0, 5, 6, 11, 12],
    [2, 3, 8, 9, 14]
];

export enum SpecialSymbol {
    WILD = 9,
    JACKPOT = 10,
    FREESPIN = 7,
    BONUS = 8
}
