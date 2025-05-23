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
    [2, 3, 8, 9, 14],
];

export const SLOT_LINES = 25;
export const SLOT_BET_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

export enum SpecialSymbol {
    FREESPIN = 7,
    BONUS = 8,
    WILD = 9,
    JACKPOT = 10,
}

export const SlotNotification = {
    READY: "READY",
    SPINNING: "SPINNING",
    SETTLED: "SETTLED",
    FREESPINS: "FREESPINS",
    AUTO_SPIN: "AUTO_SPIN",
};

export interface LineData {
    payline: number;
    positions: number[];
    symbol: number;
}

export enum SlotState {
    NOT_READY = 0,
    READY = 1,
    BET = 2,
    SPINNING = 3,
    SETTLED = 4,
}

export enum InGameMenuEvents {
    OPEN_TOP_WINNER = "open_top_winner",
}
