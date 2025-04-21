import { _decorator } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { SlotBetHandler } from "../../handlers";
const { ccclass, property } = _decorator;
const { handle } = Observer;

@ccclass("BetControl")
export default class BetControl extends ObserverComponent {
    @handle(SlotBetHandler, (handler) => handler.callBet())
    onSpin() {
        console.log("onSpin");
    }
}
