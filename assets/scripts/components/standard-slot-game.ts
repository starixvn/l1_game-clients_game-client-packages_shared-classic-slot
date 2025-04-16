import { BundleManager } from "bundle-management";
import * as _ from "lodash";

import {
    _decorator,
    AudioClip,
    AudioSource,
    Button,
    instantiate,
    JsonAsset,
    Label,
    Node,
    Prefab,
    sp,
    SpriteAtlas,
    Toggle,
    ToggleContainer,
    tween,
    Vec3,
    warn,
} from "cc";
import AudioManager from "../../common/audio/AudioManager";
import CallbackAnimation from "../../common/CallbackAnimation";
import GameUtils from "../../common/GameUtils";
import LocalizedLoadSprite from "../../common/i18n/LocalizedLoadSprite";
import JackpotPoolInfoBase from "../../lobby/main/view-models/JackpotPoolInfoBase";
import { uiManager } from "../../managers/GameUIManager";
import { InternalEvents } from "../../managers/InternalEvents";
import BonusDialog from "./BonusDialog";
import { ClassicSlotSound } from "./classic-slot-sound";
import SlotBottomArea from "./SlotBottomArea";
import SlotGameBase from "./SlotGameBase";
import { SlotNotification } from "./SlotGameBottomMessage";
import StandardSlotBoard from "./StandardSlotBoard";
import StandardSlotBonusDialog from "./StandardSlotBonusDialog";
import { StandardSlotGameConfigs } from "./StandardSlotGameConfigs";
import StandardSlotGameHistory from "./StandardSlotGameHistory";
import SymbolPreview from "./SymbolPreview";
const { ccclass, property } = _decorator;

@ccclass
export default class StandardSlotGame extends SlotGameBase {
    @property({ type: Label, visible: false, override: true })
    jackpotPoolLabel: Label = null;

    @property({ type: JackpotPoolInfoBase, visible: false, override: true })
    jackpotPoolInfo: JackpotPoolInfoBase = null;

    @property({ type: Prefab, visible: false, override: true })
    effectJackpot: Prefab = null;

    @property({ type: Prefab, visible: false, override: true })
    effectBonus: Prefab = null;

    @property({ type: Prefab, visible: false, override: true })
    effectBigWin: Prefab = null;

    @property({ type: Prefab, visible: false, override: true })
    effectFreeSpin: Prefab = null;

    @property({ type: Prefab, visible: false, override: true })
    bonusDialog: Prefab = null;

    @property({ type: Prefab, visible: false, override: true })
    linePrefab: Prefab = null;

    @property({ type: Prefab, visible: false, override: true })
    lightLinePrefab: Prefab = null;

    @property({ type: Prefab })
    slotBottomAreaPrefab: Prefab = null;

    @property({ type: Prefab })
    bottomMessagePrefab: Prefab = null;

    @property({ type: AudioSource, visible: false, override: true })
    soundSources: AudioSource[] = [];

    @property({ type: Toggle, visible: false, override: true })
    autoSpinToggle: Toggle = null;

    @property({ type: Toggle, visible: false, override: true })
    turboToggle: Toggle = null;

    @property({ type: Button, visible: false, override: true })
    stakeButton: Button = null;

    @property({ type: ToggleContainer, visible: false, override: true })
    stakeContainer: ToggleContainer = null;

    @property({ type: Button, visible: false, override: true })
    lineButton: Button = null;

    @property({ type: Label, visible: false, override: true })
    stakeLabel: Label = null;

    @property({ type: Label, visible: false, override: true })
    lineLabel: Label = null;

    @property({ type: Label, visible: false, override: true })
    totalBet: Label = null;

    @property({ type: Label, visible: false, override: true })
    winningBet: Label = null;

    @property({ type: Node, visible: false, override: true })
    winningBetEffect: Node = null;

    @property({ type: AudioSource, visible: false, override: true })
    musicBg: AudioSource = null;

    @property(Node)
    bottomMessageArea: Node = null;

    @property(Node)
    bottomArea: Node = null;

    @property(JsonAsset)
    musicInfo: JsonAsset = null;

    @property(JsonAsset)
    colorInfo: JsonAsset = null;

    @property
    protected _gameId = 0;
    @property
    public get gameId(): number {
        return this._gameId;
    }
    public set gameId(value) {
        this._gameId = value;
    }

    normalPaylineDuration = 1.3;
    turboPaylineDuration = 1.3;

