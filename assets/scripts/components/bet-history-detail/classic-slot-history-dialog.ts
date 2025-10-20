import { _decorator } from "cc";
import { BetHistoryCacheStore } from "db://shared-components/game/bet-history/scripts/components/bet-detail/bet-history-cache-store";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import TouchSwipeBase from "db://shared-components/shared/common-components/touch-swipe-base";
import Observer from "observer";
const { ccclass, property, requireComponent } = _decorator;
const { render, handle } = Observer;

@ccclass("ClassicSlotHistoryDialog")
export class ClassicSlotHistoryDialog extends ObserverComponent {

    protected touchSwipeHandler: TouchSwipeBase = null;
    onLoad() {
        this.setupTouchHandler();
        super.onLoad();
    }

    private setupTouchHandler() {
        const touchSwipeHandler = this.node.getComponentsInChildren(TouchSwipeBase)[0];
        if (touchSwipeHandler) {
            touchSwipeHandler.swipeCallback = (isLeft: boolean) => {
                this.requestPage(isLeft);
            }
        }
    }

    @handle(BetHistoryCacheStore, (store) => store.requestNextPage())
    requestNextPage() { }

    @handle(BetHistoryCacheStore, (store) => store.requestPreviousPage())
    requestPreviousPage() { }

    requestPage(isLeft: boolean) {
        if (isLeft) {
            this.requestNextPage();
        } else {
            this.requestPreviousPage();
        }
    }
}
