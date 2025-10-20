import { _decorator, Component, Label, Node, sp, Sprite } from "cc";
import { AppUtils, ComponentUtils } from "db://shared-components/shared/utils";
import { SpecialSymbol } from "../../definitions";
import { resourceCaches } from "../../utils/classic-slot-utils";
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

    hidePreview() {
        this.node.parent.active = false;
        this.node.destroy();
    }

    showSymbolText(symbolNumber: number, textColor: string) {
        const showText = symbolNumber === SpecialSymbol.FREESPIN || symbolNumber === SpecialSymbol.BONUS;
        const atlas = resourceCaches.gameAtlas;

        if (!showText) {
            return;
        }

        this.textImages.active = true;
        const symbolName = this.getSymbolName(symbolNumber);
        this.textImages.children.forEach((node) => {
            const nodeImage = node.getComponent(Sprite);

            nodeImage.spriteFrame = atlas.getSpriteFrame(`text-symbol-${symbolName}`);
            ComponentUtils.setNodeColor(nodeImage.node, textColor);
        });
    }

    setInfo(info: SymbolPreviewType) {
        const { symbol, spine, odds, borderColor, colorList } = info;
        this.icon.skeletonData = spine;
        this.icon.setAnimation(0, "highlight", false);
        ComponentUtils.setNodeColor(this.border, borderColor);
        this.textImages.active = false;
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
                const locale = AppUtils.getLocale();
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
            [0, 1].forEach((childIndex) => {
                const isShowJackpotText =
                    symbol.index === SpecialSymbol.JACKPOT &&
                    jackpotEnabled &&
                    index === keys.length - 1 &&
                    childIndex === 1;


                const child = node.children[childIndex];
                const label = child.getComponent(Label);
                const jackpotNode = this.getJackpotNode(node);
                child.active = true;
                if (isShowJackpotText) {
                    jackpotNode.active = true;
                    this.showJackpotText(jackpotNode, colorList[childIndex]);
                    this.hideNumberLabel(label);
                    const transform = ComponentUtils.getTransform(jackpotNode);
                    ComponentUtils.setNodeTransform(jackpotNode, { width: transform.width });
                } else {
                    label.string = values[childIndex];
                    jackpotNode && (jackpotNode.active = false);
                }
                ComponentUtils.setNodeColor(child, colorList[childIndex]);
            });
        });
    }

    protected hideNumberLabel(label: Label) {
        label.string = "";
        label.overflow = Label.Overflow.SHRINK;
    }

    protected getJackpotNode(node: Node) {
        return node.children[1].children[0];
    }

    protected showJackpotText(jackpotNode: Node, textColor: string) {
        const atlas = resourceCaches.gameAtlas;
        const jackpotSprite = jackpotNode.getComponent(Sprite);
        const symbolName = this.getSymbolName(SpecialSymbol.JACKPOT);
        jackpotSprite.spriteFrame = atlas.getSpriteFrame(`text-symbol-${symbolName}`);
        ComponentUtils.setNodeColor(jackpotNode, textColor);
    }
}
