import { _decorator, Component, Node, Toggle } from "cc";
import { Dialog } from "db://shared-components/shared/common-components/dialogs/dialog";
import { FunctionUtils } from "db://shared-components/shared/utils/function-utils";

const { ccclass, property } = _decorator;

@ccclass
export default class AutoSpinSettingDialog extends Component {
    @property(Dialog)
    dialog: Dialog = null;

    @property(Node)
    choicesContainer: Node = null;

    public onConfirmCallback = (autoSpinCount: number) => {};
    public onCancelCallback = () => {};
    private autoSpinCount = 10;
    private confirmed = false;

    onLoad() {
        const defaultSpin = this.choicesContainer.children[0].name || 10;
        this.autoSpinCount = +defaultSpin;

        this.dialog.onHideComplete = () => {
            this.onDidHide();
            this.node.destroy();
        };
    }

    setLastSelected(value: number) {
        this.autoSpinCount = value;
        const node = this.choicesContainer.children.find((child) => value === +child.name);
        if (node) {
            const toggle = node.getComponent(Toggle);
            toggle && (toggle.isChecked = true);
        }
    }

    onChoiceClick(toggle: Toggle) {
        FunctionUtils.playClick();
        this.autoSpinCount = +toggle.node.name;
    }

    onCloseClick() {
        FunctionUtils.playClick();
        this.dialog.hide();
    }

    onConfirmClick() {
        FunctionUtils.playClick();
        this.confirmed = true;
        this.dialog.hide();
    }

    private onDidHide() {
        if (this.confirmed) {
            this.onConfirmCallback(this.autoSpinCount);
        } else {
            this.onCancelCallback();
        }
    }
}
