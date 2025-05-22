import gc from "@sg/game-client-base";
import inversify from "inversify";
import { BetControlStore } from "../stores/bet-control-store";
import { WinnersData } from "../stores/top-winners-store";
const { injectable, inject } = inversify;
@injectable()
export class TopWinnersHandler {
    @inject(BetControlStore) private betControlStore: BetControlStore;
    @inject(gc.Connection.ConnectionStore) private connectionStore: gc.Connection.ConnectionStore;

    @inject(gc.Player.MainPlayerStore) private mainPlayerStore: gc.Player.MainPlayerStore;
    eventHandleList = [
        {
            name: "bigWinningWinners",
            handle: this.receivedBigWinningWinners,
        },
        {
            name: "jackpotWinners",
            handle: this.receivedJackpotWinners,
        },
    ];

    constructor() {
        setTimeout(() => {}, 0);
    }

    receivedBigWinningWinners(data: WinnersData) {
        console.log("receivedBigWinningWinners", data);
    }

    receivedJackpotWinners(data: WinnersData) {
        console.log("receivedJackpotWinners", data);
    }

    protected convertDataWinners(data: WinnersData) {
        const winners = data.winners.map((winner) => {
            return winner;
        });

        return {
            page: data.page,
            pageSize: data.pageSize,
            total: data.total,
            winners,
        };
    }

    getValueByExchangeRateCode(value: number, exchangeRateCode) {
        let currencyRate = exchangeRateCode[this.mainPlayerStore.currency];
        if (!currencyRate) {
            currencyRate = 1;
        }
        return value / (this.mainPlayerStore.multiplier * currencyRate);
    }

    protected formatNamePool(name: string) {
        return name[0].toUpperCase() + name.slice(1);
    }

    protected convertWinner(winner: Winner) {
        winner.name = this.handleShortenName(winner.name);
        winner.time = gc.DateTimeUtils.getStringDateByTime(winner.time);
        winner.highlight = winner.name === this.mainPlayerStore.name;

        const { baseWinningAmount, winningAmount, rate, exchangeRateCode } = winner;

        if (winner.pool) {
            winner.amountValue = this.formatNamePool(winner.pool);
        } else {
            const freeSpin = winner.freeSpin;
            if (freeSpin) {
                winner.amountValue = "Free Spin";
            } else {
                const { baseTotalAmount, totalAmount } = winner;
                winner.amountValue = gc.FormatUtils.numberWithCommas(
                    this.getValueByExchangeRateCode(baseTotalAmount ?? totalAmount * rate, exchangeRateCode),
                    2
                );
            }
        }

        const winValue = winner.pool ? winningAmount : baseWinningAmount ?? winningAmount * rate;
        winner.winningAmount = gc.FormatUtils.numberWithCommas(this.getValueByExchangeRateCode(winValue, exchangeRateCode), 2);
    }

    protected shortenName(name: string) {
        name = name.toLowerCase();
        const prefix = name.slice(0, 1);
        const suffix = name.slice(-3);
        return `${prefix}***${suffix}`;
    }

    protected handleShortenName(name: string) {
        if (name !== this.mainPlayerStore.name) {
            return this.shortenName(name);
        }
        return name;
    }
}
