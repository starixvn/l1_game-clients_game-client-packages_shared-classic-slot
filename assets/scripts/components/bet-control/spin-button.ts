import { _decorator, EventTouch, game, Input, input, Intersection2D, KeyCode, math, Node, PolygonCollider2D, sp } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { SlotBetHandler } from "../../handlers/handlers/slot-bet-handlers";
const { ccclass, property } = _decorator;
const { handle, render } = Observer;

@ccclass
export default class StandardSlotSpinButton extends ObserverComponent {
    @property(sp.Skeleton)
    spine: sp.Skeleton = null;

    @property(PolygonCollider2D)
    polygonCollider2D: PolygonCollider2D = null;

    protected touchInPolygon(event: EventTouch) {
        const location = event.getUILocation();
        const polygon = this.polygonCollider2D.worldPoints;
        return Intersection2D.pointInPolygon(math.v2(location.x, location.y), polygon);
    }

    @handle(SlotBetHandler, (handler) => handler.callBet())
    onSpin() {
        console.log("onSpin");
    }

    protected playAnimationSpin() {
        this.spine && this.spine.setAnimation(0, "spin", true);
        this.spine && this.spine.setAnimation(3, "spin-extra", false);
    }

    protected playAnimationIdle() {
        this.spine && this.spine.setAnimation(0, "idle", true);
    }

    protected showAutoSpinMode() {}
    protected hideAll() {}
    protected showNormalMode() {}

    ////
    protected readonly spinButtonSound = "spin_button";

    onBlur = () => {
        this.clearTriggerAction();
    };

    onLoad() {
        this.addEvent();
        this.registerTouchEvents();
        super.onLoad();
    }

    onDestroy() {
        game.canvas.removeEventListener("blur", this.onBlur);
        super.onDestroy();
    }

    protected addEvent() {
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

    @handle(SlotBetHandler, (handler) => handler.callTriggerAction())
    callTriggerAction() {}

    @handle(SlotBetHandler, (handler) => handler.clearTriggerAction())
    clearTriggerAction() {}
}
