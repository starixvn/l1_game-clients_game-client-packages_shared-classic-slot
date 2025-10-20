import { _decorator } from "cc";
import { BetHistoryCacheStore } from "db://shared-components/game/bet-history/scripts/components/bet-detail/bet-history-cache-store";
import BetHistoryContainer from "db://shared-components/game/bet-history/scripts/components/bet-history-container";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { SlotUIStore } from "../../handlers/stores/slot-ui-store";
import { DialogName } from "../../utils/classic-slot-utils";
const { ccclass, property, requireComponent } = _decorator;
const { render, handle } = Observer;

@ccclass("ClassicSlotHistoryContainer")
@requireComponent(BetHistoryContainer)
export class ClassicSlotHistoryContainer extends ObserverComponent {
    container: BetHistoryContainer = null;

    onLoad() {
        super.onLoad();
        this.container = this.node.getComponent(BetHistoryContainer);
        this.container.preprocessCallback = () => {
            this.clearHistoryCache();
        };
    }

    @handle(BetHistoryCacheStore, (store) => store.clearHistoryCache())
    clearHistoryCache() { }

    @render(SlotUIStore, store => store.dialogOpenEvent, { fireImmediately: false })
    onClickClose(dialogOpenEvent) {
        if (dialogOpenEvent?.name === DialogName.DUMMY_DIALOG) {
            this.container.onClickClose();
        }
    }
}
