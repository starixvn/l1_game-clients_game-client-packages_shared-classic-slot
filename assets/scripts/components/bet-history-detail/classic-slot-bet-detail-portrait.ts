import { BetDetailModel } from "@sg/game-client-base/dist/game/bet-history";
import { _decorator, Button, instantiate, Node, tween, v3 } from "cc";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { BetHistoryCacheStore } from "db://shared-components/game/bet-history/scripts/components/bet-detail/bet-history-cache-store";
import { SharpnessLabel } from "db://shared-components/shared/common-components/sharpness-label/sharpness-label";
import TouchSwipeBase from "db://shared-components/shared/common-components/touch-swipe-base";
import { ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import { SlotUIHandler } from "../../handlers/handlers/slot-ui-handler";
import { DialogName } from "../../utils/classic-slot-utils";
import { ClassicSlotBetDetail } from "./classic-slot-bet-detail";
const { ccclass, property } = _decorator;
const { handle, render } = Observer;

@ccclass("ClassicSlotBetDetailPortrait")
export class ClassicSlotBetDetailPortrait extends ClassicSlotBetDetail {
    @property(Node)
    contentContainer: Node = null;

    @property(Button)
    btnPrev: Button = null;

    @property(Button)
    btnNext: Button = null;

    private isAnimatingSwipe: { direction: 'left' | 'right' } = null;

    onLoad(): void {
        this.setupTouchHandler();
        super.onLoad();
    }

    private setupTouchHandler() {
        const touchSwipeHandlers = this.node.getComponentsInChildren(TouchSwipeBase);
        touchSwipeHandlers.forEach(touchSwipeHandler => {
            touchSwipeHandler.swipeCallback = (isLeft: boolean) => {
                this.isAnimatingSwipe = { direction: isLeft ? 'left' : 'right' };
                    this.requestDetail(isLeft);
                }
            });
    }

    override showBetDetail(model: BetDetailModel): void {
        if (this.isAnimatingSwipe) {
            this.animationSwipe(this.isAnimatingSwipe.direction, () => {
                super.showBetDetail(model);
            });

            this.isAnimatingSwipe = null;
            return;
        }

        super.showBetDetail(model);
    }

    animationSwipe(direction: 'left' | 'right', updateDetailCallback: () => void) {
        const temp = instantiate(this.contentContainer);
        temp.getComponentsInChildren(SharpnessLabel).forEach(label => {
            label.enableSharpness = false;
        });
        temp.parent = this.contentContainer.parent;

        const distance = ComponentUtils.getTransform(this.contentContainer).width;
        const offset = direction === 'left' ? -distance : distance;
        this.contentContainer.position = v3(this.contentContainer.position).add(v3(-offset, 0, 0));
        updateDetailCallback();

        tween(this.contentContainer)
            .to(0.3, { position: v3(0, 0, 0) }, { easing: 'smooth' })
            .start();
        tween(temp)
            .to(0.3, { position: v3(offset, 0, 0) }, { easing: 'smooth' })
            .call(() => {
                temp.destroy();
            })
            .start();
    }

    @handle(BetHistoryCacheStore, (store, next: boolean) => store.requestDetail(next))
    requestDetail(next: boolean) {
        return next
    }

    @render(BetHistoryCacheStore, (store) => store.isNewRound())
    renderIsNewRound(isNewRound: boolean) {
        this.btnNext.node.active = !isNewRound;
    }

    @render(BetHistoryCacheStore, (store) => store.isLastDetail())
    renderIsLastDetail(isLastDetail: boolean) {
        this.btnPrev.node.active = !isLastDetail;
    }

    onClickNext() {
        AudioUtils.playClick();
        this.isAnimatingSwipe = { direction: 'left' };
        this.requestDetail(true);
    }

    onClickPrev() {
        AudioUtils.playClick();
        this.isAnimatingSwipe = { direction: 'right' };
        this.requestDetail(false);
    }

    onCloseHistory() {
        AudioUtils.playClick();
        this.triggerDummyDilog();
    }

    @handle(SlotUIHandler, (store) => store.triggerDialogOpen({ name: DialogName.DUMMY_DIALOG }))
    triggerDummyDilog() { }
}
