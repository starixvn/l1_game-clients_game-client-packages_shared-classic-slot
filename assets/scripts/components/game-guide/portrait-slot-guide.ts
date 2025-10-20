import { _decorator } from "cc";
import { ClassicSlotGuide } from "./classic-slot-guide";
const { ccclass } = _decorator;

@ccclass
export class PortraitSlotGuide extends ClassicSlotGuide {
    loadGameGuide(url: string) {
        super.loadGameGuide(url + "&mode=portrait");
    }
}
