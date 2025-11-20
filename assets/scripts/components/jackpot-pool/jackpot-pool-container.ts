import gc from "@sg/game-client-base";
const { MainPlayerStore } = gc.Player;
import { _decorator } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { JackpotPool, JackpotPoolStore } from "../../handlers/stores/jackpot-pool-store";
import JackpotPoolItem from "./jackpot-pool-item";
const { ccclass, property } = _decorator;
const { render } = Observer;

@ccclass
export default class JackpotPoolContainer extends ObserverComponent {
    items: JackpotPoolItem[] = [];

    private xMode = 1;
    @render(MainPlayerStore, (store) => store.xMode)
    setXMode(value: number) {
        this.xMode = value;
    }

    onLoad() {
        this.items = this.getComponentsInChildren(JackpotPoolItem);
        super.onLoad();
    }

    getJackpotPoolItem(key: string) {
        return this.items.find((item) => item.node.name === key);
    }

    @render(JackpotPoolStore, (store) => store.jackpotPools["grand"])
    protected renderGrandPool(pool: JackpotPool) {
        this.renderPool(pool);
    }

    @render(JackpotPoolStore, (store) => store.jackpotPools["major"])
    protected renderMajorPool(pool: JackpotPool) {
        this.renderPool(pool);
    }

    @render(JackpotPoolStore, (store) => store.jackpotPools["minor"])
    protected renderMinorPool(pool: JackpotPool) {
        this.renderPool(pool);
    }

    protected renderPool(pool: JackpotPool) {
        if (!pool) {
            return;
        }
        this.getJackpotPoolItem(pool.pool)?.setValue(pool.amount * this.xMode);
    }
}
