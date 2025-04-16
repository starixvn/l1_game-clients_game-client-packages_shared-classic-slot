import { _decorator, Toggle } from "cc";
import { FunctionUtils } from "db://shared-components/shared/utils";
import AutoSpinSettingDialog from "./auto-spin-setting-dialog";
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
