import { _decorator, Toggle } from "cc";
import AutoSpinSettingDialog from "./AutoSpinSettingDialog";
const { ccclass, property } = _decorator;

@ccclass
export default class TurboAutoSpinSettingDialog extends AutoSpinSettingDialog {
    @property(Toggle)
    turboToggle: Toggle = null;

    turboChangedCallback = (value: boolean) => {};

    syncTurboToggle(checked: boolean) {
        this.turboToggle.isChecked = checked;
    }

    onTurboModeChanged() {
        FunctionUtils.playClick();
        this.turboChangedCallback(this.turboToggle.isChecked);
    }
}
