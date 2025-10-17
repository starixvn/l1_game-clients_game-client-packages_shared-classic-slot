import { _decorator, Button } from "cc";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { BetHistoryCacheStore } from "db://shared-components/game/bet-history/scripts/components/bet-detail/bet-history-cache-store";
import Observer from "observer";
import { ClassicSlotBetDetail } from "./classic-slot-bet-detail";
const { ccclass, property } = _decorator;
const { handle, render } = Observer;

@ccclass("ClassicSlotBetDetailPortrait")
export class ClassicSlotBetDetailPortrait extends ClassicSlotBetDetail {
    @property(Button)
    btnPrev: Button = null;

    @property(Button)
    btnNext: Button = null;

    @handle(BetHistoryCacheStore, (store, next: boolean) => store.requestDetail(next))
    requestDetail(next: boolean) {
        return next
    }

    @render(BetHistoryCacheStore, (store) => store.isNewRound())
    renderIsNewRound(isNewRound: boolean) {
        this.btnNext.node.active = !isNewRound;
    }

    onClickNext() {
        AudioUtils.playClick();
        this.requestDetail(true);
    }

    onClickPrev() {
        AudioUtils.playClick();
        this.requestDetail(false);
    }
}
