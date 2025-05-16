import gc from "@sg/game-client-base";
import { _decorator, Event, Label, Node, Toggle } from "cc";
import { Dialog } from "db://shared-components/shared/common-components/dialogs/dialog";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { BetControlStore } from "../../handlers/stores/bet-control-store";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;

@ccclass
export default class AutoSpinDialog extends ObserverComponent {
    @property(Dialog)
    dialog: Dialog = null;

    @property(Node)
    choicesContainer: Node = null;

    @property(Toggle)
    toggleTurbo: Toggle = null;

    private tempSelectedValue = -1;
    private confirmed = false;

    onLoad() {
        this.dialog.onHideComplete = () => {
            this.onDidHide();
            this.node.destroy();
        };
        super.onLoad();
    }

    @render(BetControlStore, (store) => store.turboEnabled)
    renderToggleTurbo(turboEnabled: boolean) {
        if (turboEnabled !== this.toggleTurbo.isChecked) {
            this.toggleTurbo.isChecked = turboEnabled;
        }
    }

    @render(BetControlStore, (store) => store.autoSpinOptions)
    setOptions(options: number[]) {
        this.choicesContainer.children.forEach((child, index) => {
            const value = options[index];
            child.name = value.toString();
            const label = child.getComponentInChildren(Label);
            if (label) {
                label.string = gc.FormatUtils.numberWithCommas(value);
            }
        });
    }

    @render(BetControlStore, (store) => store.autoSpinSelectedValue)
    setLastSelected(value: number) {
        this.tempSelectedValue = value;
        const node = this.choicesContainer.children.find((child) => value === +child.name);
        if (node) {
            const toggle = node.getComponent(Toggle);
            toggle && (toggle.isChecked = true);
        }
    }

    onChoiceClick(event: Event) {
        // FunctionUtils.playClick();
        this.tempSelectedValue = +event.target.name;
        console.log("onChoiceClick", this.tempSelectedValue);
    }

    onCloseClick() {
        // FunctionUtils.playClick();
        this.dialog.hide();
    }

    onConfirmClick() {
        // FunctionUtils.playClick();
        this.confirmed = true;
        this.dialog.hide();
    }

    private onDidHide() {
        if (this.confirmed) {
            this.onConfirmCallback(this.tempSelectedValue);
        }
    }

    @handle(BetControlStore, (store, autoSpinCount: number) => store.acceptAutoSpinValue(autoSpinCount))
    onConfirmCallback(autoSpinCount: number) {
        return autoSpinCount;
    }

    @handle(BetControlStore, (store, turbo: boolean) => store.setTurbo(turbo))
    onToggleTurbo(toggle: Toggle) {
        return toggle.isChecked;
    }
}