    protected audioClips = {};
    protected jackpotSymbolIndex = 10;
    private readonly previewSymbolLeft: Prefab;
    private readonly previewSymbolRight: Prefab;
    private readonly effectTransitionPrefab: Prefab;
    private colorConfig: any;
    private betLevelsContainerNode: Node = null;
    private slotBottomArea: SlotBottomArea = null;

    slotBoard: StandardSlotBoard;

    onLoad() {
        this.initColorConfig();
        this.loadAudios();
        super.onLoad();
        this.loadSpritesWithGameId();
        this.updateBalanceColor();
        uiManager.emitterListener(InternalEvents.SLOT_PLAY_SOUND, (type: ClassicSlotSound) => this.playSound(type), this);
        uiManager.emitterListener(InternalEvents.CLICK_HAMBURGER_MENU, () => this.hideStakeContrainer(), this);
    }

    onDestroy() {
        uiManager.removeListenersWithTarget(this);
        super.onDestroy();
    }

    updateBalanceColor() {
        this.userProfile.updateColor(this.colorConfig.bottomAreaWinAmountColor);
    }

    protected initColorConfig() {
        this.colorConfig = this.colorInfo.json;
    }

    protected initGameSongList() {
        this.songListConfig = this.musicInfo.json;
        super.initGameSongList();
    }

    loadSpritesWithGameId() {
        this.node.getComponentsInChildren(LocalizedLoadSprite).forEach((comp) => {
            comp.gameId = this.gameId;
        });
    }

    protected getPrefabsList() {
        return {
            // prefab name : prefab property
            "effect-transition": "effectTransitionPrefab",

            "effect-bonus": "effectBonus",
            "effect-big-win": "effectBigWin",
            "effect-freespin": "effectFreeSpin",

            "dialog-bonus": "bonusDialog",

            "line-normal": "linePrefab",
            "line-glow": "lightLinePrefab",

            "preview-symbol-left": "previewSymbolLeft",
            "preview-symbol-right": "previewSymbolRight",
        };
    }

    async loadPrefabsByCode() {
        const dict = this.getPrefabsList();

        for (const key of Object.keys(dict)) {
            await GameUtils.asyncExecute(this?.node, this.loadPrefabWithBundle(key, dict[key]));
        }
    }

    async loadPrefabWithBundle(prefabName: string, prefabProperty: string) {
        const path = `preload/prefabs/${prefabName}`;
        const devPath = `../games/*/${path}`;
        try {
            const prefab = await BundleManager.getInstance().loadAsset<Prefab>({
                bundleId: this.gameId.toString(),
                path: path,
                pathForDevMode: devPath,
                type: Prefab,
            });

            this[prefabProperty] = prefab;
        } catch (e) {
            warn(`Missing prefab for ${path} `, e);
        }
    }

    loadAudios() {
        const dict = {
            [ClassicSlotSound.SPIN]: "spin-button",
            [ClassicSlotSound.WIN]: "win",
            [ClassicSlotSound.BIG_WIN]: "big-win",
            [ClassicSlotSound.JACKPOT]: "jackpot-hit",
            [ClassicSlotSound.JACKPOT_ITEM]: "jackpot-item",
            [ClassicSlotSound.JACKPOT_WIN]: "jackpot-win",

            [ClassicSlotSound.FREESPIN]: "freespin",
            [ClassicSlotSound.BONUS]: "bonus",
            [ClassicSlotSound.SPINNING_NORMAL]: "spinning-normal",
            [ClassicSlotSound.SPINNING_TURBO]: "spinning-turbo",

            [ClassicSlotSound.REEL_STOP]: "reel-stop",
            [ClassicSlotSound.BONUS_POPUP]: "bonus-popup",
            [ClassicSlotSound.BONUS_ITEM]: "bonus-item",
            [ClassicSlotSound.CLICK]: "click",
            [ClassicSlotSound.BONUS_TOTAL]: "bonus-total",

            [ClassicSlotSound.TRANSITION]: "transition",
            [ClassicSlotSound.SYMBOL_WIN]: "symbol-win",
        };

        for (const key of Object.keys(dict)) {
            const path = `preload/audios/${dict[key]}`;
            const devPath = `../games/*/${path}`;
            BundleManager.getInstance()
                .loadAsset<AudioClip>({
                    bundleId: this.gameId.toString(),
                    path: path,
                    pathForDevMode: devPath,
                    type: AudioClip,
                })
                .then((clip) => {
                    if (clip) {
                        this.audioClips[key] = clip;
                    }
                })
                .catch(() => {
                    warn("missing audio for", path);
                });
        }
    }

