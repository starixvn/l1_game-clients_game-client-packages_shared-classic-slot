import { _decorator, EventTouch, game, Input, input, Intersection2D, KeyCode, math, Node, PolygonCollider2D, sp } from "cc";
import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { ButtonState } from "db://shared-components/shared/common-components/button/button-state";
import { CustomButton, StateChangedEvent } from "db://shared-components/shared/common-components/button/custom-button";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { AnimationUtils } from "db://shared-components/shared/utils/utils";
import Observer from "observer";
import { SlotState } from "../../definitions";
import { BetControlStore, SlotUIHandler } from "../../handlers";
import { SlotBetHandler } from "../../handlers/handlers/slot-bet-handlers";
import { SlotBoardStore } from "../../handlers/stores/slot-board-store";
import { DialogName } from "../../utils/classic-slot-utils";
const { ccclass, property } = _decorator;
const { handle, render } = Observer;

enum SpineAnimationTrack {
    MAIN = 0,
    HOVER = 1,
    EXTRA = 2,
}

@ccclass
export default class SpinButton extends ObserverComponent {
    @property(sp.Skeleton)
    spine: sp.Skeleton = null;

    @property(PolygonCollider2D)
    polygonCollider2D: PolygonCollider2D = null;

    protected button: CustomButton;
    protected isSpinning = false;
    protected isTurbo = false;

    protected touchInPolygon(event: EventTouch) {
        const location = event.getUILocation();
        const polygon = this.polygonCollider2D.worldPoints;
        return Intersection2D.pointInPolygon(math.v2(location.x, location.y), polygon);
    }

    playAnimationSpin() {
        AnimationUtils.playSpine(this.spine, "spin", true);
        this.spine.timeScale = 1;
    }

    playAnimationIdle() {
        AnimationUtils.playSpine(this.spine, "idle", true);
        this.spine.timeScale = 1;
    }

    playAnimationSpinTurbo() {
        AnimationUtils.playSpine(this.spine, "spin", true);
        this.spine.timeScale = 2;
    }

    onBlur = () => {
        this.clearTriggerAction();
    };

    onLoad() {
        this.addEvent();
        this.registerTouchEvents();

        this.button = this.getComponent(CustomButton);
        this.button.node.on(StateChangedEvent, this.onButtonStateChanged, this);
        super.onLoad();
    }

    onButtonStateChanged(state: ButtonState) {
        if (state === ButtonState.HOVER) {
            this.spine.setAnimation(SpineAnimationTrack.HOVER, "hover", true);
        } else {
            this.spine.clearAnimation(SpineAnimationTrack.HOVER);
        }
    }

    changeAnimationSpinning() {
        if (!this.isSpinning) {
            return;
        }
        if (this.isTurbo) {
            this.playAnimationSpinTurbo();
        } else {
            this.playAnimationSpin();
        }
    }

    playAnimationSpinExtra() {
        this.spine.setAnimation(SpineAnimationTrack.EXTRA, "spin-extra", true);
    }

    stopAnimationSpinExtra() {
        this.spine.clearAnimation(SpineAnimationTrack.EXTRA);
    }

    onDestroy() {
        game.canvas.removeEventListener("blur", this.onBlur);
        super.onDestroy();
    }

    protected addEvent() {
        game.canvas.focus();
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    protected registerTouchEvents() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.handleTouchMove, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);

        game.canvas.addEventListener("blur", this.onBlur);
    }

    protected handleTouchMove(event: EventTouch) {
        if (!this.touchInPolygon(event)) {
            this.clearTriggerAction();
        }
    }

    protected onTouchStart(event: EventTouch) {
        if (this.touchInPolygon(event)) {
            this.callTriggerAction();
        }
    }

    protected onTouchEnd() {
        this.clearTriggerAction();
    }

    protected removeEvent() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    protected onKeyDown(event) {
        const { keyCode } = event;
        if (keyCode === KeyCode.SPACE || keyCode === KeyCode.ENTER || keyCode === KeyCode.NUM_ENTER) {
            this.callTriggerAction();
        }
    }

    protected onKeyUp(event) {
        const { keyCode } = event;
        if (keyCode === KeyCode.SPACE || keyCode === KeyCode.ENTER || keyCode === KeyCode.NUM_ENTER) {
            this.clearTriggerAction();
        }
    }

    @handle(SlotUIHandler, (store) => store.triggerDialogOpen({ name: DialogName.SPINNING }))
    @handle(SlotBetHandler, (handler) => handler.callTriggerAction())
    callTriggerAction() {
        AudioUtils.playSFX(AudioIds.SPIN_BUTTON);
    }

    @handle(SlotBetHandler, (handler) => handler.clearTriggerAction())
    clearTriggerAction() {}

    @render(BetControlStore, (store) => store.turboEnabled)
    renderTurboEnabled(turboEnabled: boolean) {
        this.isTurbo = turboEnabled;
    }

    @render(SlotBoardStore, (store) => store.slotState)
    renderSpinButtonState(slotState: SlotState) {
        this.isSpinning = slotState === SlotState.SPINNING;
        if (this.isSpinning) {
            this.playAnimationSpinExtra();
            this.changeAnimationSpinning();
        } else {
            this.stopAnimationSpinExtra();
            this.playAnimationIdle();
        }
    }

    @render(BetControlStore, (store) => store.isReadyBet)
    renderCascadingState(isReadyBet: boolean) {
        //HACK: disable button too fast will cause the button transition scale not working
        setTimeout(() => {
            try {
                this.button.interactable = isReadyBet;
            } catch (error) {}
        }, 100);
    }
}
