import GameBaseBetHandler from "../../_base/handlers/GameBaseBetHandler";
import SlotGameBase from "../SlotGameBase";

export default class SlotGameBetHandler extends GameBaseBetHandler {
    constructor(protected readonly main: SlotGameBase) {
        super(main);
    }

    handleEndBet(data: any) {
        if (data.endBet) {
            if (data.endBet !== -1 && !data.freeSpin) {
                this.main.showAcceptedBet(data.endBet);
                this.main.deactiveButtons();
                this.main.isAnimatingResult = true;
            }
            if (data.endBet === -1) {
                this.main.activeButtons();
                this.main.showProcessingWarning(false);
                this.main.isSpinnedAction = false;
            }
            this.main.spinButton.showTextSpinInFreeSpin(false);
        }
    }
}
