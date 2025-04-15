import DataHandler from "../../_base/handlers/DataHandler";
import SlotGameBase from "../SlotGameBase";

export default class SlotGameIngameHandler implements DataHandler {
    constructor(protected readonly main: SlotGameBase) {}

    handle(data: any) {
        if (data.freeSpins && data.freeSpins.total) {
            const { bet, total, paylines } = data.freeSpins;
            this.main.setTotalFreeSpins(total);
            let betLevel = bet;
            if (this.main.isAccelerate) {
                const haveBet = this.main.gameConfigs.betLevels.includes(bet);
                if (!haveBet) {
                    betLevel = this.main.gameConfigs.defaultBetLevel;
                }
            }
            this.main.setStake(betLevel);
            !this.main.isAccelerate && this.main.setBetChoices(paylines);

            this.main.updateDisplaySpinButtons();
            this.main.stakeButton && (this.main.stakeButton.interactable = false);
            this.main.lineButtonStatus(false);
            this.main.autoSpinToggle && (this.main.autoSpinToggle.interactable = false);
        }
    }
}
