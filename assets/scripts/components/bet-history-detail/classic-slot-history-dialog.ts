import { _decorator, instantiate, tween, v3 } from "cc";
import { BetHistoryCacheStore } from "db://shared-components/game/bet-history/scripts/components/bet-detail/bet-history-cache-store";
import { BetHistoryTable, BetHistoryTableType } from "db://shared-components/game/bet-history/scripts/components/bet-history-table";
import { SharpnessLabel } from "db://shared-components/shared/common-components/sharpness-label/sharpness-label";
import TouchSwipeBase from "db://shared-components/shared/common-components/touch-swipe-base";
import { ComponentUtils } from "db://shared-components/shared/utils/component-utils";
import Observer from "observer";
const { ccclass, property, requireComponent } = _decorator;
const { render, handle } = Observer;

@ccclass("ClassicSlotHistoryDialog")
export class ClassicSlotHistoryDialog extends BetHistoryTable {
    protected touchSwipeHandler: TouchSwipeBase = null;
    private isAnimatingSwipe: { direction: 'left' | 'right' } = null;

    onLoad() {
        this.setupTouchHandler();
        super.onLoad();
    }

    private setupTouchHandler() {
        const touchSwipeHandler = this.node.getComponentsInChildren(TouchSwipeBase)[0];
        if (touchSwipeHandler) {
            touchSwipeHandler.swipeCallback = (isLeft: boolean) => {
                this.isAnimatingSwipe = { direction: isLeft ? 'left' : 'right' };
                if (isLeft) {
                    this.requestNextPage();
                } else {
                    this.requestPreviousPage();
                }
            }
        }
    }

    override showBetHistory(model: BetHistoryTableType) {
        super.showBetHistory(model);
        if (this.isAnimatingSwipe) {
            this.animationSwipe(this.isAnimatingSwipe.direction, () => {
                super.showBetHistory(model);
            });

            this.isAnimatingSwipe = null;
            return;
        }

        super.showBetHistory(model);
    }

    animationSwipe(direction: 'left' | 'right', updateDetailCallback: () => void) {
        const temp = instantiate(this.body);
        temp.getComponentsInChildren(SharpnessLabel).forEach(label => {
            label.enableSharpness = false;
        });
        temp.parent = this.body.parent;

        const distance = ComponentUtils.getTransform(this.body).width;
        const offset = direction === 'left' ? -distance : distance;
        this.body.position = v3(this.body.position).add(v3(-offset, 0, 0));
        updateDetailCallback();

        tween(this.body)
            .to(0.3, { position: v3(0, this.body.position.y, 0) }, { easing: 'smooth' })
            .start();
        tween(temp)
            .to(0.3, { position: v3(offset, this.body.position.y, 0) }, { easing: 'smooth' })
            .call(() => {
                temp.destroy();
            })
            .start();
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
