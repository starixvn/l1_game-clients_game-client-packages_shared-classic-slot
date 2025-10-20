import { _decorator, Label, Node } from "cc";
import LocalizedLabelWithFormat from "db://i18n/LocalizedLabelWithFormat";
import { ComponentUtils } from "db://shared-components/shared/utils/component-utils";
import { SpecialSymbol } from "../../definitions";
import SymbolPreview from "./symbol-preview";
const { ccclass, property } = _decorator;

@ccclass
export default class SymbolPreviewV2 extends SymbolPreview {
    override showSymbolText(symbolNumber: number, textColor: string) {
        const showText = symbolNumber === SpecialSymbol.FREESPIN || symbolNumber === SpecialSymbol.BONUS;

        if (!showText) {
            return;
        }

        this.textImages.active = true;
        const key = this.getSymbolText(symbolNumber);
        this.textImages.children.forEach((node) => {
            const label = node.getComponent(LocalizedLabelWithFormat)
            label.key = key;
            ComponentUtils.setNodeColor(node, textColor);
        });
    }

    protected hideNumberLabel(label: Label) {
        label.node.active = false;
    }

    protected getJackpotNode(node: Node) {
        return node.getChildByName("text-jackpot");
    }

    protected showJackpotText(jackpotNode: Node, textColor: string) {
        const key = this.getSymbolText(SpecialSymbol.JACKPOT);
        const label = jackpotNode.getComponent(LocalizedLabelWithFormat)
        label.key = key;
        ComponentUtils.setNodeColor(jackpotNode, textColor);
    }

    protected getSymbolText(symbol: number) {
        const dict = {
            [SpecialSymbol.BONUS]: "symbol_bonus",
            [SpecialSymbol.FREESPIN]: "symbol_freespin",
            [SpecialSymbol.JACKPOT]: "jackpot",
        }
        return dict[symbol] ?? "";
    }
}
