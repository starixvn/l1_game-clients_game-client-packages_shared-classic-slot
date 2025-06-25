import gc from "@sg/game-client-base";
import { _decorator, instantiate, Label, Node, Prefab, Sprite, SpriteAtlas, SpriteFrame } from "cc";
import { Dialog } from "db://shared-components/shared/common-components/dialogs/dialog";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { AppUtils } from "db://shared-components/shared/utils/app-utils";
import Observer from "observer";
import { SpecialSymbol } from "../../definitions";
import { formatNamePool, getSpriteLine, resourceCaches } from "../../utils/classic-slot-utils";
import { ClassicSlotBaseBetDetailLogItem } from "./classic-slot-bet-detail-log-item";
const { ccclass, property } = _decorator;
const { handle } = Observer;

@ccclass("ClassicSlotBetDetail")
export class ClassicSlotBetDetail extends ObserverComponent {
    @property(Node)
    result: Node = null;

    @property(Node)
    content: Node = null;

    @property(Label)
    lblRound: Label = null;

    @property(Node)
    symbolSample: Node = null;

    @property(Prefab)
    itemPrefab: Prefab = null;

    @property(Node)
    nodeNoWinningLines: Node = null;

    protected enableJackpot = false;
    protected symbolAtlas: SpriteAtlas = null;

    onLoad() {
        this.symbolAtlas = resourceCaches.gameAtlas;
        const dialog = this.node.getComponent(Dialog);
        dialog.onHideComplete = () => {
            this.node.destroy();
        };
        super.onLoad();
    }

    showBetDetail(model: gc.BetHistory.BetDetailModel) {
        const { result, id, freeSpin, enableJackpot } = model.betHistoryLog as any;
        this.enableJackpot = enableJackpot;
        this.lblRound.string = freeSpin ? `${id.toString()} (Free Spin)` : id.toString();
        this.initResultBoard(result);
        this.createBetLogs(model.betHistoryLog);
        this.showNoWinningPaylinesText(model.betHistoryLog);
    }

    showNoWinningPaylinesText(data) {
        const { settlementResult } = data;

        if (settlementResult.winningPaylines.length > 0 || settlementResult.bonus.odds > 0 || settlementResult.freeSpins.odds > 0) {
            return;
        }

        this.nodeNoWinningLines.active = true;
    }

    private createBetLogs(data) {
        const { paylines, settlementResult, bet } = data;
        let order = 1;
        const winningLines = [];

        settlementResult.winningPaylines.forEach((winingLine) => {
            if (paylines.includes(winingLine.payline)) {
                winningLines.push(winingLine);
            }
        });

        if (settlementResult.jackpot) {
            this.addJackpotLog(settlementResult.jackpot, bet, order);
            order++;
        }

        winningLines.forEach((line) => {
            const itemData = {
                order,
                paylineSprite: getSpriteLine(line.payline),
                symbolsSprite: this.setSymbolFrame(+line.symbol),
                amount: line.count,
                payout: line.odds,
                bet,
                win: `${bet * line.odds}`,
            };
            this.creatLogItem(itemData);
            order++;
        });

        if (settlementResult.bonus.odds > 0) {
            this.addBonusLog(settlementResult.bonus, order);
            order++;
        }

        if (settlementResult.freeSpins.odds > 0) {
            this.addFreeSpinLog(settlementResult.freeSpins, order);
            order++;
        }
    }

    protected addJackpotLog(jackpot: any, bet, order: number) {
        let jackpotName = gc.Translator.gameTranslate("jackpot");
        const { pool } = jackpot;

        if (pool) {
            const prizeName = formatNamePool(pool);
            jackpotName += ` ${prizeName}`;
        }

        this.creatLogItem({
            order,
            paylineSprite: getSpriteLine(jackpot.winningLine),
            symbolsSprite: this.setSymbolFrame(SpecialSymbol.JACKPOT),
            amount: "5",
            payout: jackpotName,
            bet,
            win: `${jackpot.winningAmount}`,
        });
    }

    private addBonusLog(bonus: any, order: number) {
        this.creatLogItem({
            order,
            paylineSprite: null,
            symbolsSprite: this.setSymbolFrame(8),
            amount: bonus.count,
            payout: `${bonus.odds} Bonus`,
            bet: "",
            win: bonus.winningAmount,
        });
    }

    private addFreeSpinLog(freeSpins: any, order: number) {
        this.creatLogItem({
            order,
            paylineSprite: null,
            symbolsSprite: this.setSymbolFrame(7),
            amount: freeSpins.count,
            payout: `${freeSpins.odds} Free Spins`,
            bet: "",
            win: "",
        });
    }

    protected creatLogItem(data: {
        order: number;
        paylineSprite: SpriteFrame;
        symbolsSprite: SpriteFrame;
        amount: string;
        payout: string;
        bet: string;
        win: string;
    }) {
        const node = instantiate(this.itemPrefab);
        const item = node.getComponent(ClassicSlotBaseBetDetailLogItem);
        item.setData(data);
        this.content.addChild(node);
    }

    protected initResultBoard(board) {
        for (let row = 0; row < 3; row++) {
            for (let column = 0; column < 5; column++) {
                const node = instantiate(this.symbolSample);
                node.active = true;
                const sprite = node.getComponentsInChildren(Sprite)[0];
                sprite.spriteFrame = this.setSymbolFrame(board[row + column * 3]);
                this.result.addChild(node);
            }
        }
    }

    protected setSymbolFrame(symbolNumber: number) {
        let spriteFrame: SpriteFrame;

        if (symbolNumber === SpecialSymbol.JACKPOT && this.enableJackpot) {
            const language = AppUtils.getLocale();
            const suffix = language === "vi-VN" ? `.${language}` : "";
            spriteFrame = this.symbolAtlas.getSpriteFrame(`symbol-${symbolNumber}.jackpot${suffix}`);
        } else {
            spriteFrame = this.symbolAtlas.getSpriteFrame(`symbol-${symbolNumber}`);
        }

        return spriteFrame;
    }
}
