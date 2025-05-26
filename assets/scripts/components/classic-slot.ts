import gc from "@sg/game-client-base";
import { _decorator, JsonAsset, Node, SpriteAtlas, Vec3 } from "cc";
import GameComponent from "db://shared-components/game/scripts/components/game-component";
import Observer from "observer";
import { SlotGameBaseConfigs } from "../config/slot-game-base-configs";
import { StandardSlotGameConfigs } from "../config/standard-slot-game-configs";
import { LineData } from "../definitions";
import { BetControlStore } from "../handlers/stores/bet-control-store";
import { SlotBoardStore } from "../handlers/stores/slot-board-store";
import { SlotDurationStore } from "../handlers/stores/slot-duration-store";
import { loadSlotSymbols, loadWinningSymbolAnimation, resourceCaches, setSlotGameConfigs } from "../utils/classic-slot-utils";
import { ClassicSlotSound } from "./others/classic-slot-sound";
import SlotBoard from "./slot-board/slot-board";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;
@ccclass
export default class ClassicSlot extends GameComponent {
    @property(SlotBoard)
    slotBoard: SlotBoard = null;

    @property(SpriteAtlas)
    gameAtlas: SpriteAtlas = null;

    @property(JsonAsset)
    colorJson: JsonAsset = null;

    @property(Node)
    lineContainer: Node = null;

    gameConfigOdds: any;
    jackpotEnabled = false;

    override isValidResult(result: gc.GameServiceMessage.TResult, settlementResult: gc.GameServiceMessage.TSettlementResult) {
        return !!result;
    }

    onLoad() {
        super.onLoad();
        this.initSharedCaches().then(() => {
            this.initSlotBoard();
        });
    }

    async initSharedCaches() {
        this.initSlotGameConfigs();
        resourceCaches.gameAtlas = this.gameAtlas;
        await loadSlotSymbols(true);
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
        this.playSound(ClassicSlotSound.CLICK);
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
        };
        this.slotBoard.showPreviewPopup(info, isInfoOnLeft, worldPosition);
    }

    @render(gc.GameConfigs.GameConfigStore, (store) => store.odds)
    renderGameOdd(odds) {
        this.gameConfigOdds = odds;
    }

    @render(SlotBoardStore, (store) => store.spinResult)
    async renderSpinResult(spinResult: { result: number[]; duration: number; turbo: boolean }) {
        this.slotBoard.setBoardData(spinResult.result);
        await this.slotBoard.spin(spinResult.duration, spinResult.turbo);
    }

    @render(SlotBoardStore, (store) => store.winningLines, { fireImmediately: false })
    renderWinningLines(winningLines: LineData[]) {
        if (!winningLines) {
            return;
        }

        winningLines.forEach((line) => {
            this.showLine(line.payline + 1);
        });
        this.renderWinningItems(winningLines);
    }

    @render(SlotBoardStore, (store) => store.winningItems, { fireImmediately: false })
    renderWinningItems(winningItems: LineData[]) {
        if (winningItems.length === 0) {
            this.slotBoard.hideWinningEffect();
            return;
        }
        winningItems.forEach((line) => {
            this.slotBoard.showWinningEffect(line.positions, +line.symbol);
        });
    }

    showLine(num: number, show = true) {
        if (!this.lineContainer) {
            return;
        }
        const line = this.lineContainer.getChildByName(`${num}`);
        if (line) {
            line.active = show;
        }
    }
}
