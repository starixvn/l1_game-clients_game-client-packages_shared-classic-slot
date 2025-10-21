import { FSBPromotionUIStore } from "db://shared-common-slot/fsb-promotion/scripts/stores/fsb-promotion-ui-store";
import inversify from "inversify";
import mobx from "mobx";
import { SlotState } from "../../definitions";
import { SlotBoardStore } from "../stores/slot-board-store";
import { SlotUIStore } from "../stores/slot-ui-store";
const { injectable, inject } = inversify;

@injectable()
export class SlotUIHandler {
    @inject(SlotUIStore) protected readonly slotUIStore: SlotUIStore;
    @inject(SlotBoardStore) protected readonly slotBoardStore: SlotBoardStore;
    @inject(FSBPromotionUIStore) protected readonly fsbPromotionUIStore: FSBPromotionUIStore;
    constructor() {
        setTimeout(() => {
            mobx.reaction(
                () => this.fsbPromotionUIStore.pendingUIEvent,
                (pendingUIEvent) => {
                    if (pendingUIEvent) {
                        this.triggerDialogOpen({ name: pendingUIEvent.event });
                    }
                }

            );

            mobx.reaction(
                () => this.slotBoardStore.slotState,
                (state) => {
                    this.fsbPromotionUIStore.isSpinningFSB = state !== SlotState.READY;
                }
            );
        }, 10);
    }

    triggerDialogOpen(event: { name: string }) {
        this.slotUIStore.dialogOpenEvent = event;
    }
}
