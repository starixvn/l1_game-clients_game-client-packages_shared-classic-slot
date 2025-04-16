import gc from "@sg/game-client-base";
import { _decorator, SpriteAtlas, Vec3 } from "cc";
import GameComponent from "db://shared-components/game/scripts/components/game-component";
import { loadSlotSymbols, loadWinningSymbolAnimation, resourceCaches, setSlotGameConfigs } from "../utils/classic-slot-utils";
import { StandardSlotGameConfigs } from "./config/standard-slot-game-configs";
import SlotBoard from "./slot-board/slot-board";
const { ccclass, property } = _decorator;

@ccclass
export default class ClassicSlot extends GameComponent {
    @property(SlotBoard)
    slotBoard: SlotBoard = null;

    @property(SpriteAtlas)
    gameAtlas: SpriteAtlas = null;

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
        setSlotGameConfigs(new StandardSlotGameConfigs());
        resourceCaches.gameAtlas = this.gameAtlas;
        await loadSlotSymbols(true);
        await loadWinningSymbolAnimation();
    }

    initSlotBoard() {
        this.slotBoard.initReels();
        this.slotBoard.previewPopup.onSymbolPreview = this.onSymbolPreview.bind(this);
    }

    onSymbolPreview(symbol, worldPosition: Vec3, isInfoOnLeft: boolean) {
        // if (!this.gameConfigs?.odds || !this.isFinishedRound) {
        //     return;
        // }
        // this.playSound(ClassicSlotSound.CLICK);
        // const symbolCache = resourceCaches.slotSymbols;
        // const spine = symbolCache[symbol.index].symbol;
        // const previewPrefab = isInfoOnLeft ? this.previewSymbolLeft : this.previewSymbolRight;
        // const previewNode = instantiate(previewPrefab);
        // const symbolPreview = previewNode.getComponent(SymbolPreview);
        // symbolPreview.setInfo({
        //     symbol,
        //     spine,
        //     odds: this.gameConfigs.odds[symbol.index],
        //     colorList: [this.colorConfig.previewOddsSymbolNumberColor, this.colorConfig.previewOddsWinValueColor],
        //     borderColor: this.colorConfig.previewOddsBorderColor,
        //     gameId: this.gameId,
        //     jackpotEnabled: this.jackpotEnabled,
        // });
        // this.slotBoard.showPreview(previewNode, worldPosition);
    }
}
