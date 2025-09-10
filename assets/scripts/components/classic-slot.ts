import gc from "@sg/game-client-base";
import { _decorator, JsonAsset, SpriteAtlas, Vec3 } from "cc";
import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import MainPlayerProfile from "db://shared-components/game/main-player-profile/scripts/components/main-player-profile";
import GameComponent from "db://shared-components/game/scripts/components/game-component";
import { ComponentUtils } from "db://shared-components/shared/utils";
import _ from "lodash";
import Observer from "observer";
import { SlotGameBaseConfigs } from "../config/slot-game-base-configs";
import { StandardSlotGameConfigs } from "../config/standard-slot-game-configs";
import { LineData } from "../definitions";
import { SlotUIHandler } from "../handlers/handlers/slot-ui-handler";
import { BetControlStore } from "../handlers/stores/bet-control-store";
import { JackpotPoolStore } from "../handlers/stores/jackpot-pool-store";
import { SlotBoardStore } from "../handlers/stores/slot-board-store";
import { SlotDurationStore } from "../handlers/stores/slot-duration-store";
import { SlotUIStore } from "../handlers/stores/slot-ui-store";
import {
    ColorJson,
    DialogName,
    GameFeatureJson,
    loadSlotSymbols,
    loadWinningSymbolAnimation,
    resourceCaches,
    setSlotGameConfigs,
} from "../utils/classic-slot-utils";
import { SymbolPreviewType } from "./others/symbol-preview";
import SlotBoard from "./slot-board/slot-board";
import { FSBPromotionUIManager } from "db://shared-common-slot/fsb-promotion/scripts/components/fsb-promotion-ui-manager";
import { FSBPromotionUIHandler } from "db://shared-common-slot/fsb-promotion/scripts/handlers/fsb-promotion-ui-handler";
import {
    FreeSpinSignal,
    FreeSpinSource,
    FreeSpinsPromotionEvents,
    FSBPromotionUIStore,
} from "db://shared-common-slot/fsb-promotion/scripts/stores/fsb-promotion-ui-store";
import { SlotBetHandler, SlotSettlementHandler } from "../handlers";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;
@ccclass
export default class ClassicSlot extends GameComponent {
    @property(SlotBoard)
    slotBoard: SlotBoard = null;

    @property(SpriteAtlas)
    gameAtlas: SpriteAtlas = null;

    @property(SpriteAtlas)
    sharedSlotAtlas: SpriteAtlas = null;

    @property(JsonAsset)
    colorJson: JsonAsset = null;

    @property(JsonAsset)
    gameFeatureJson: JsonAsset = null;

    gameConfigOdds: any;
    jackpotEnabled = false;
    isReadyBet = false;

    override isValidResult(result: gc.GameServiceMessage.TResult, settlementResult: gc.GameServiceMessage.TSettlementResult) {
        return !!result;
    }

    onLoad() {
        this.initSharedCaches();
        this.updateBalanceColor();
        super.onLoad();
        this.addComponent(FSBPromotionUIManager);
    }

    @render(JackpotPoolStore, (store) => store.jackpotEnabled, { fireImmediately: false })
    renderJackpotEnabled(jackpotEnabled: { enabled: boolean }) {
        this.jackpotEnabled = jackpotEnabled?.enabled;
        resourceCaches.jackpotEnabled = this.jackpotEnabled;
        this.loadSymbols().then(() => {
            this.initSlotBoard();
        });
    }

    @render(FSBPromotionUIStore, (store) => store.changeUserBalance)
    renderChangeUserBalance(changeUserBalance: boolean) {
        this.handleUpdateBalance(changeUserBalance);
    }

    @handle(SlotSettlementHandler, (handler, changeUserBalance: boolean) => handler.handleUpdateBalance(changeUserBalance))
    handleUpdateBalance(changeUserBalance: boolean) {
        return changeUserBalance;
    }

    @render(gc.GameConfigs.GameConfigStore, (store) => store.odds)
    renderGameOdd(odds) {
        this.gameConfigOdds = odds;
    }

    initSharedCaches() {
        this.initSlotGameConfigs();
        resourceCaches.gameAtlas = this.gameAtlas;
        resourceCaches.sharedSlotAtlas = this.sharedSlotAtlas;
        resourceCaches.colorJson = this.colorJson.json as ColorJson;
        resourceCaches.gameFeature = this.gameFeatureJson.json as GameFeatureJson;
    }

    updateBalanceColor() {
        const profile = this.getComponentInChildren(MainPlayerProfile);
        if (profile) {
            ComponentUtils.setNodeColor(profile.lblBalance.node, resourceCaches.colorJson.bottomAreaWinAmountColor);
        }
    }

    async loadSymbols() {
        await loadSlotSymbols(this.jackpotEnabled);
        await loadWinningSymbolAnimation();
    }

    protected initSlotGameConfigs() {
        const config = this.customSlotGameConfigs();
        this.setSlotGameConfigs(config);
    }

    protected customSlotGameConfigs() {
        return new StandardSlotGameConfigs();
    }

    @handle(SlotDurationStore, (store, config: SlotGameBaseConfigs) => store.setConfig(config))
    protected setSlotGameConfigs(config: SlotGameBaseConfigs) {
        setSlotGameConfigs(config);
        return config;
    }

    @render(BetControlStore, (store) => store.roundId)
    renderSpinRoundId(roundId: number) {
        if (roundId !== -1) {
            this.lblRoundId.string = `#${roundId}`;
        }
    }