    setTotalFreeSpins(value: number) {
        super.setTotalFreeSpins(value);
        this.bottomMessage?.showMessages(SlotNotification.FREESPINS);
    }

    updateBottomMessageStatus() {
        super.updateBottomMessageStatus();
        this.bottomMessage && (this.bottomMessage.isFreeSpin = this.isFreeSpin());
    }

    override playSound(type: ClassicSlotSound) {
        const key = type.toString();
        if (this.audioClips[key]) {
            AudioManager.getInstance().playSFX(this.audioClips[key]);
        }
    }

    protected override onStakeChanged() {
        super.onStakeChanged();
        if (!this.stakeButton || !this.gameConfigs) {
            return;
        }
        const decreaseBtn = this.stakeButton.node.getChildByName("decrease").getComponent(Button);
        const increaseBtn = this.stakeButton.node.getChildByName("increase").getComponent(Button);
        const index = this.getStakeLevels().findIndex((stake) => stake === this.stake);
        this.handleStakeButtonQuickChange(decreaseBtn, index > 0);
        this.handleStakeButtonQuickChange(increaseBtn, index < this.getStakeLevels().length - 1);
    }

    handleStakeButtonQuickChange(button: Button, condition: boolean) {
        button.interactable = condition;
        button.node.opacity = condition ? 255 : 100;
    }

    initSlotGameConfig() {
        this.slotGameConfigs = new StandardSlotGameConfigs();
    }

    async initSlotBoard() {
        await GameUtils.asyncExecute(this?.node, this.loadGameAtlas());
        await GameUtils.asyncExecute(this?.node, this.loadSlotSymbols());
        super.initSlotBoard();
        this.slotBoard.previewPopup.onSymbolPreview = this.onSymbolPreview.bind(this);
        this.loadWinningSymbolAnimation().then(() => {
            this.slotBoard.setItemWinningEffect();
        });
    }

    onSymbolPreview(symbol, worldPosition: Vec3, isInfoOnLeft: boolean) {
        if (!this.gameConfigs?.odds || !this.isFinishedRound) {
            return;
        }
        this.playSound(ClassicSlotSound.CLICK);
        const symbolCache = uiManager.prefabCache.slotSymbols[this.gameId];
        const spine = symbolCache[symbol.index].symbol;

        const previewPrefab = isInfoOnLeft ? this.previewSymbolLeft : this.previewSymbolRight;
        const previewNode = instantiate(previewPrefab);

        const symbolPreview = previewNode.getComponent(SymbolPreview);
        symbolPreview.setInfo({
            symbol,
            spine,
            odds: this.gameConfigs.odds[symbol.index],
            colorList: [this.colorConfig.previewOddsSymbolNumberColor, this.colorConfig.previewOddsWinValueColor],
            borderColor: this.colorConfig.previewOddsBorderColor,
            gameId: this.gameId,
            jackpotEnabled: this.jackpotEnabled,
        });
        this.slotBoard.showPreview(previewNode, worldPosition);
    }

    async loadSlotSymbols() {
        const prefabCache = uiManager.prefabCache.slotSymbols[this.gameId] || {};
        for (let index = 0; index < this.slotGameConfigs.itemTypeCount; index++) {
            if (prefabCache[index]) {
                continue;
            }
            const symbolInfo = {};
            symbolInfo["symbol"] = await GameUtils.asyncExecute(this?.node, this.addSymbolCache(index));
            symbolInfo["isJackpot"] = index === this.jackpotSymbolIndex && this.jackpotEnabled;
            prefabCache[index] = symbolInfo;
        }
        uiManager.prefabCache.slotSymbols[this.gameId] = prefabCache;
    }

    protected addSymbolCache(index: number) {
        const path = this.getSymbolName(index);
        const devPath = `../games/*/${path}`;
        return BundleManager.getInstance().loadAsset<sp.SkeletonData>({
            bundleId: this.gameId.toString(),
            path: path,
            pathForDevMode: devPath,
            type: sp.SkeletonData,
        });
    }

    protected getSymbolName(index): string {
        return `preload/symbol-spines/symbol-${index}`;
    }

