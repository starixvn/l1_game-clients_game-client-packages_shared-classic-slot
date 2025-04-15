import { _decorator, AudioSource, Button, director, instantiate, Label, Node, Prefab, sp, Toggle, ToggleContainer, Tween, tween } from "cc";
import { FunctionUtils } from "db://shared-components/shared/utils";
import * as _ from "lodash";
import AnalyticsManager, { TrackingAction, TrackingEvent } from "../../analytics/AnalyticsManager";
import AudioManager from "../../common/audio/AudioManager";
import CallbackAnimation from "../../common/CallbackAnimation";
import ExpandableMenu from "../../common/expandable-menu/view-models/ExpandableMenu";
import GameUtils from "../../common/GameUtils";
import { numberWithCommas } from "../../common/helpers/NumberHelper";
import HoverItemBase from "../../common/HoverItemBase";
import JackpotPoolInfoBase from "../../lobby/main/view-models/JackpotPoolInfoBase";
import { uiManager } from "../../managers/GameUIManager";
import { InternalEvents } from "../../managers/InternalEvents";
import { GameState } from "../_base/GameState";
import AutoSpinSettingDialog from "./AutoSpinSettingDialog";
import BigWinAnimation from "./BigWinAnimation";
import BonusDialog from "./BonusDialog";
import { ClassicSlotSound } from "./ClassicSlotSound";
import FeatureSlotGameBase from "./FeatureSlotGameBase";
import SlotGameBaseNoticeHandler from "./handlers/SlotGameBaseNoticeHandler";
import SlotGameBetHandler from "./handlers/SlotGameBetHandler";
import SlotGameBonusHandler from "./handlers/SlotGameBonusHandler";
import SlotGameIngameHandler from "./handlers/SlotGameIngameHandler";
import SlotGameJackpotHandler from "./handlers/SlotGameJackpotHandler";
import SlotGameSettlementHandler from "./handlers/SlotGameSettlementHandler";
import LineSelectionDialog from "./LineSelectionDialog";
import LineView from "./LineView";
import SlotBoard from "./SlotBoard";
import { SlotGameBaseConfigs } from "./SlotGameBaseConfigs";
import { SlotNotification } from "./SlotGameBottomMessage";
import SlotGameHistory from "./SlotGameHistory";
import SlotGameTopWinner from "./SlotGameTopWinner";
import SlotGameUserSettings from "./SlotGameUserSettings";

export interface LineData {
    payline: number;
    positions: number[];
    symbol: number;
}

const { ccclass, property } = _decorator;

@ccclass
export default class SlotGameBase extends FeatureSlotGameBase {
    @property(SlotBoard)
    slotBoard: SlotBoard = null;

    @property(HoverItemBase)
    leftNumberContainer: HoverItemBase = null;

    @property(HoverItemBase)
    rightNumberContainer: HoverItemBase = null;

    @property(Node)
    lineContainer: Node = null;

    @property(Node)
    winningNode: Node = null;

    @property(Button)
    stakeButton: Button = null;

    @property(ToggleContainer)
    stakeContainer: ToggleContainer = null;

    @property(Button)
    lineButton: Button = null;

    @property(Label)
    stakeLabel: Label = null;

    @property(Label)
    jackpotPoolLabel: Label = null;

    @property(Label)
    lineLabel: Label = null;

    @property(Label)
    totalBet: Label = null;

    @property(Label)
    winningBet: Label = null;

    @property(Node)
    winningBetEffect: Node = null;

    @property(Prefab)
    lineSelectionDialog: Prefab = null;

    @property(Prefab)
    bonusDialog: Prefab = null;

    @property(ExpandableMenu)
    expandableMenu: ExpandableMenu = null;

    @property(Prefab)
    topWinnerPrefab: Node = null;

    @property(Prefab)
    effectBonus: Prefab = null;

    @property(Prefab)
    effectJackpot: Prefab = null;

    @property(JackpotPoolInfoBase)
    jackpotPoolInfo: JackpotPoolInfoBase = null;

    @property({ type: AudioSource })
    soundSources: AudioSource[] = [];

    @property
    autoGenerateLines = false;

    @property({
        type: Prefab,
        visible: function (this: SlotGameBase) {
            return this.autoGenerateLines;
        },
    })
    linePrefab: Prefab = null;