    override renderRoundId(roundId: number) {
        // override to not use round id from round store
    }

    protected generateRandomBoardData() {
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

    protected setBoardFullItems() {
        const data = this.generateRandomBoardData();
        this.slotBoard.setBoardData(data);
        this.slotBoard.applyData(data);
    }

    initSlotBoard() {
        this.slotBoard.initReels();
        this.slotBoard.previewPopup.onSymbolPreview = this.onSymbolPreview.bind(this);
        this.slotBoard.setItemWinningEffect();
        this.setBoardFullItems();
    }

    @render(SlotUIStore, (store) => store.dialogOpenEvent, { fireImmediately: false })
    renderDialogOpenEvent(dialogOpenEvent: { name: string }) {
        const shouldClose = dialogOpenEvent.name !== DialogName.PREVIEW_ODDS;
        shouldClose && this.slotBoard.previewPopup.hideSymbolPreview();
    }

    onSymbolPreview(symbol, worldPosition: Vec3, isInfoOnLeft: boolean) {
        if (!this.gameConfigOdds || !this.isReadyBet) {
            return;
        }
        this.triggerOpenPreviewOdds();
        AudioUtils.playSFX(AudioIds.TAP_SYMBOL);
        const symbolCache = resourceCaches.slotSymbols;
        const spine = symbolCache[symbol.index].symbol;
        const colorConfig = resourceCaches.colorJson;
        const info = {
            symbol,
            spine,
            odds: this.gameConfigOdds[symbol.index],
            colorList: [colorConfig.previewOddsSymbolNumberColor, colorConfig.previewOddsWinValueColor],
            borderColor: colorConfig.previewOddsBorderColor,
            jackpotEnabled: this.jackpotEnabled,
        } as SymbolPreviewType;
        this.slotBoard.showPreviewPopup(info, isInfoOnLeft, worldPosition);
    }

    @handle(SlotUIHandler, (store) => store.triggerDialogOpen({ name: DialogName.PREVIEW_ODDS }))
    triggerOpenPreviewOdds() {}

    @render(BetControlStore, (store) => store.isReadyBet)
    renderReadyBet(isReadyBet: boolean) {
        this.isReadyBet = isReadyBet;
    }

    @render(SlotBoardStore, (store) => store.spinResult, { fireImmediately: false })
    async renderSpinResult(spinResult: { result: number[]; duration: number; turbo: boolean; onComplete: () => void }) {
        this.slotBoard.hideWinningEffect();
        this.slotBoard.setBoardData(spinResult.result);
        const spinTime = await this.slotBoard.spin(spinResult.duration, spinResult.turbo);
        this.updateSpinTime(spinTime);
        spinResult.onComplete();
    }

    @handle(SlotBoardStore, (store, spinTime: number) => store.updateSpinTime(spinTime))
    updateSpinTime(spinTime: number) {
        return spinTime;
    }

    @render(SlotBoardStore, (store) => store.highlightSpecialSymbols, { fireImmediately: false })
    renderHighlightSpecialSymbols(highlightSpecialSymbols: number[]) {
        this.slotBoard.highlightSpecialSymbols(highlightSpecialSymbols);
    }

    @render(SlotBoardStore, (store) => store.winningItemsOnLines, { fireImmediately: false })
    renderWinningItems(winningItemsOnLines: LineData[]) {
        this.slotBoard.hideWinningEffect();
        if (winningItemsOnLines.length === 0) {
            return;
        }
        AudioUtils.playSFX(AudioIds.SYMBOL_WIN);
        winningItemsOnLines.forEach((line) => {
            this.slotBoard.showWinningEffectOnLine(line);
        });
    }

    @render(BetControlStore, (store) => store.freeSpinEnabled)
    notifyFreeSpinFromGame(isActive: boolean) {
        this.notifyFreeSpin({ source: FreeSpinSource.GAME, active: isActive });
    }

    @render(BetControlStore, (store) => store.isUsedFSBPromotionBonus)
    notifyFreeSpinFromPromotion(isUsedFSBPromotionBonus: boolean) {
        this.notifyFreeSpin({ source: FreeSpinSource.PROMOTION, active: isUsedFSBPromotionBonus });
    }

    @handle(FSBPromotionUIHandler, (handler, signal: FreeSpinSignal) => handler.handleFreeSpin(signal))
    public notifyFreeSpin(signal: FreeSpinSignal) {
        return signal;
    }

    @render(FSBPromotionUIStore, (store) => store.pendingUIEvent)
    renderFSBPromotionInProgress(pendingUIEvent) {
        if (!pendingUIEvent || pendingUIEvent.event !== FreeSpinsPromotionEvents.SPIN_ON_FSB_PROMOTION_FIRST_TIME) {
            return;
        }
        const { delayMs = 0, isPlaceBet = false } = pendingUIEvent.data ?? {};
        setTimeout(() => {
            this.tryConsumeFSB();
            isPlaceBet && this.callBet();
        }, delayMs);
    }

    @render(FSBPromotionUIStore, (store) => store.canSpinNextFSB)
    autoSpinFSB(canSpinNextFSB: boolean) {
        if (canSpinNextFSB) {
            this.tryConsumeFSB();
            this.callBet();
        }
    }

    @handle(FSBPromotionUIHandler, (handler) => handler.tryConsumeFSB())
    tryConsumeFSB() {}

    @handle(SlotBetHandler, (handler) => handler.callBet())
    callBet() {}
}