    async loadGameAtlas() {
        let spriteAtlas = uiManager.prefabCache.gameAtlas[this.gameId];

        if (spriteAtlas) {
            return;
        }

        const path = `resources/textures/standard-slot-game`;
        const devPath = `../games/*/${path}`;
        try {
            spriteAtlas = await BundleManager.getInstance().loadAsset<SpriteAtlas>({
                bundleId: this.gameId.toString(),
                path: path,
                pathForDevMode: devPath,
                type: SpriteAtlas,
            });
        } catch (e) {
            warn(`Missing Symbols spriteAtlas for ${path} `, e);
        }
        uiManager.prefabCache.gameAtlas[this.gameId] = spriteAtlas;
    }

    async loadWinningSymbolAnimation() {
        const prefabCache = uiManager.prefabCache.slotWinningAnimation[this.gameId] || {};

        if (prefabCache !== null) {
            const path = `preload/symbol-spines/winning-animation`;
            const devPath = `../games/*/${path}`;
            const data = await GameUtils.asyncExecute(
                this?.node,
                BundleManager.getInstance().loadAsset<sp.SkeletonData>({
                    bundleId: this.gameId.toString(),
                    path: path,
                    pathForDevMode: devPath,
                    type: sp.SkeletonData,
                })
            );

            uiManager.prefabCache.slotWinningAnimation[this.gameId] = data;
        }
    }

    initBottomArea() {
        if (!this.slotBottomAreaPrefab) {
            return;
        }

        const slotBottom = instantiate(this.slotBottomAreaPrefab);
        this.bottomArea.addChild(slotBottom);
        this.slotBottomArea = slotBottom.getComponent(SlotBottomArea);
        this.slotBottomArea.updateColor({
            textColor: this.colorConfig.bottomAreaTextColor,
            numberColor: this.colorConfig.bottomAreaNumberColor,
            buttonBorderColor: this.colorConfig.bottomAreaButtonBorderColor,
            winAmountColor: this.colorConfig.bottomAreaWinAmountColor,
        });

        if (this.slotBottomArea) {
            this.autoSpinToggle = this.slotBottomArea.autoSpinToggle;
            this.turboToggle = this.slotBottomArea.turboToggle;
            this.stakeButton = this.slotBottomArea.stakeButton;
            this.stakeContainer = this.slotBottomArea.stakeContainer;
            this.betLevelsContainerNode = this.slotBottomArea.betLevelsContainerNode;
            this.lineButton = this.slotBottomArea.lineButton;
            this.stakeLabel = this.slotBottomArea.stakeLabel;
            this.lineLabel = this.slotBottomArea.lineLabel;
            this.totalBet = this.slotBottomArea.totalBet;
            this.winningBet = this.slotBottomArea.winningBet;
            this.winningBetEffect = this.slotBottomArea.winningBetEffect;

            if (this.totalFreeSpins) {
                this.stakeButton && (this.stakeButton.interactable = false);
                this.autoSpinToggle && (this.autoSpinToggle.interactable = false);
                this.lineButtonStatus(false);
            }

            this.slotBottomArea.onClickListener = {
                onStakeButtonClick: () => {
                    this.onStakeButtonClick();
                },
                onLineSelectionClick: () => {
                    this.onLineSelectionClick();
                },
                onAutoSpinChanged: () => {
                    this.onAutoSpinChanged();
                },
                onHideStakeContainer: () => {
                    this.hideStakeContrainer();
                },
                onTurboModeChanged: (toggle) => {
                    this.onTurboModeChanged(toggle);
                },
                onStakeQuickChange: (event) => {
                    this.onStakeQuickChange(event);
                },
                onStakeToggleChanged: (event, param) => {
                    this.onStakeToggleChanged(event, param);
                },
            };

            this.loadStakeLevelsConfig();
        }
    }

    getStakeLevels(): number[] {
        if (this.isAccelerate) {
            return this.gameConfigs?.betLevels;
        }
        return this.gameConfigs?.stakeLevels;
    }

    isShowStakeLevels(): boolean {
        return this.betLevelsContainerNode && this.betLevelsContainerNode.active && this.betLevelsContainerNode.opacity === 255;
    }

    setBetLevels(betLevels: number[]) {
        this.slotBottomArea.setBetLevels(betLevels);
    }

    hideStakeContrainer() {
        if (!this.betLevelsContainerNode) {
            return;
        }

        tween(this.betLevelsContainerNode)
            .to(0.2, { scaleY: 0, opacity: 0 })
            .call(() => {
                this.betLevelsContainerNode.active = false;
            })
            .start();
    }

