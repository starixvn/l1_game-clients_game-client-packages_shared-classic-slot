import * as i18n from "i18n/runtime-scripts/LanguageData";

import { _decorator, Component, instantiate, Label, Layout, Node, Prefab, Sprite, SpriteAtlas, SpriteFrame } from "cc";
import CommonDialog from "../../common/_base/view-models/CommonDialog";
import GameUtils from "../../common/GameUtils";
import SlotUtils from "./slot-utils";
import SlotGameTicketDetailItem from "./SlotGameTicketDetailItem";
const { ccclass, property } = _decorator;

@ccclass
export default class SlotGameTicketDetail extends Component {
    @property(Label)
    roundId: Label = null;

    @property(CommonDialog)
    commonDialog: CommonDialog = null;

    @property(Node)
    resultBoard: Node = null;

    @property(Node)
    content: Node = null;

    @property(Prefab)
    itemPrefab: Prefab = null;

    @property(SpriteAtlas)
    mainAtlas: SpriteAtlas = null;

    protected readonly jackpotSymbolNumber = 10;

    onLoad() {
        this.commonDialog.addOnDidHide(() => {
            this.node.destroy();
        });
        this.commonDialog.autoZooming = false;
    }

    async setData(data: any) {
        this.roundId.string = data.freeSpin ? `${data.id.toString()} (Free Spin)` : data.id.toString();

        await this.loadSymbolsAtlas();
        this.initResultBoard(data.result);

        await this.loadPaylineAtlas();
        this.createBetLogs(data);
        await this.commonDialog.zooming();
        this.enhancePerformanceLoadLabels();
    }

    async loadSymbolsAtlas() {}

    async loadPaylineAtlas() {}

    private initResultBoard(board) {
        for (let row = 0; row < 3; row++) {
            for (let column = 0; column < 5; column++) {
                const node = new Node();
                const subNode = new Node();
                node.addChild(subNode);
                subNode.addComponent(Sprite).spriteFrame = this.setSymbolFrame(board[row + column * 3]);
                this.resultBoard.addChild(node);
            }
        }
    }

    private createBetLogs(data) {
        const { paylines, settlementResult, bet } = data;
        let order = 1;
        const winningLines = [];
        const winningArray = [];

        settlementResult.winningPaylines.forEach((winingLine) => {
            if (paylines.includes(winingLine.payline)) {
                winningLines.push(winingLine);
                winningArray.push(winingLine.payline);
            }
        });

        if (settlementResult.jackpot) {
            this.addJackpotLog(settlementResult.jackpot, bet, order);
            order++;
        }

        winningLines.forEach((line) => {
            const itemData = {
                order,
                paylineSprite: this.getSpriteLine(line.payline),
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

        this.createFailPaylines(data, winningArray, order);
    }

    protected createFailPaylines(data, winningArray: number[], order: number) {
        const { paylines, settlementResult, bet } = data;
        const failLine = [];

        paylines.forEach((line) => {
            if (!winningArray.includes(line) && (!settlementResult.jackpot || line !== settlementResult.jackpot.winningLine)) {
                failLine.push(line);
            }
        });

        failLine.forEach((line) => {
            this.creatLogItem({
                order,
                paylineSprite: this.getSpriteLine(line),
                symbolsSprite: null,
                amount: "",
                payout: "",
                bet,
                win: "0",
            });
            order++;
        });
    }

    enhancePerformanceLoadLabels() {
        const layout = this.content.getComponent(Layout);
        layout.updateLayout();
        layout.enabled = false;

        this.content.children.forEach((child) => {
            const item = child.getComponent(SlotGameTicketDetailItem);

            GameUtils.moveToOtherNode(item.order.node, this.content);
            GameUtils.moveToOtherNode(item.amount.node, this.content);
            GameUtils.moveToOtherNode(item.payout.node, this.content);
            GameUtils.moveToOtherNode(item.bet.node, this.content);
            GameUtils.moveToOtherNode(item.win.node, this.content);
        });
    }

    protected addJackpotLog(jackpot: any, bet, order: number) {
        let jackpotName = i18n.t("ui.jackpot");
        const { pool } = jackpot;

        if (pool) {
            const prizeName = SlotUtils.formatNamePool(pool);
            jackpotName += ` ${prizeName}`;
        }

        this.creatLogItem({
            order,
            paylineSprite: this.getSpriteLine(jackpot.winningLine),
            symbolsSprite: this.setSymbolFrame(this.jackpotSymbolNumber),
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
        const item = node.getComponent(SlotGameTicketDetailItem);
        item.setData(data);
        this.content.addChild(node);
    }

    protected getSpriteLine(line: number): SpriteFrame {
        return this.mainAtlas.getSpriteFrame(`dong${line + 1}`);
    }

    protected setSymbolFrame(symbolNumber: number) {
        return this.mainAtlas.getSpriteFrame(`item${symbolNumber}`);
    }
}
