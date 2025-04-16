/*


import { _decorator, Director, director, Label, Prefab, Toggle } from "cc";
import * as i18n from "i18n/runtime-scripts/LanguageData";
import AnalyticsManager, { TrackingAction, TrackingEvent } from "../../analytics/AnalyticsManager";
import CallbackAnimation from "../../common/CallbackAnimation";
import GameUtils from "../../common/GameUtils";
import AudioManager from "../../common/audio/AudioManager";
import UserProfile from "../../common/user-profile/UserProfile";
import { uiManager } from "../../managers/GameUIManager";
import { InternalEvents } from "../../managers/InternalEvents";
import NewGameRoomBase from "../_new/_base/NewGameRoomBase";
import FeatureSlotGameData from "../cascading-slot/models/FeatureSlotGameData";
import { SpinButtonState } from "../cascading-slot/models/SpinButtonStateModel";
import AutoSpinSettingDialog from "./AutoSpinSettingDialog";
import BigWinAnimation from "./BigWinAnimation";
import ClassicSpinButton from "./ClassicSpinButton";
import CountDownWarning from "./CountDownWarning";
import HoldActionButton from "./HoldActionButton";
import SlotGameBottomMessage from "./SlotGameBottomMessage";
import SlotGameSongs from "./SlotGameSongs";
import SlotGameSound from "./SlotGameSound";
import TurboAutoSpinSettingDialog from "./TurboAutoSpinSettingDialog";

const { ccclass, property } = _decorator;
@ccclass
export default abstract class FeatureSlotGameBase extends NewGameRoomBase {
    //#region override some properties to hide them
    @property({ visible: false, override: true })
    players: any[] = [];

    @property({ visible: false, override: true })
    otherPlayers: Node = null;

    @property({ visible: false, override: true })
    winningPlayerEffectPrefab: Prefab = null;

    @property({ visible: false, override: true })
    betItems: any[] = [];

    @property({ visible: false, override: true })
    timeWaitNode: Node = null;

    @property({ visible: false, override: true })
    timeWaitLabel: Label = null;

    @property({ visible: false, override: true })
    animatedTime: any = null;

    @property({ visible: false, override: true })
    enableChips = false;

    @property({ visible: false, override: true })
    gameAudiosPrefab: Prefab = null;

    @property({ visible: false, override: true })
    md5Component: any = null;

    //end region override
    @property({ type: UserProfile })
    userProfile: UserProfile = null;

    @property(Toggle)
    autoSpinToggle: Toggle = null;

    @property(Toggle)
    turboToggle: Toggle = null;

    @property(Prefab)
    autoSpinDialogPrefab: Prefab = null;

    @property(ClassicSpinButton)
    spinButton: ClassicSpinButton = null;

    @property(Node)
    effectContainer: Node = null;

    @property(Prefab)
    effectBigWin: Prefab = null;

    @property(Prefab)
    effectFreeSpin: Prefab = null;

    @property(HoldActionButton)
    holdActionButton: HoldActionButton = null;

    @property(Node)
    defaultMiniMenu: Node = null;

    @property(SlotGameSongs)
    gameSongList: SlotGameSongs = null;

    songListConfig: any;

    countDownAutoSpin: CountDownWarning = null;
    bottomMessage: SlotGameBottomMessage = null;
    gameSound: SlotGameSound;
    protected autoSpinCount = 0;
    protected lastAutoSpinCount: number;
    protected totalFreeSpins = 0;
    protected cacheApiError: any = null;
    protected isHoldAction: boolean;
    public gameData: FeatureSlotGameData;

    abstract getCurrentTotalBet(): number;
    abstract spin(): boolean;
    abstract setAllowChangeBet(allow: boolean);
    abstract getCustomDuration(type: string): number;

    onLoad() {
        super.onLoad();
        director.on(Director.EVENT_BEFORE_DRAW, this.setDefaultPositionForMiniMenu, this);

        this.initForHoldActionButton();
        this.trackOnLoadEvents();
    }

    trackOnLoadEvents() {
        const location = director.getScene().name;
        AnalyticsManager.Instance.trackEvent(TrackingEvent.Button, {
            location,
            action: TrackingAction.Show,
            object_name: "AutoSpin",
        });
        AnalyticsManager.Instance.trackEvent(TrackingEvent.Button, {
            location,
            action: TrackingAction.Show,
            object_name: "TurboMode",
        });
    }

    initForHoldActionButton() {
        this.holdActionButton.checkPreventFunctioning = () => {
            return (
                this.currentMiniPanel.dialog.childrenCount > 0 ||
                this.currentMiniPanel.guideContainer.childrenCount > 0 ||
                this.currentMiniPanel.effectNode.childrenCount > 0 ||
                this.autoSpinCount > 0
            );
        };
    }

    onDestroy() {
        director.off(Director.EVENT_BEFORE_DRAW, this.setDefaultPositionForMiniMenu, this);
        super.onDestroy();
        const audioManager = AudioManager.getInstance();
        audioManager.removeMusicChanged(`${this.gameId}`);
        audioManager.stopAllSFX();
    }

    outRoomGame(): Promise<void> {
        const audioManager = AudioManager.getInstance();
        audioManager.stopAllSFX();
        return super.outRoomGame();
    }

    onTurboModeChanged(toggle: Toggle) {
        FunctionUtils.playClick();

        const turboWarningName = "turbo_warning";
        this.noticeNode.children.forEach((child) => {
            if (child.name === turboWarningName) {
                child.destroy();
            }
        });

        this.saveSettingKey("turboEnabled", this.turboToggle.isChecked);
        const key = toggle.isChecked ? "enableTurboMode" : "disableTurboMode";
        const message = i18n.t(`messages.${key}`);
        const notice = this.showMiniWarning(message);
        notice.name = turboWarningName;
        this.updateBottomMessageStatus();

        AnalyticsManager.Instance.trackEvent(TrackingEvent.Button, {
            location: director.getScene().name,
            action: toggle.isChecked ? TrackingAction.ToggleOn : TrackingAction.ToggleOff,
            object_name: "TurboMode",
        });
    }

    onAutoSpinChanged() {
        uiManager.emitter.emit(InternalEvents.CLICK_AUTO_SPIN_BUTTON);
        FunctionUtils.playClick();
        const isAutoSpin = this.isAutoSpinMode();
        AnalyticsManager.Instance.trackEvent(TrackingEvent.Button, {
            location: director.getScene().name,
            action: isAutoSpin ? TrackingAction.ToggleOn : TrackingAction.ToggleOff,
            object_name: "AutoSpin",
        });

        if (!this.isReadyBet() || !isAutoSpin || !this.checkAvailableBalance()) {
            this.onAutoSpinOff();
            return;
        }

        this.updateBottomMessageStatus();
        if (!this.isFreeSpin()) {
            this.createAutoSpinDialog();
            this.setAllowChangeBet(false);
        }
    }

    onAutoSpinOff() {
        this.autoSpinToggle.isChecked = false;
        this.saveSettingKey("autoSpin", this.autoSpinToggle.isChecked);
        this.setAutoSpinCount(0);
        this.updateBottomMessageStatus();
        this.gameData.spinButtonStateModel.change(SpinButtonState.Normal);
    }

    checkAvailableBalance(): boolean {
        const total = this.getCurrentTotalBet();
        if (this.getUserBalance() < total) {
            this.showMiniWarning(i18n.t("messages.notEnoughMoney"));
            return false;
        }
        return true;
    }

    createAutoSpinDialog(): AutoSpinSettingDialog {
        const node = instantiate(this.autoSpinDialogPrefab);
        this.currentMiniPanel.effectNode.addChild(node);
        const dialog = node.getComponent(AutoSpinSettingDialog);

        dialog.onConfirmCallback = (autoSpinCount: number) => {
            this.onConfirmCallBackAutoSpinDialog(autoSpinCount);
        };

        dialog.onCancelCallback = () => this.onCancelCallbackAutoSpinDialog();

        if (this.lastAutoSpinCount) {
            dialog.setLastSelected(this.lastAutoSpinCount);
            this.saveSettingKey("autoSpin", this.autoSpinToggle.isChecked);
        }

        const turboDialog = dialog.node.getComponent(TurboAutoSpinSettingDialog);
        if (turboDialog) {
            turboDialog.syncTurboToggle(this.turboToggle.isChecked);
            turboDialog.turboChangedCallback = (value: boolean) => this.setAndSaveSettingTurbo(value);
        }

        return dialog;
    }

    onConfirmCallBackAutoSpinDialog(autoSpinCount) {
        this.setAutoSpinCount(autoSpinCount);
        this.lastAutoSpinCount = autoSpinCount;
        this.gameData.spinButtonStateModel.change(SpinButtonState.AutoSpin);
        this.spin();
    }

    onCancelCallbackAutoSpinDialog() {
        this.onAutoSpinOff();
    }

    setAndSaveSettingTurbo(value: boolean) {
        this.turboToggle.isChecked = value;
        this.saveSettingKey("turboEnabled", this.turboToggle.isChecked);
    }

    isAutoSpinMode() {
        return this.autoSpinToggle.isChecked;
    }

    isTurboMode(): boolean {
        return this.turboToggle.isChecked || this.isHoldAction;
    }

    isFreeSpin(): boolean {
        return this.totalFreeSpins > 0;
    }

    stillAutoSpin() {
        return this.autoSpinCount > 0;
    }

    consumeAutoSpinCount() {
        if (this.autoSpinCount > 0 && !this.isFreeSpin()) {
            this.setAutoSpinCount(this.autoSpinCount - 1);
        }
    }

    consumeFreeSpinCount() {
        if (this.totalFreeSpins > 0) {
            this.setTotalFreeSpins(this.totalFreeSpins - 1);
        }
    }

    setTotalFreeSpins(count: number) {
        this.totalFreeSpins = count;
    }

    setAutoSpinCount(count: number) {
        this.autoSpinCount = count;
        this.spinButton.setAutoSpinCount(count);
        this.bottomMessage.autoSpinCount = count;
    }

    updateBottomMessageStatus() {
        if (!this.bottomMessage) {
            return;
        }
        this.bottomMessage.isAutoSpin = this.isAutoSpinMode() && !this.isFreeSpin();
        this.bottomMessage.isTurboMode = this.isTurboMode();
    }

    showEffect(effect: Node): Promise<void> {
        return new Promise<void>((resolve) => {
            this.effectContainer?.addChild(effect);

            const animation = effect.getComponent(CallbackAnimation);
            animation.onFinishedCallback = () => {
                this.currentMiniPanel.popupMiniGame.node.active = true;
                resolve();
            };
            animation.play();
            this.currentMiniPanel.popupMiniGame.node.active = false;
        });
    }

    async showEffectBigWin(betWin: number) {
        const effect = instantiate(this.effectBigWin);
        const callbackAnim = effect.getComponent(CallbackAnimation);
        callbackAnim.setDuration(this.getCustomDuration("bigWin"));
        const bigWinAnimation = effect.getComponent(BigWinAnimation);
        const floatNumberDuration = this.getCustomDuration("bigWinFloatNumber");
        bigWinAnimation.setAmount({ amount: betWin, duration: floatNumberDuration });
        await GameUtils.asyncExecute(this?.node, this.showEffect(effect));
    }

    async showEffectFreeSpins(count: number) {
        const effect = instantiate(this.effectFreeSpin);
        const callbackAnim = effect.getComponent(CallbackAnimation);
        callbackAnim.setDuration(this.getCustomDuration("freeSpin"));
        const bigWinAnimation = effect.getComponent(BigWinAnimation);
        bigWinAnimation.setAmount({ amount: count, noZeroSuffix: true });
        await GameUtils.asyncExecute(this?.node, this.showEffect(effect));
    }

    showNoticeForCacheApiError() {
        if (this.cacheApiError) {
            const error = this.cacheApiError;
            this.currentMiniPanel.handleAPIError(error);
            this.cacheApiError = null;

            return true;
        }
        return false;
    }

    initCountDownWarning(node: Node) {
        this.countDownAutoSpin = node.getComponent(CountDownWarning);
        this.countDownAutoSpin.node.active = false;
    }

    setDefaultPositionForMiniMenu() {
        if (!this.currentMiniPanel.popupMiniGame) {
            return;
        }

        const node = this.currentMiniPanel.popupMiniGame.node;
        const wPosition = this.defaultMiniMenu.convertToWorldSpaceAR(v2(0, 0));
        const localPosition = node.parent.convertToNodeSpaceAR(wPosition);
        this.currentMiniPanel.popupMiniGame.setDefaultPosition(v3(localPosition));

        director.off(Director.EVENT_BEFORE_DRAW, this.setDefaultPositionForMiniMenu, this);
    }

    initShowBottomMessage(node: Node) {
        this.bottomMessage = node.getComponent(SlotGameBottomMessage);
    }

    onSoundListInitialized(node: Node) {
        this.gameSound = node.getComponent(SlotGameSound);
    }

    onSpinClick(hold: boolean) {
        uiManager.emitter.emit(InternalEvents.CLICK_SPIN_BUTTON);
        this.isHoldAction = hold;
        this.spin();
    }

    clearHoldActionFlag() {
        this.isHoldAction = false;
    }

    get isOwnGameMusicBackground(): boolean {
        return !!this.gameSongList || !!this.musicBg;
    }

    async playInvidiualMusic() {
        this.gameSongList ? await this.gameSongList?.play() : await super.playInvidiualMusic();
    }

    stopInvidiualMusic() {
        this.gameSongList?.stop();
        super.stopInvidiualMusic();
    }

    clickOutsideReelArea() {
        uiManager.emitter.emit(InternalEvents.CLICK_OUTSIDE_REEL_AREA);
    }
}

*/
