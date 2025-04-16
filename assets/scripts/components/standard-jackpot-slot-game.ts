import { _decorator, instantiate, Node, Prefab } from "cc";
import { getLocale } from "../../common/auth/SessionManager";
import CallbackAnimation from "../../common/CallbackAnimation";
import GameUtils from "../../common/GameUtils";
import WebViewGuide from "../../common/webview-guide/WebViewGuide";
import JackpotPoolInfoBase from "../../lobby/main/view-models/JackpotPoolInfoBase";
import { uiManager } from "../../managers/GameUIManager";
import { InternalEvents } from "../../managers/InternalEvents";
import { ClassicSlotSound } from "./classic-slot-sound";
import JackpotGame from "./JackpotGame";
import { paylines } from "./slot-game-base-configs";
import StandardSlotGame from "./StandardSlotGame";
import StandarSlotGuide from "./StandarSlotGuide";
const { ccclass, property } = _decorator;

@ccclass
export default class StandardJackpotSlotGame extends StandardSlotGame {
    @property(Node)
    jackpotPoolNode: Node = null;

    @property(Node)
    topWinnersButton: Node = null;

    @property(Prefab)
    jackpotGamePrefab: Node = null;

    private jackpotPoolPrefab: Prefab;
    private isLoadedSlotBoard = false;

    onLoad() {
        super.onLoad();
        uiManager.emitterListener(
            InternalEvents.RECEIVED_JACKPOT_POOLS_IN_GAME,
            (data) => {
                this.jackpotEnabled = data.length > 0;
                this.receiviedJackpotPools = data;
                this.initSlotBoard();
                this.showJackpotInfo();
                this.showHideTopWinnersButton();
            },
            this
        );
    }

    protected getPrefabsList() {
        const normalPrefabs = super.getPrefabsList();
        const jackpotPrefabs = {
            // prefab name : prefab property
            "effect-jackpot": "effectJackpot",
        };
        return Object.assign({}, normalPrefabs, jackpotPrefabs);
    }

    protected getSymbolName(index): string {
        const path = `preload/symbol-spines/`;
        let symbolName = `${path}symbol-${index}`;

        if (index === this.jackpotSymbolIndex && this.jackpotEnabled) {
            const language = getLocale() === "vi-VN" ? `.${getLocale()}` : "";
            symbolName = `${path}symbol-${index}.jackpot${language}`;
        }

        return symbolName;
    }

    async initSlotBoard() {
        if (!this.receiviedJackpotPools || this.isLoadedSlotBoard) {
            return;
        }

        super.initSlotBoard();
        this.isLoadedSlotBoard = true;
    }

    protected async showJackpotInfo() {
        if (!this.jackpotEnabled || !this.jackpotPoolNode || this.jackpotPoolNode.children.length > 0) {
            return;
        }

        await this.loadPrefabWithBundle("jackpot-pool", "jackpotPoolPrefab");
        if (!this.jackpotPoolPrefab) {
            try {
                this.jackpotPoolPrefab = await GameUtils.loadResource(`shared/slot-game/jackpot-pool`);
            } catch (e) {
                warn(`Missing jackpot pool`, e);
            }
        }
        const node = instantiate(this.jackpotPoolPrefab);
        this.jackpotPoolInfo = node.getComponent(JackpotPoolInfoBase);
        this.jackpotPoolNode.addChild(node);
        this.updateJackpotPoolList();
    }

    override updateJackpotPool() {
        // override
    }

    showHideTopWinnersButton() {
        if (!this.topWinnersButton) {
            return;
        }
        this.topWinnersButton.active = this.jackpotEnabled;
    }

    getJackpotConfigs() {
        return this.gameConfigs?.jackpot;
    }

    handleGameGuide(guide: WebViewGuide, language, minBet, maxBet, isInPromotionTime) {
        const jackpotGuide = guide as StandarSlotGuide;
        jackpotGuide.enableJackpot = this.jackpotEnabled;
        super.handleGameGuide(guide, language, minBet, maxBet, isInPromotionTime);
    }

    protected showJackpotGame(prizes: number) {
        return new Promise<void>((resolve) => {
            const node = instantiate(this.jackpotGamePrefab);
            this.currentMiniPanel.addDialog(node);
            const dialog = node.getComponent(JackpotGame);
            dialog.prizes = prizes;
            dialog.slotGameConfigs = this.slotGameConfigs;
            dialog.initJackpotItems();
            dialog.playSoundCallback = this.bonusDialogPlaySound.bind(this);
            dialog.onJackpotGameFinished = resolve;
            dialog.onItemClicked = (index) => {
                this.socket.emit("jackpot", { chest: index });
            };

            this.onOpenJackpotChest = (data) => {
                dialog && dialog.openJackpot(data);
            };
        });
    }

    async handleNewJackpot(jackpot: any) {
        this.playSound(ClassicSlotSound.JACKPOT);
        this.showLine(jackpot.winningLine + 1);
        this.slotBoard.showWinningEffect(paylines[jackpot.winningLine], jackpot.symbol);
        const transtition = await GameUtils.asyncExecute(this?.node, this.playEffectTransition());
        const effect = instantiate(this.effectJackpot);
        const animation = effect.getComponent(CallbackAnimation);
        animation.setDuration(this.getCustomDuration("jackpot"));
        await GameUtils.asyncExecute(this?.node, this.showEffect(effect));
        transtition?.destroy();
        await this.showJackpotGame(jackpot.prizes);
    }
}
