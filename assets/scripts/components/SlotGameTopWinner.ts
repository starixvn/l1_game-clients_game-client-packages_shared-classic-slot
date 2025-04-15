import { Socket } from "socket.io-client";

import { _decorator, Layout, Node, Prefab, Sprite, SpriteFrame } from "cc";
import CommonDialog from "../../common/_base/view-models/CommonDialog";
import BaseComponent from "../../common/BaseComponent";
import PaginationCommon from "./../../common/helpers/Pagination/PaginationCommon";
import SlotGameTopWinnerItem from "./SlotGameTopWinnerItem";
const { ccclass, property } = _decorator;

@ccclass
export default class SlotGameTopWinner extends BaseComponent {
    @property(PaginationCommon)
    pagination: PaginationCommon = null;

    @property(Node)
    content: Node = null;

    @property(Prefab)
    itemPrefab: Prefab = null;

    @property(Node)
    mainFrame: Node = null;

    @property(Sprite)
    topWinnerButton: Sprite = null;

    @property(Sprite)
    jackpotButton: Sprite = null;

    @property(SpriteFrame)
    activeButtonSprite: SpriteFrame = null;

    @property(SpriteFrame)
    inActiveButtonSprite: SpriteFrame = null;

    @property(Node)
    bigWinningNode: Node = null;

    @property(Node)
    jackpotWinnerNode: Node = null;

    @property(Node)
    backgroundNode: Node = null;

    @property(Layout)
    mainLayout: Layout = null;

    @property(Node)
    tabContainer: Node = null;

    private socket: Socket;
    private gameName: string;
    private jackpotEnabled = false;

    gameConfigs;
    topWinnerView = "getBigWinningWinners";

    init(socket: Socket, gameName: string, jackpotEnabled = true) {
        this.socket = socket;
        this.gameName = gameName;
        this.jackpotEnabled = jackpotEnabled;
    }

    onLoad() {
        this.pagination.init(this);

        const commonDialog = this.mainFrame.getComponent(CommonDialog);
        commonDialog.addOnDidHide(() => {
            this.node.destroy();
        });

        this.showBigWinningView(true);

        this.socket && this.socket.on(this.gameName, this.receivedData.bind(this));

        if (!this.jackpotEnabled) {
            this.tabContainer.active = false;
        }
        this.mainLayout.updateLayout();
        this.mainLayout.enabled = false;
        if (this.backgroundNode) {
            this.backgroundNode.height = this.mainLayout.node.height;
        }
    }

    onDestroy() {
        this.socket.off(this.gameName, this.receivedData.bind(this));
    }

    onEnable() {
        this.get_data();
    }

    get_data(page = 1) {
        this.socket && this.socket.connected && this.socket.emit(this.topWinnerView, { page: page });
    }

    receivedData(data) {
        if (!this.isAlive()) {
            return;
        }

        let topWinnerData = null;

        if (data.bigWinningWinners) {
            topWinnerData = data.bigWinningWinners;
        }

        if (data.jackpotWinners) {
            topWinnerData = data.jackpotWinners;
        }

        if (!topWinnerData) {
            return;
        }

        this.onData(topWinnerData);
    }

    onData(data) {
        const { page, pageSize, total, winners } = data;
        this.pagination.onSet(page, pageSize, total);
        this.content.destroyAllChildren();

        if (winners && winners.length) {
            winners.map((player, index) => {
                const itemNode = instantiate(this.itemPrefab);
                const item = itemNode.getComponent(SlotGameTopWinnerItem);
                item.gameConfigs = this.gameConfigs;
                item.setData(player, index, this.topWinnerView === "getBigWinningWinners");

                this.content.addChild(itemNode);
            });
        }
    }

    changeView(event, mode: number) {
        switch (+mode) {
            case 1:
                this.topWinnerView = "getBigWinningWinners";
                this.showBigWinningView(true);
                break;
            case 2:
                this.topWinnerView = "getJackpotWinners";
                this.showBigWinningView(false);
                break;
        }
        this.get_data();
        this.pagination.resetPageCurrent();
    }

    showBigWinningView(status: boolean) {
        this.topWinnerButton.spriteFrame = status ? this.activeButtonSprite : this.inActiveButtonSprite;
        this.jackpotButton.spriteFrame = status ? this.inActiveButtonSprite : this.activeButtonSprite;

        this.bigWinningNode.active = status;
        this.jackpotWinnerNode.active = !status;
    }
}