    showStakeContainer() {
        if (!this.betLevelsContainerNode) {
            return;
        }
        this.updateStakeContainer();
        this.betLevelsContainerNode.active = true;
        this.betLevelsContainerNode.scaleY = 0;
        this.betLevelsContainerNode.opacity = 255;
        tween(this.betLevelsContainerNode).to(0.2, { scaleY: 1 }).start();
    }

    initBottomMessage() {
        const node = instantiate(this.bottomMessagePrefab);
        this.bottomMessageArea.addChild(node);
        this.initShowBottomMessage(node);
        this.bottomMessage.updateColor(this.colorConfig.noticeTextColor, this.colorConfig.noticeHighlightTextColor);

        if (this.totalFreeSpins) {
            this.setTotalFreeSpins(this.totalFreeSpins);
        }
    }

    generateRandomBoardData() {
        const samples = [
            [8, 9, 6, 1, 3, 1, 7, 2, 0, 6, 4, 5, 10, 10, 7],
            [1, 1, 3, 7, 6, 4, 10, 8, 9, 3, 1, 0, 2, 10, 5],
            [10, 2, 0, 7, 4, 6, 9, 8, 0, 5, 3, 7, 1, 5, 9],
            [3, 10, 0, 8, 5, 9, 9, 1, 7, 6, 10, 2, 4, 3, 3],
            [9, 7, 5, 4, 6, 5, 10, 3, 1, 9, 8, 6, 2, 0, 8],
        ];
        const randomIndex = _.random(samples.length - 1);
        console.log(`B${randomIndex}`);
        return samples[randomIndex];
    }

    onClickShowHistory() {
        super.onClickShowHistory();
        const history = this.historyComponent as StandardSlotGameHistory;
        history.gameId = this.gameId;
    }

    hideWinningEffectOnItems() {
        super.hideWinningEffectOnItems();
        this.slotBoard.updateSymbolDuration(this.getWinningPaylineDuration());
    }

    updateMiniWarningContent(miniWarningComp, data: string) {
        const text = miniWarningComp.text;
        text.string = data.toUpperCase();
    }

    async showEffectFreeSpin() {
        const transtition = await GameUtils.asyncExecute(this?.node, this.playEffectTransition());
        await GameUtils.asyncExecute(this?.node, super.showEffectFreeSpin());
        transtition?.destroy();
    }

    async showEffectBigWin(betWin: number) {
        const transtition = await GameUtils.asyncExecute(this?.node, this.playEffectTransition());
        await GameUtils.asyncExecute(this?.node, super.showEffectBigWin(betWin));
        transtition?.destroy();
    }

    async showEffectBonus(bonus: number): Promise<void> {
        const transtition = await GameUtils.asyncExecute(this?.node, this.playEffectTransition());
        await GameUtils.asyncExecute(this?.node, super.showEffectBonus(bonus));
        transtition?.destroy();
    }

    async showEffectJackpot(amount: number) {
        const transtition = await GameUtils.asyncExecute(this?.node, this.playEffectTransition());
        await GameUtils.asyncExecute(this?.node, super.showEffectJackpot(amount));
        transtition?.destroy();
    }

    setBonusCount(dialog: StandardSlotBonusDialog, bonus: number): BonusDialog {
        const comp = super.setBonusCount(dialog, bonus);
        comp.updateBonusCountItemTextColor(this.colorConfig.bonusCountItemTextColor);
        return comp;
    }

    protected async playEffectTransition() {
        if (!this.effectTransitionPrefab) {
            return null;
        }
        const effect = instantiate(this.effectTransitionPrefab);
        const animation = effect.getComponent(CallbackAnimation);
        animation.autoDestroyNode = false;
        this.playSound(ClassicSlotSound.TRANSITION);
        await GameUtils.asyncExecute(this?.node, super.showEffect(effect));

        return effect;
    }

    protected showBonusDialog(bonus: number, onBonusFinished) {
        this.playSound(ClassicSlotSound.BONUS_POPUP);
        super.showBonusDialog(bonus, onBonusFinished);
    }

    protected bonusDialogPlaySound(type: ClassicSlotSound) {
        this.playSound(type);
    }

    clickOutsideReelArea() {
        super.clickOutsideReelArea();
        this.expandableMenu.collapseMenu();
    }

    addSoundStopReel(turbo: boolean, spinDuration: number) {
        // handle
    }

    closeBetLevel() {
        console.log("close bet level");
    }
}
