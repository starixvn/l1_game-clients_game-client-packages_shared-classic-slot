import gc from "@sg/game-client-base";
import { _decorator, Color, instantiate, Label, Node, Prefab, ScrollView, Sprite, SpriteAtlas, SpriteFrame } from "cc";
import { Dialog } from "db://shared-components/shared/common-components/dialogs/dialog";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { ComponentUtils } from "db://shared-components/shared/utils";
import { paylines, SpecialSymbol } from "../../definitions";
import { formatNamePool, getSpriteLine, getSymbolName, resourceCaches } from "../../utils/classic-slot-utils";
import { ClassicSlotBaseBetDetailLogItem } from "./classic-slot-bet-detail-log-item";
import { formatStringXMode, getXMode } from "db://shared-common-slot/x-mode/scripts/utils/xMode-utils";
const { ccclass, property } = _decorator;

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

    @property(Label)
    lblTime: Label = null;

    @property(Label)
    lblBet: Label = null;

    @property(Label)
    lblPaylines: Label = null;

    @property(Label)
    lblTotalAmount: Label = null;

    @property(Label)
    lblBetWin: Label = null;

    @property(ScrollView)
    contentScrollView: ScrollView = null;

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
        const { result, id, freeSpin, enableJackpot, bet, paylines, totalAmount, betWin, time, settlementResult } = model.betHistoryLog as any;
        const xMode = getXMode();
        this.enableJackpot = enableJackpot;
        this.lblRound.string = freeSpin ? `${id.toString()} (Free Spin)` : id.toString();
        this.initResultBoard(result , settlementResult, paylines);
        this.createBetLogs(model.betHistoryLog, xMode);
        this.showNoWinningPaylinesText(model.betHistoryLog);

        if (this.lblBet) {
            this.lblBet.string = formatStringXMode(bet * xMode);
        }
        if (this.lblPaylines) {
            this.lblPaylines.string = paylines.length.toString();
        }
        if (this.lblTotalAmount) {
            this.lblTotalAmount.string = formatStringXMode(totalAmount * xMode);
        }
        if (this.lblBetWin) {
            let win = betWin;
            if (settlementResult.jackpot) {
                win += settlementResult.jackpot.winningAmount;
            }
            this.lblBetWin.string = formatStringXMode(win * xMode);
        }
        if (this.lblTime) {
            this.lblTime.string = gc.DateTimeUtils.getStringDateByTime(time);
        }
    }

    showNoWinningPaylinesText(data) {
        const { settlementResult } = data;

        const isWinning = (settlementResult.winningPaylines.length > 0 || settlementResult.bonus.odds > 0 || settlementResult.freeSpins.odds > 0);
        this.nodeNoWinningLines.active = !isWinning;

        if (this.contentScrollView) {
            this.contentScrollView.node.active = isWinning;
        }
    }

    private createBetLogs(data, xMode: number) {
        this.content.destroyAllChildren();

        const { paylines, settlementResult, bet } = data;
        let order = 1;
        const winningLines = [];

        settlementResult.winningPaylines.forEach((winingLine) => {
            if (paylines.includes(winingLine.payline)) {
                winningLines.push(winingLine);
            }
        });

        if (settlementResult.jackpot) {
            this.addJackpotLog(settlementResult.jackpot, bet, xMode, order);
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
                win: `${bet * line.odds * xMode}`,
            };
            this.creatLogItem(itemData);
            order++;
        });

        if (settlementResult.bonus.odds > 0) {
            this.addBonusLog(settlementResult.bonus, xMode, order);
            order++;
        }

        if (settlementResult.freeSpins.odds > 0) {
            this.addFreeSpinLog(settlementResult.freeSpins, order);
            order++;
        }
    }

    protected addJackpotLog(jackpot: any, bet, xMode: number, order: number) {
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
            win: `${jackpot.winningAmount * xMode}`,
        });
    }

    private addBonusLog(bonus: any, xMode: number, order: number) {
        this.creatLogItem({
            order,
            paylineSprite: null,
            symbolsSprite: this.setSymbolFrame(8),
            amount: bonus.count,
            payout: `${bonus.odds} Bonus`,
            bet: "",
            win: `${bonus.winningAmount * xMode}`,
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

    protected initResultBoard(board, settlementResult?, selectedPaylines?) {
        ComponentUtils.moveToOtherNode(this.symbolSample, this.node);
        this.result.destroyAllChildren();
        const winningPositions = this.getWinningPositions(board, settlementResult, selectedPaylines);
        const hasWinning = winningPositions.size > 0;

        for (let row = 0; row < 3; row++) {
            for (let column = 0; column < 5; column++) {
                const symbolIndex = row + column * 3;
                const node = instantiate(this.symbolSample);
                node.active = true;
                
                const sprite = node.getComponentsInChildren(Sprite)[0];
                sprite.spriteFrame = this.setSymbolFrame(board[symbolIndex]);
                if (hasWinning) {
                    const isWinning = winningPositions.has(symbolIndex);
                    sprite.color = isWinning 
                        ? new Color(255, 255, 255, 255)
                        : new Color(255, 255, 255, 40); 
                } else {
                    sprite.color = new Color(255, 255, 255, 40);
                }
                
                this.result.addChild(node);
            }
        }
    }

    private getWinningPositions(
        board: number[],
        settlementResult?,
        selectedPaylines?
    ): Set<number> {
        const positions = new Set<number>();
        
        if (!settlementResult || !selectedPaylines) {
            return positions;
        }

        // Process winning paylines
        settlementResult.winningPaylines?.forEach((winningLine) => {
            if (!selectedPaylines.includes(winningLine.payline)) {
                return;
            }
            const linePositions = paylines[winningLine.payline];
            const winningSymbol = +winningLine.symbol;
            const matchedPositions = this.findMatchingSymbolsOnLine(board, linePositions, winningSymbol);
            
            this.addPositionsIfCountMatches(positions, matchedPositions, winningLine.count);
        });

        // Add Bonus symbols if odds > 0
        if (settlementResult.bonus?.odds > 0) {
            const bonusPositions = this.collectSymbolPositions(board, SpecialSymbol.BONUS);
            this.addPositionsIfCountMatches(positions, bonusPositions, settlementResult.bonus.count);
        }

        // Add Free Spin symbols if odds > 0
        if (settlementResult.freeSpins?.odds > 0) {
            const freeSpinPositions = this.collectSymbolPositions(board, SpecialSymbol.FREESPIN);
            this.addPositionsIfCountMatches(positions, freeSpinPositions, settlementResult.freeSpins.count);
        }

        // Add Jackpot symbols
        if (settlementResult.jackpot) {
            const jackpotLineIndex = settlementResult.jackpot.winningLine;
            
            if (jackpotLineIndex !== undefined && paylines[jackpotLineIndex]) {
                const jackpotLinePositions = paylines[jackpotLineIndex];
                const jackpotPositions = this.collectSymbolPositions(board, SpecialSymbol.JACKPOT, jackpotLinePositions);
                this.addPositionsIfCountMatches(positions, jackpotPositions, 5);
            }
        }

        return positions;
    }

    private isSymbolMatch(boardSymbol: number, targetSymbol: number): boolean {
        return boardSymbol === targetSymbol || boardSymbol === SpecialSymbol.WILD;
    }

    private findMatchingSymbolsOnLine(
        board: number[],
        linePositions: number[],
        targetSymbol: number
    ): number[] {
        const matchedPositions: number[] = [];
        
        for (const position of linePositions) {
            if (this.isSymbolMatch(board[position], targetSymbol)) {
                matchedPositions.push(position);
            }
        }
        
        return matchedPositions;
    }

    private collectSymbolPositions(
        board: number[],
        symbolType: number,
        searchPositions?: number[]
    ): number[] {
        const positions: number[] = [];
        const positionsToSearch = searchPositions || board.map((_, index) => index);
        
        for (const index of positionsToSearch) {
            if (board[index] === symbolType) {
                positions.push(index);
            }
        }
        
        return positions;
    }

    private addPositionsIfCountMatches(
        targetSet: Set<number>,
        foundPositions: number[],
        expectedCount: number
    ): void {
        if (foundPositions.length === expectedCount) {
            foundPositions.forEach(pos => targetSet.add(pos));
        }
    }

    protected setSymbolFrame(symbolNumber: number) {
        const symbolName = getSymbolName(symbolNumber, this.enableJackpot);
        return this.symbolAtlas.getSpriteFrame(symbolName);
    }
}
