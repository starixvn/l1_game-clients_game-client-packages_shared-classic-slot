import gc from "@sg/game-client-base";
import inversify from "inversify";
import { formatNamePool } from "../../utils/classic-slot-utils";
import { BetControlStore } from "../stores/bet-control-store";
import { TopWinnersStore, TopWinnerType, Winner, WinnersData } from "../stores/top-winners-store";
const { injectable, inject } = inversify;

enum TopWinnerEvent {
    BigWinningWinners = "getBigWinningWinners",
    JackpotWinners = "getJackpotWinners",
}

@injectable()
export class TopWinnersHandler {
    @inject(BetControlStore) private betControlStore: BetControlStore;
    @inject(TopWinnersStore) private topWinnersStore: TopWinnersStore;
    @inject(gc.Connection.ConnectionStore) private connectionStore: gc.Connection.ConnectionStore;

    @inject(gc.Player.MainPlayerStore) private mainPlayerStore: gc.Player.MainPlayerStore;
    eventHandleList = [
        {
            name: TopWinnerType.BigWinningWinners,
            handle: this.receivedBigWinningWinners,
        },
        {
            name: TopWinnerType.JackpotWinners,
            handle: this.receivedJackpotWinners,
        },
    ];

    constructor() {
        setTimeout(() => {}, 0);
    }

    getData(page: number) {
        const event = this.getEventName();
        this.connectionStore.connection.emit(event, { page });
    }

    private getEventName() {
        return this.topWinnersStore.type === TopWinnerType.BigWinningWinners
            ? TopWinnerEvent.BigWinningWinners
            : TopWinnerEvent.JackpotWinners;
    }

    swapType() {
        this.topWinnersStore.type =
            this.topWinnersStore.type === TopWinnerType.BigWinningWinners ? TopWinnerType.JackpotWinners : TopWinnerType.BigWinningWinners;
        this.getData(1);
    }

    protected receivedBigWinningWinners(data: WinnersData) {
        console.log("receivedBigWinningWinners", data);
        this.topWinnersStore.data = this.convertDataWinners(data);
    }

    protected receivedJackpotWinners(data: WinnersData) {
        console.log("receivedJackpotWinners", data);
        this.topWinnersStore.data = this.convertDataWinners(data);
    }

    protected convertDataWinners(data: WinnersData) {
        const winners = data.winners;
        winners.forEach((winner) => {
            this.convertWinner(winner);
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
            winner.amountString = formatNamePool(winner.pool);
        } else {
            const freeSpin = winner.freeSpin;
            if (freeSpin) {
                winner.amountString = "Free Spin";
            } else {
                const { baseTotalAmount, totalAmount } = winner;
                winner.amountString = gc.FormatUtils.numberWithCommas(
                    this.getValueByExchangeRateCode(baseTotalAmount ?? totalAmount * rate, exchangeRateCode),
                    2
                );
            }
        }

        const winValue = winner.pool ? winningAmount : baseWinningAmount ?? winningAmount * rate;
        winner.winningAmount = this.getValueByExchangeRateCode(winValue, exchangeRateCode);
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