    @property({
        type: Prefab,
        visible: function (this: SlotGameBase) {
            return this.autoGenerateLines;
        },
    })
    lightLinePrefab: Prefab = null;

    @property
    isAccelerate = false;

    protected betChoices: number[] = [];
    protected stake: number;
    protected ingameHandler: SlotGameIngameHandler;
    protected settlementHandler: SlotGameSettlementHandler;
    protected jackpotHandler: SlotGameJackpotHandler;
    protected bonusHandler: SlotGameBonusHandler;
    protected jackpotPoolValue = -1;
    public slotGameConfigs: SlotGameBaseConfigs;
    public settleTween: Tween;
    public showWinningLinesTween: Tween;
    public showLoopWinningLinesTween: Tween;
    public isAnimatingResult = false;
    public totalFreeSpins = 0;
    public jackpotPool = {};
    public onOpenBonusChest: (data: any) => void;
    public onOpenJackpotChest: (data: any) => void;
    public waitingSpinResult = false;
    public cacheApiError: any = null;
    public isShowAutoSpinSettingDialog = false;
    public isRound = false;
    public autoOpenAutoSpinDialog = false;
    protected userSettings: SlotGameUserSettings;
    private showingWinningLine = false;
    private _jackpotEnabled = false;
    normalPaylineDuration = 1;
    turboPaylineDuration = 0.75;
    isFinishedRound = true;
    receiviedJackpotPools;
    isSpinnedAction = false;

    public get jackpotEnabled() {
        return this._jackpotEnabled;
    }

    public set jackpotEnabled(value) {
        this._jackpotEnabled = value;
    }

    setAllowChangeBet(allow: boolean) {
        this.stakeButton.interactable = allow;
    }

    async loadPrefabsByCode() {
        //empty
    }

    onLoad() {
        super.onLoad();

        this.initEventForNumberContainer();
        this.initSlotGameConfig();
        this.node.on(Node.EventType.SIZE_CHANGED, () => this.hideAllLines());
        this.showJackpotInfo();
        this.loadPrefabsByCode().then(() => {
            this.initSlotBoard();
            if (this.autoGenerateLines) {
                this.createAllLines();
            }
        });
        this.initBottomMessage();
        this.initBottomArea();
        this.initDefaultBetChoices();
    }

    initSlotBoard() {
        this.loadSlotGameConfig();
        this.slotBoard.initReels();
        this.setBoardFullItems();
    }

    protected onGameHide() {
        super.onGameHide();
        this.saveUserSetting();
    }

    override stopGame() {
        // override
    }

    protected showJackpotInfo() {
        if (!this.jackpotPoolInfo || !this.jackpotPoolLabel) {
            return;
        }
        this.jackpotPoolInfo.node.active = this.jackpotEnabled;
        this.jackpotPoolLabel.node.parent.active = this.jackpotEnabled;
    }

    showMessageDisplay(roundType: SlotNotification) {
        this.bottomMessage?.showMessages(roundType);
    }

    loadUserSetting() {
        let settings = GameUtils.getGameSetting(this.gameId);

        if (!settings.betChoices) {
            const defaultSettings: SlotGameUserSettings = {
                betChoices: this.betChoices,
                stake: this.stake,
                turboEnabled: false,
            };
            settings = defaultSettings;
        }

        this.turboToggle.isChecked = settings.turboEnabled;
        this.setBetChoices(settings.betChoices);
        this.setStake(settings.stake);

        //clear setting
        GameUtils.clearGameSetting(this.gameId);
    }

    getStakeLevels(): number[] {
        return this.gameConfigs?.stakeLevels;
    }

    updateStakeContainer() {
        if (!this.stakeContainer || !this.gameConfigs) {
            return;
        }
        this.stakeContainer.toggleItems.forEach((item, index) => {
            if (this.stake === this.getStakeLevels()[index]) {
                item.isChecked = true;
            } else {
                // fix ToggleContainer not activeInHierarchy
                item._hideCheckMark();
            }
        });
    }

    saveUserSetting() {
        if (this.betChoices.length === 0 || !this.stake) {
            return;
        }

        const currentSetting: SlotGameUserSettings = {
            betChoices: this.betChoices,
            stake: this.stake,
            turboEnabled: this.turboToggle.isChecked,
        };

        GameUtils.setGameSetting(this.gameId, currentSetting);
    }

