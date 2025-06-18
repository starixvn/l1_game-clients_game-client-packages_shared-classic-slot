import gc from "@sg/game-client-base";
import { _decorator, JsonAsset, SpriteAtlas, Vec3 } from "cc";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import GameComponent from "db://shared-components/game/scripts/components/game-component";
import Observer from "observer";
import { SlotGameBaseConfigs } from "../config/slot-game-base-configs";
import { StandardSlotGameConfigs } from "../config/standard-slot-game-configs";
import { LineData } from "../definitions";
import { BetControlStore } from "../handlers/stores/bet-control-store";
import { JackpotPoolStore } from "../handlers/stores/jackpot-pool-store";
import { SlotBoardStore } from "../handlers/stores/slot-board-store";
import { SlotDurationStore } from "../handlers/stores/slot-duration-store";
import { loadSlotSymbols, loadWinningSymbolAnimation, resourceCaches, setSlotGameConfigs } from "../utils/classic-slot-utils";
import { SymbolPreviewType } from "./others/symbol-preview";
import SlotBoard from "./slot-board/slot-board";
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

    gameConfigOdds: any;
    jackpotEnabled = false;

    override isValidResult(result: gc.GameServiceMessage.TResult, settlementResult: gc.GameServiceMessage.TSettlementResult) {
        return !!result;
    }

    @render(JackpotPoolStore, (store) => store.jackpotEnabled, { fireImmediately: false })
    renderJackpotEnabled(jackpotEnabled: { enabled: boolean }) {
        this.jackpotEnabled = jackpotEnabled?.enabled;
        this.initSharedCaches().then(() => {
            this.initSlotBoard();
        });
    }

    @render(gc.GameConfigs.GameConfigStore, (store) => store.odds)
    renderGameOdd(odds) {
        this.gameConfigOdds = odds;
    }

    async initSharedCaches() {
        this.initSlotGameConfigs();
        resourceCaches.gameAtlas = this.gameAtlas;
        resourceCaches.sharedSlotAtlas = this.sharedSlotAtlas;
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

    initSlotBoard() {
        this.slotBoard.initReels();
        this.slotBoard.previewPopup.onSymbolPreview = this.onSymbolPreview.bind(this);
    }

    onSymbolPreview(symbol, worldPosition: Vec3, isInfoOnLeft: boolean) {
        if (
            !this.gameConfigOdds
            // || !this.isFinishedRound
        ) {
            return;
        }
        AudioUtils.playClick();
        const symbolCache = resourceCaches.slotSymbols;
        const spine = symbolCache[symbol.index].symbol;
        const colorConfig = this.colorJson.json;
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

    @render(SlotBoardStore, (store) => store.spinResult)
    async renderSpinResult(spinResult: { result: number[]; duration: number; turbo: boolean }) {
        this.slotBoard.setBoardData(spinResult.result);
        await this.slotBoard.spin(spinResult.duration, spinResult.turbo);
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
        winningItemsOnLines.forEach((line) => {
            this.slotBoard.showWinningEffectOnLine(line);
        });
    }
}
