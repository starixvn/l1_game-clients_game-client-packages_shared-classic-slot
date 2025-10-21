import { FSBPromotionUIStore } from "db://shared-common-slot/fsb-promotion/scripts/stores/fsb-promotion-ui-store";
import inversify from "inversify";
import mobx from "mobx";
import { SlotUIStore } from "../stores/slot-ui-store";
const { injectable, inject } = inversify;

@injectable()
export class SlotUIHandler {
    @inject(SlotUIStore) protected readonly slotUIStore: SlotUIStore;
    @inject(FSBPromotionUIStore) protected readonly fsbPromotionUIStore: FSBPromotionUIStore;
    constructor() {
        mobx.reaction(
            () => this.fsbPromotionUIStore.pendingUIEvent,
            (pendingUIEvent) => {
                if (pendingUIEvent) {
                    this.triggerDialogOpen({ name: pendingUIEvent.event });
                }
            }
        );
    }

    triggerDialogOpen(event: { name: string }) {
        this.slotUIStore.dialogOpenEvent = event;
    }
}
