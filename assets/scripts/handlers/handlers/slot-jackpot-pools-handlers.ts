import gc from "@sg/game-client-base";
import inversify from "inversify";
import { JackpotPool, JackpotPoolStore } from "../stores/jackpot-pool-store";
const { injectable, inject } = inversify;
@injectable()
export class SlotJackpotPoolsHandler {
    @inject(JackpotPoolStore) private jackpotPoolStore: JackpotPoolStore;
    @inject(gc.Player.MainPlayerStore) private readonly mainPlayerStore: gc.Player.MainPlayerStore;

    eventHandleList = [
        {
            name: "jackpotPool",
            handle: this.handleJackpotPool,
        },
        {
            name: "jackpotPools",
            handle: this.handleJackpotPools,
        },
    ];

    handleJackpotPool(jackpotPool: JackpotPool) {
        jackpotPool.amount = gc.NumberUtils.getValueByCurrency(jackpotPool.amount, this.mainPlayerStore.rate);
        this.jackpotPoolStore.jackpotPools[jackpotPool.pool] = jackpotPool;
    }

    handleJackpotPools(jackpotPools: JackpotPool[]) {
        const data: Record<string, JackpotPool> = {};

        jackpotPools.forEach((pool) => {
            pool.amount = gc.NumberUtils.getValueByCurrency(pool.amount, this.mainPlayerStore.rate);
            data[pool.pool] = pool;
        });

        this.jackpotPoolStore.jackpotPools = data;
    }
}
