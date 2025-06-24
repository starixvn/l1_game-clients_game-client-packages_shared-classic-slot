import inversify from "inversify";

import { SlotUIStore } from "../stores/slot-ui-store";
const { injectable, inject } = inversify;

@injectable()
export class SlotUIHandler {
    @inject(SlotUIStore) protected readonly slotUIStore: SlotUIStore;
    constructor() {}

    triggerDialogOpen(event: { name: string }) {
        this.slotUIStore.dialogOpenEvent = event;
    }
}
