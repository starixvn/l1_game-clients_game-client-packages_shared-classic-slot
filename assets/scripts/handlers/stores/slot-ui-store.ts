import inversify from "inversify";
import mobx from "mobx";
const { injectable, inject } = inversify;

@injectable()
export class SlotUIStore {
    constructor() {
        mobx.makeAutoObservable(this);
    }

    dialogOpenEvent = { name: "" };
}
