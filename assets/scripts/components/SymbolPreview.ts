import { _decorator, Color, Component, Label, Node, sp, Sprite } from "cc";
import { getLocale } from "../../common/auth/SessionManager";
import { uiManager } from "../../managers/GameUIManager";
import { InternalEvents } from "../../managers/InternalEvents";
import { SpecialSymbol } from "./SlotGameBaseConfigs";
const { ccclass, property } = _decorator;

export interface SymbolPreviewType {
    symbol?: any;
    spine: sp.SkeletonData;
    odds: any;
    colorList: [string, string];
    borderColor: string;
    coinValue?: number;
    betLevel?: number;
    freespin?: any;
    gameId: number;
    jackpotEnabled?: boolean;
}
@ccclass
export default class SymbolPreview extends Component {
    @property(sp.Skeleton)
    icon: sp.Skeleton = null;

    @property(Node)
    infoNode: Node = null;

    @property(Node)
    border: Node = null;

    @property(Node)
    bg: Node = null;

    @property(Node)
    textImages: Node = null;

    gameId: number;
    private readonly FreeSpinsSymbol = 7;

    onLoad() {
        const events = [
            InternalEvents.CLICK_AUTO_SPIN_BUTTON,
            InternalEvents.CLICK_LINE_SELECTION_BUTTON,
            InternalEvents.CLICK_SPIN_BUTTON,
            InternalEvents.CLICK_HAMBURGER_MENU,
            InternalEvents.CLICK_OUTSIDE_REEL_AREA,
        ];
        events.forEach((event) => {
            uiManager.emitterListener(event, this.hidePreview.bind(this), this);
        });
    }

    onDestroy() {
        uiManager.removeListenersWithTarget(this);
    }

    hidePreview() {
        this.node.parent.active = false;
        this.node.destroy();
    }

    showSymbolText(symbolNumber: number, textColor: string) {
        const showText = symbolNumber === SpecialSymbol.FREESPIN || symbolNumber === SpecialSymbol.BONUS;
        const atlas = uiManager.prefabCache.gameAtlas[this.gameId];

        if (!showText) {
            return;
        }

        this.textImages.active = true;
        const symbolName = this.getSymbolName(symbolNumber);
        this.textImages.children.forEach((node) => {
            const nodeImage = node.getComponent(Sprite);

            nodeImage.spriteFrame = atlas.getSpriteFrame(`text-symbol-${symbolName}`);
            nodeImage.node.color = Color.WHITE.fromHEX(textColor);
        });
    }

    setInfo(info: SymbolPreviewType) {
        const { symbol, spine, odds, borderColor, colorList, gameId } = info;
        this.icon.skeletonData = spine;
        this.icon.setAnimation(0, "highlight", false);
        this.border.color = new Color().fromHEX(borderColor);
        this.textImages.active = false;
        this.gameId = gameId;
        this.showValues(info, Object.keys(odds));
        this.showSymbolText(symbol.index, colorList[1]);
    }

    getSymbolName(symbolNumber: number): string {
        let symbolName = "";
        switch (symbolNumber) {
            case SpecialSymbol.FREESPIN:
                symbolName = "freespins";
                break;
            case SpecialSymbol.BONUS:
                symbolName = "bonus";
                break;
            case SpecialSymbol.JACKPOT:
                const locale = getLocale();
                symbolName = locale === "vi-VN" ? "jackpot.vi-VN" : "jackpot";
                break;
        }

        return symbolName;
    }

    showValues(info, keys) {
        const { symbol, colorList, jackpotEnabled, odds } = info;

        this.infoNode.children.forEach((node, index) => {
            const key = keys[index];
            const show = index < keys.length && odds[key] > 0;

            node.active = show;

            if (!show) {
                return;
            }

            const values = [key, odds[key]];
            node.children.forEach((child, childIndex) => {
                const isShowJackpotText =
                    symbol.index === SpecialSymbol.JACKPOT &&
                    jackpotEnabled &&
                    index === keys.length - 1 &&
                    childIndex === node.children.length - 1;

                const label = child.getComponent(Label);
                const jackpotNode = child.children[0];
                if (isShowJackpotText) {
                    jackpotNode.active = true;
                    const atlas = uiManager.prefabCache.gameAtlas[this.gameId];
                    const jackpotSprite = jackpotNode.getComponent(Sprite);
                    const symbolName = this.getSymbolName(SpecialSymbol.JACKPOT);
                    jackpotSprite.spriteFrame = atlas.getSpriteFrame(`text-symbol-${symbolName}`);
                    jackpotNode.color = Color.WHITE.fromHEX(colorList[childIndex]);

                    label.string = "";
                    label.overflow = Label.Overflow.SHRINK;
                    child.width = jackpotNode.width;
                } else {
                    label.string = values[childIndex];
                    jackpotNode && (jackpotNode.active = false);
                }
                child.color = Color.WHITE.fromHEX(colorList[childIndex]);
            });
        });
    }
}
