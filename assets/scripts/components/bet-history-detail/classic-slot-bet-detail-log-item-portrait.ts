import { _decorator } from 'cc';
import { ClassicSlotBaseBetDetailLogItem } from './classic-slot-bet-detail-log-item';
const { ccclass } = _decorator;

@ccclass
export class ClassicSlotBetDetailLogItemPortrait extends ClassicSlotBaseBetDetailLogItem {
    setData(data: any) {
        super.setData(data);
        const isNumericPayout = typeof data.payout === 'number';
        this.payout.string = isNumericPayout ? '' : (data.payout ?? '');
    }
}