    initDefaultBetChoices() {
        if (this.betChoices.length === 0) {
            this.setBetChoices([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
        }
    }

    setBetChoices(betChoices: number[]) {
        this.betChoices = [...betChoices];
        this.updateLineChanged();
    }

    initSlotGameConfig() {
        //empty
    }

    loadSlotGameConfig() {
        if (!this.slotGameConfigs) {
            return;
        }
        this.slotBoard.setConfig(this.slotGameConfigs);
        this.slotBoard.gameId = this.gameId;
    }

    loadStakeLevelsConfig() {
        if (!this.stakeContainer || !this.gameConfigs) {
            return;
        }
        this.setStake(!this.isAccelerate ? this.getStakeLevels()[0] || 0 : this.gameConfigs?.defaultBetLevel);
        this.setBetLevels(this.getStakeLevels());
        this.stakeContainer.toggleItems.forEach((item, index) => {
            item.node.getChildByName("value").getComponent(Label).string = numberWithCommas(
                this.getStakeLevels()[index],
                this.numberToFixed()
            );
        });
        this.loadUserSetting();
    }

    setBetLevels(betLevels: number[]) {
        //empty
    }

    updateDisplayForRemoteConfig() {
        super.updateDisplayForRemoteConfig();
        this.loadStakeLevelsConfig();
    }

    createLineView(child: Node) {
        const node = new Node();
        const view = node.addComponent(LineView);
        view.linePrefab = this.linePrefab;
        view.lightPrefab = this.lightLinePrefab;
        view.board = this.slotBoard;
        view.label = child;
        node.name = child.name;
        node.active = false;
        return view;
    }

    createAllLines() {
        this.leftNumberContainer.node.children.forEach((child) => {
            const view = this.createLineView(child);
            view.isLabelLeft = true;
            this.lineContainer.addChild(view.node);
        });

        this.rightNumberContainer.node.children.forEach((child) => {
            const view = this.createLineView(child);
            view.isLabelLeft = false;
            this.lineContainer.addChild(view.node);
        });
    }

    disableGame() {
        this.gameState = GameState.Disabled;
    }

    setUpHandlers() {
        this.initHandlers();
        this.noticeHandler = new SlotGameBaseNoticeHandler(this);
        this.ingameHandler = new SlotGameIngameHandler(this);
        this.settlementHandler = new SlotGameSettlementHandler(this);
        this.jackpotHandler = new SlotGameJackpotHandler(this);
        this.bonusHandler = new SlotGameBonusHandler(this);
        this.betHandler = new SlotGameBetHandler(this);

        this.addHandlers(
            this.umHandler,
            this.noticeHandler,
            this.errorHandler,
            this.configsHandler,
            this.betHandler,

            this.ingameHandler,
            this.settlementHandler,
            this.jackpotHandler,
            this.bonusHandler
        );
    }

    clearWinningBet() {
        const winningBet = this.winningNode.getChildByName("winningBet");
        winningBet && winningBet.destroy();
    }

    private blinkUserBalance() {
        const currentScale = this.userProfile.userBalance.node.scale;
        tween(this.userProfile.userBalance.node)
            .repeat(
                3,
                cc
                    .tween()
                    .to(0.1, { scale: currentScale + 0.1 })
                    .to(0.1, { scale: currentScale })
            )
            .start();
    }

    private blinkWinningBet() {
        const originalScale = this.winningBet.node.scale;

        tween(this.winningBet.node)
            .repeat(
                3,
                cc
                    .tween()
                    .to(0.1, { scale: originalScale + 0.1 })
                    .to(0.1, { scale: originalScale })
            )
            .start();
    }

    showAcceptedBet(bet: number) {
        this.blinkUserBalance();
    }

    showWinningBet(bet: number) {
        this.playAnimationWinningBet();
        this.playSound(ClassicSlotSound.WIN);
        this.updateWinningBetLabel(bet);
        this.blinkWinningBet();
    }

    playAnimationWinningBet() {
        this.winningBetEffect.active = true;
        const skeleton = this.winningBetEffect.getComponent(sp.Skeleton);
        skeleton.setAnimation(0, skeleton.animation, false);
    }

    updateWinningBetLabel(bet: number) {
        this.updateUserBalance();
        this.winningBet.string = numberWithCommas(bet, this.numberToFixed());
    }

    onLineSelectionClick() {
        uiManager.emitter.emit(InternalEvents.CLICK_LINE_SELECTION_BUTTON);
        FunctionUtils.playClick();
        this.expandableMenu.collapseMenu();
        this.hideStakeContrainer();

        const node = instantiate(this.lineSelectionDialog);
        this.currentMiniPanel.addDialog(node);

        const dialog = node.getComponent(LineSelectionDialog);
        dialog.isAccelerate = this.isAccelerate;
        dialog.setCheckItems(this.betChoices);
        dialog.onConfirmCallback = (betChoices) => {
            this.betChoices = betChoices;
            this.updateLineChanged();
            if (betChoices.length === 0) {
                this.deactiveSpinButton();
                this.autoSpinToggle.interactable = false;
                this.autoSpinToggle.isChecked = false;
            } else {
                this.activeSpinButton();
                this.autoSpinToggle.interactable = true;
            }
        };
    }

    onStakeButtonClick() {
        FunctionUtils.playClick();
        this.expandableMenu.collapseMenu();

        const isShowing = this.isShowStakeLevels();
        if (!isShowing) {
            this.showStakeContainer();
        } else {
            this.hideStakeContrainer();
        }
    }

    isShowStakeLevels(): boolean {
        return this.stakeContainer && this.stakeContainer.node.active && this.stakeContainer.node.scaleY === 1;
    }

    hideStakeContrainer() {
        if (!this.stakeContainer) {
            return;
        }
        const node = this.stakeContainer.node;
        tween(node)
            .to(0.2, { scaleY: 0 })
            .call(() => {
                node.active = false;
            })
            .start();
    }

    showStakeContainer() {
        if (!this.stakeContainer) {
            return;
        }
        const node = this.stakeContainer.node;
        node.active = true;
        node.scaleY = 0;
        tween(node).to(0.2, { scaleY: 1 }).start();
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
        this.expandableMenu.collapseMenu();
        this.deactiveButtons();
        this.hideStakeContrainer();

        if (!isAutoSpin || !this.checkAvailableBalance()) {
            this.resetStateButtons();
            return;
        }

        if (!this.isAnimatingResult && !this.isFreeSpin()) {
            this.createAutoSpinDialog();
        }

        this.bottomMessage && (this.bottomMessage.isAutoSpin = this.isAutoSpinMode() && !this.isFreeSpin());
    }

    onTurboModeChanged(toggle: Toggle) {
        super.onTurboModeChanged(toggle);
        this.hideStakeContrainer();
    }

    createAutoSpinDialog(): AutoSpinSettingDialog {
        this.isShowAutoSpinSettingDialog = true;
        return super.createAutoSpinDialog();
    }

    onConfirmCallBackAutoSpinDialog(autoSpinCount) {
        this.setAutoSpinCount(autoSpinCount);
        this.updateModeSpinButton(false);
        this.lastAutoSpinCount = autoSpinCount;
        this.spin();
        this.isShowAutoSpinSettingDialog = false;
        this.autoOpenAutoSpinDialog = false;
    }

    onCancelCallbackAutoSpinDialog() {
        this.resetStateButtons();
        this.isShowAutoSpinSettingDialog = false;
        this.autoOpenAutoSpinDialog = false;
    }

    setAutoSpinCount(count: number) {
        this.autoSpinCount = count;
        if (this.bottomMessage) {
            this.bottomMessage.autoSpinCount = count;
        } else {
            this.spinButton && this.spinButton.setAutoSpinCount(count);
        }
    }

    getCurrentTotalBet() {
        if (this.stake) {
            const total = +this.stake.toFixed(2) * this.betChoices.length;
            return +total;
        }
        return 0;
    }

    protected setTotalBetLabel(text: string) {
        if (!this.totalBet) {
            return;
        }
        this.totalBet.string = text;
    }

    updateTotalBetLabel() {
        const total = this.getCurrentTotalBet();
        this.setTotalBetLabel(numberWithCommas(total, this.numberToFixed()));
    }

    setStake(stake: number) {
        this.stake = stake;

        this.stakeLabel && (this.stakeLabel.string = numberWithCommas(stake, this.numberToFixed()));

        this.onStakeChanged();
    }

    updateLineChanged() {
        this.lineLabel && (this.lineLabel.string = `${this.betChoices.length}`);
        this.updateTotalBetLabel();
    }

    onStakeToggleChanged(event: Event, param: string) {
        FunctionUtils.playClick();
        this.setStake(this.getStakeLevels()[+param]);
    }

    onStakeQuickChange(event: Event) {
        FunctionUtils.playClick();
        const increase = event.target.name === "increase";
        let index = this.findIndexStakeLevel();
        index += increase ? 1 : -1;
        if (index < 0 || index > this.getStakeLevels().length - 1) {
            return;
        }

        this.setStake(this.getStakeLevels()[index]);
    }

    findIndexStakeLevel(): number {
        return this.getStakeLevels().findIndex((stake) => stake === this.stake);
    }

    protected onStakeChanged() {
        this.updateTotalBetLabel();
        this.updateJackpotPool();
        this.updateStakeContainer();
        this.hideStakeContrainer();
        if (this.jackpotPoolInfo && !this.isAccelerate) {
            this.jackpotPoolInfo.setHighlight(this.findIndexStakeLevel());
        }
    }

    protected generateRandomBoardData() {
        const data = [];
        const itemTypeCount = this.slotGameConfigs.itemTypeCount;

        for (let i = 0; i < 15; i++) {
            if (i < itemTypeCount) {
                data.push(i);
            } else {
                data.push(_.random(itemTypeCount - 1));
            }
        }
        return _.shuffle(data);
    }

    setBoardFullItems() {
        const data = this.generateRandomBoardData();
        this.slotBoard.setBoardData(data);
        this.slotBoard.applyData(data);
    }

    onSpinClick(hold: boolean) {
        uiManager.emitter.emit(InternalEvents.CLICK_SPIN_BUTTON);
        FunctionUtils.playClick();
        this.isHoldAction = hold;
        this.updateBottomMessageStatus();
        this.spinAction();
    }

    spinAction() {
        this.expandableMenu.collapseMenu();
        const success = this.spin();
        if (success) {
            this.lineButtonStatus(false);
            this.stakeButton.interactable = false;
        }
    }

    lineButtonStatus(status: boolean) {
        if (this.isAccelerate) {
            return;
        }
        if (this.lineButton) {
            this.lineButton.interactable = status;
        }
    }

    async setDataAndSpin(data: any) {
        this.playSound(ClassicSlotSound.SPIN);
        this.winningBet.string = "0";
        this.slotBoard.setBoardData(data);
        this.spinButton.playAnimationSpin();
        const turbo = this.isTurboMode();
        this.playSound(turbo ? ClassicSlotSound.SPINNING_TURBO : ClassicSlotSound.SPINNING_NORMAL);
        const spinDuration = this.getCustomDuration("spin");
        this.addSoundStopReel(turbo, spinDuration);
        await GameUtils.asyncExecute(this.slotBoard?.node, this.slotBoard.spin(spinDuration, turbo));
        this.spinButton.playAnimationIdle();
    }

    addSoundStopReel(turbo: boolean, spinDuration: number) {
        if (!turbo) {
            tween(this.node)
                .delay(spinDuration * 0.5)
                .call(() => {
                    this.playSound(ClassicSlotSound.REEL_STOP);
                })
                .start();
        }
    }

    spin(): boolean {
        let success = false;
        if (this.betChoices.length === 0 || this.isAnimatingResult || this.isReceivedUMData || !this.isReadyBet()) {
            return success;
        }

        const balanceAvailable = this.isFreeSpin() || this.checkAvailableBalance();
        if (!balanceAvailable) {
            this.resetStateButtons();
            return success;
        }

        if (this.waitingProcessing) {
            !this.isHoldAction && this.showProcessingWarning(true);
            return success;
        }
        this.isFinishedRound = false;
        this.stopAllFinishTweens();
        this.hideStakeContrainer();
        this.hideWinningEffectOnItems();

        this.lockBet();
        const isFreeSpin = this.isFreeSpin();
        const data = {
            betChoice: this.betChoices,
            amount: this.stake,
            freeSpin: isFreeSpin,
            clientSentTime: new Date(),
        };

        this.waitingSpinResult = true;
        if (!isFreeSpin) {
            this.consumeAutoSpinCount();
        }
        this.showMessageDisplay(SlotNotification.SPINNING);
        this.socket.emit("bet", data);
        this.isSpinnedAction = true;
        success = true;
        return success;
    }

    setTotalFreeSpins(value: number) {
        this.totalFreeSpins = value;
        this.bottomMessage && (this.bottomMessage.freeSpinCount = value);
    }

    updateDisplaySpinButtons() {
        this.spinButton.setFreeSpinValue(this.totalFreeSpins);
        const showFreeSpin = this.totalFreeSpins >= 0;
        this.updateModeSpinButton(showFreeSpin);
    }

    updateModeSpinButton(isFreeSpin: boolean) {
        if (isFreeSpin) {
            this.setTotalBetLabel("0");
            this.spinButton.showFreeSpinMode();
            return;
        }
        this.updateTotalBetLabel();
        const showAutoSpin = this.stillAutoSpin() && this.isAutoSpinMode();
        if (showAutoSpin) {
            this.spinButton.showAutoSpinMode();
            return;
        }

        this.spinButton.showNormalMode();
    }

    showActiveFreeSpinButton() {
        this.spinButton.showTextSpinInFreeSpin(true);
        this.activeSpinButton();
    }

    activeSpinButton() {
        this.spinButton.active();
    }

    deactiveSpinButton() {
        this.spinButton.deactive();
    }

    deactiveButtons() {
        this.deactiveSpinButton();
        this.lineButtonStatus(false);
        this.stakeButton.interactable = false;

        if (!this.isAutoSpinMode()) {
            this.autoSpinToggle.interactable = false;
        }
    }

    activeButtons() {
        const isFreeSpin = this.isFreeSpin();
        const isAutoSpinMode = this.isAutoSpinMode();
        const notAutoSpinByKeySpaceOrHold = !this.holdActionButton.isAutoAction;

        if (isAutoSpinMode || isFreeSpin) {
            this.deactiveSpinButton();
        } else {
            this.activeSpinButton();
        }

        const canChangeStakeAndLine = !isAutoSpinMode && !isFreeSpin && notAutoSpinByKeySpaceOrHold;
        this.lineButtonStatus(canChangeStakeAndLine);
        this.stakeButton.interactable = canChangeStakeAndLine;

        this.autoSpinToggle.interactable = (isAutoSpinMode || !isFreeSpin) && notAutoSpinByKeySpaceOrHold;
    }

    initEventForNumberContainer() {
        const callback = {
            onMove: (e) => {
                if (!this.showingWinningLine) {
                    this.showLineWhenHover(e);
                }
            },
            onLeave: (e) => {
                if (!this.showingWinningLine) {
                    this.hideAllLines();
                }
            },
        };
        this.leftNumberContainer.touchCallback = callback;
        this.rightNumberContainer.touchCallback = callback;
    }

    showLineWhenHover(e) {
        const container: Node = e.getCurrentTarget();
        const localPosition = container.convertToNodeSpaceAR(e.getLocation());
        container.children.forEach((child) => {
            const show = child.getBoundingBox().contains(localPosition);
            this.showLine(+child.name, show);
        });
    }

    hideAllLines() {
        this.lineContainer.children.forEach((child) => (child.active = false));
    }

    showLine(num: number, show = true) {
        const line = this.lineContainer.getChildByName(`${num}`);
        if (line) {
            line.active = show;
        }
    }

    showWinningLines(winningLines: LineData[], delayTime: number) {
        if (winningLines.length === 0) {
            return;
        }
        this.playSound(ClassicSlotSound.SYMBOL_WIN);
        winningLines.forEach((line) => this.showLine(line.payline + 1));

        this.showingWinningLine = true;
        this.showWinningLinesTween = cc
            .tween(this)
            .delay(delayTime)
            .call(() => {
                this.showLoopWinningLines(winningLines);
            })
            .start();
    }

    showLoopWinningLines(winningLines: LineData[]) {
        const length = winningLines.length;
        const timeShowPayline = this.getWinningPaylineDuration();
        if (length === 0) {
            return;
        }
        let index = 0;
        this.showLoopWinningLinesTween = cc
            .tween(this)
            .repeatForever(
                cc
                    .tween()
                    .call(() => {
                        if (index === length) {
                            index = 0;
                        }
                        this.hideAllLines();
                        this.hideWinningEffectOnItems();
                        const line = winningLines[index];
                        this.showLine(line.payline + 1);
                        this.slotBoard.showWinningEffect(line.positions, +line.symbol);
                        index++;
                    })
                    .delay(timeShowPayline)
            )
            .start();
    }

    getWinningPaylineDuration(): number {
        return this.isTurboMode() ? this.turboPaylineDuration : this.normalPaylineDuration;
    }

    stopAllFinishTweens() {
        this.isAnimatingResult = false;
        this.clearWinningBet();
        this.hideAllLines();
        if (this.settleTween) {
            this.settleTween.stop();
        }

        this.showingWinningLine = false;
        if (this.showWinningLinesTween) {
            this.showWinningLinesTween.stop();
        }
        if (this.showLoopWinningLinesTween) {
            this.showLoopWinningLinesTween.stop();
        }
    }

    onClickShowHistory() {
        FunctionUtils.playClick();
        this.expandableMenu.collapseMenu();

        const dialog = instantiate(this.historyPrefab);
        this.historyComponent = dialog.getComponent(SlotGameHistory);
        this.historyComponent.init(this.socket);
        this.currentMiniPanel.addDialog(dialog);
    }

    openGuide() {
        FunctionUtils.playClick();
        this.expandableMenu.collapseMenu();
        super.openGuide();
    }

    onClickShowTopWinner() {
        FunctionUtils.playClick();
        this.expandableMenu.collapseMenu();

        const dialog = instantiate(this.topWinnerPrefab);
        const topWinnerComponent = dialog.getComponent(SlotGameTopWinner);
        topWinnerComponent.gameConfigs = this.gameConfigs;
        topWinnerComponent.init(this.socket, this.gameName, this.jackpotEnabled);
        this.currentMiniPanel.addDialog(dialog);
    }

    onClickShowHallOfFame() {
        FunctionUtils.playClick();
        this.expandableMenu.collapseMenu();
    }

    async showEffectFreeSpin() {
        this.playSound(ClassicSlotSound.FREESPIN);
        const effect = instantiate(this.effectFreeSpin);
        const animation = effect.getComponent(CallbackAnimation);
        animation.setDuration(this.getCustomDuration("freespin"));
        await GameUtils.asyncExecute(this?.node, this.showEffect(effect));
        this.updateDisplaySpinButtons();
    }

    getCustomDuration(type: string): number {
        const isTurboMode = this.isTurboMode();
        const info = isTurboMode ? this.slotGameConfigs.turboMode : this.slotGameConfigs.normalMode;
        switch (type) {
            case "bigwin":
                return info.bigWinDuration;
            case "showBigWinValue":
                return info.showBigWinValueDuration;
            case "delayShowBigWinValue":
                return info.delayShowBigWinValue;
            case "freespin":
                return info.freespinDuration;
            case "bonus":
                return info.bonusDuration;
            case "jackpot":
                return info.jackpotDuration;
            case "win":
                return info.winningDuration;
            case "lose":
                return info.noWinningDuration;
            case "spin":
                return info.spinDuration;
            case "acceptedBet":
                return isTurboMode ? 0.5 : 1;
        }
        return 0;
    }

    async showEffectBigWin(betWin: number) {
        this.playSound(ClassicSlotSound.BIG_WIN);

        const effect = instantiate(this.effectBigWin);
        const callbackAnim = effect.getComponent(CallbackAnimation);
        callbackAnim.setDuration(this.getCustomDuration("bigwin"));
        const bigWinAnimation = effect.getComponent(BigWinAnimation);
        const showBigWinValueTime = this.getCustomDuration("showBigWinValue");
        const delayShowBigWinValue = this.getCustomDuration("delayShowBigWinValue");
        bigWinAnimation.setAmount({ amount: betWin, duration: showBigWinValueTime, delayTime: delayShowBigWinValue });

        const delayWinningBetLabel = showBigWinValueTime + delayShowBigWinValue;
        tween(this)
            .delay(delayWinningBetLabel)
            .call(() => this.showWinningBet(betWin))
            .start();
        await GameUtils.asyncExecute(this?.node, this.showEffect(effect));
    }

    protected showBonusDialog(bonus: number, onBonusFinished) {
        const node = instantiate(this.bonusDialog);
        this.currentMiniPanel.addDialog(node);
        const dialog = node.getComponent(BonusDialog);
        dialog.gameId = this.gameId;
        dialog.slotGameConfigs = this.slotGameConfigs;
        dialog.playSoundCallback = this.bonusDialogPlaySound.bind(this);
        this.setBonusCount(dialog, bonus);
        dialog.onBonusFinished = onBonusFinished;
        dialog.onItemClicked = (index) => {
            this.socket.emit("bonus", { chest: index });
        };
        this.onOpenBonusChest = (data) => {
            dialog && dialog.openBonus(data.chest, data.amount);
        };
    }

    protected bonusDialogPlaySound(type: ClassicSlotSound) {
        if (type === ClassicSlotSound.CLICK) {
            FunctionUtils.playClick();
        }
    }

    showEffectBonus(bonus: number): Promise<void> {
        this.playSound(ClassicSlotSound.BONUS);
        return new Promise<void>(async (resolve, reject) => {
            const effect = instantiate(this.effectBonus);
            const animation = effect.getComponent(CallbackAnimation);
            animation.setDuration(this.getCustomDuration("bonus"));
            await GameUtils.asyncExecute(this?.node, this.showEffect(effect));
            this.showBonusDialog(bonus, resolve);
        });
    }

    setBonusCount(dialog: BonusDialog, bonus: number): BonusDialog {
        dialog.setBonusCount(bonus);
        return dialog;
    }

    async showEffectJackpot(amount: number) {
        this.playSound(ClassicSlotSound.JACKPOT);

        const effect = instantiate(this.effectJackpot);
        const callbackAnim = effect.getComponent(CallbackAnimation);
        const jackpotDuration = this.getCustomDuration("jackpot");
        callbackAnim.setDuration(jackpotDuration);
        const bigWinAnimation = effect.getComponent(BigWinAnimation);
        bigWinAnimation.setAmount({ amount: amount, duration: jackpotDuration - 1 });

        await GameUtils.asyncExecute(this?.node, this.showEffect(effect));
    }

    updatePoolData(data: any) {
        if (!this.jackpotEnabled) {
            return;
        }
        this.jackpotPool[data.pool] = data.amount;
        this.updateJackpotPool();
        this.updateJackpotPoolList();
    }

    updateJackpotPool() {
        const poolValue = this.jackpotPool[`${this.stake}`];
        if (poolValue && poolValue !== this.jackpotPoolValue) {
            this.jackpotPoolValue = poolValue;
            GameUtils.floatToNumber({ label: this.jackpotPoolLabel, amount: poolValue, duration: 0.6, noZeroSuffix: false });
        }
    }

    updateJackpotPoolList() {
        const dataList = Object.keys(this.jackpotPool).map((key) => {
            return {
                pool: key,
                amount: this.jackpotPool[key],
            };
        });

        if (this.jackpotPoolInfo) {
            this.jackpotPoolInfo.setData(dataList, true);
            !this.isAccelerate && this.jackpotPoolInfo.setHighlight(this.findIndexStakeLevel());
        }
    }

    showWinningItems(winningLines: any[]) {
        winningLines.forEach((line) => {
            this.slotBoard.showWinningEffect(line.positions, +line.symbol);
        });
    }

    hideWinningEffectOnItems() {
        this.slotBoard.hideWinningEffect();
    }

    showHighlightSpecialSymbols(symbol: number) {
        this.slotBoard.showHighlightSpecialSymbols(symbol);
    }

    gotApiError(): boolean {
        if (this.cacheApiError) {
            const error = this.cacheApiError;
            this.currentMiniPanel.handleAPIError(error);
            this.cacheApiError = null;

            this.resetStateButtons();
            return true;
        }
        return false;
    }

    resetStateButtons() {
        //compare with onAutoSpinOff()
        this.autoSpinToggle.isChecked = false;
        this.setAutoSpinCount(0);
        const isFreeSpin = this.isFreeSpin();
        this.updateModeSpinButton(isFreeSpin);
        this.activeButtons();
        if (isFreeSpin) {
            this.showActiveFreeSpinButton();
        }

        this.updateBottomMessageStatus();
        this.showMessageDisplay(SlotNotification.SETTLED);
    }

    playSound(type: ClassicSlotSound) {
        if (this.soundSources[type]) {
            AudioManager.getInstance().playSFX(this.soundSources[type].clip);
        }
    }

    override checkShowUmMessage(data: any) {
        return !this.isAnimatingResult;
    }

    numberToFixed(): number {
        if (this.isAccelerate) {
            return 2;
        }
        return 1;
    }

    initBottomArea() {
        //empty
    }

    initBottomMessage() {
        //empty
    }

    showHideTopWinnersButton() {
        //empty
    }

    async handleNewJackpot(jackpot: any) {
        //empty
    }
}
