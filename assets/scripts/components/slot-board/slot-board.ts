import { _decorator, Component, instantiate, log, Node, Prefab, v3, Vec2, Vec3 } from "cc";

import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { bundleManager } from "db://shared-components/shared/common-components/bundle-manager/bundle-manager";
import { AnimationUtils } from "db://shared-components/shared/utils";
import { ComponentUtils } from "db://shared-components/shared/utils/component-utils";
import { LineData, paylines, SpecialSymbol, SPIN_FOREVER } from "../../definitions";
import PreviewOddsPopup from "../others/preview-odds-popup";
import SymbolPreview, { SymbolPreviewType } from "../others/symbol-preview";
import SlotReelItem from "./slot-reel-item";
import SlotReelNew from "./slot-reel-new";

const { ccclass, property } = _decorator;

@ccclass
export default class SlotBoard extends Component {
    @property(Node)
    winningOverlayNode: Node = null;

    @property(Node)
    winningSymbolsNode: Node = null;

    @property(Node)
    itemLocationMap: Node = null;

    @property(PreviewOddsPopup)
    previewPopup: PreviewOddsPopup = null;

    @property(Node)
    peekEffectContainer: Node = null;

    @property(Node)
    peekEffectNode: Node = null;

    public reels: SlotReelNew[] = [];

    public get reelCount() {
        return this.reels.length;
    }

    protected data: number[] = [];
    public gameId: number;
    public startReelDelayTime = 0.075;

    protected previewSymbolLeft: Prefab = null;
    protected previewSymbolRight: Prefab = null;

    symbolCountPerReel = 24;
    stepSymbolPerReel = 6;

    onLoad() {
        this.winningOverlayNode.active = false;
    }

    initReels() {
        this.node.children.forEach((child, index) => {
            const reel = child.getComponent(SlotReelNew);
            if (reel) {
                this.reels.push(reel);
                reel.gameId = this.gameId;
                // reel.itemCount = this.getSymbolCountPerReel(index);
                reel.createReel();
                reel.winningContainer = this.winningSymbolsNode;
            }
        });

        this.previewPopup.addPreviewPopup(this.reels);
    }

    getItemPositions(index: number): Vec2[] {
        const payline = paylines[index];
        const pos = [];
        payline.forEach((position) => {
            const item = this.itemLocationMap.children[position];
            const transform = ComponentUtils.getTransform(item);
            const worldPos = transform.convertToWorldSpaceAR(v3(0, 0));
            pos.push(worldPos);
        });

        return pos;
    }

    setBoardData(data: number[]) {
        this.data = data;
    }

    getLocation(index: number): { col: number; row: number } {
        const RowCount = 3;
        const col = Math.floor(index / RowCount);
        const row = index % RowCount;
        return { col, row };
    }

    convertDataToColumns(data: number[]) {
        const columns = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ];
        for (let i = 0; i < data.length; i++) {
            const { col, row } = this.getLocation(i);
            columns[col][row] = data[i];
        }

        return columns;
    }

    applyData(data: number[]) {
        const columns = this.convertDataToColumns(data);
        this.reels.forEach((reel, index) => reel.setReelData(columns[index]));
    }

    showWinningEffectOnLine(line: LineData) {
        this.showWinningEffect(line.positions, +line.symbol);
    }

    highlightSpecialSymbols(symbols: number[]) {
        this.reels.forEach((reel) => {
            symbols.forEach((symbol) => reel.showHighlightSpecialSymbols(symbol));
        });
    }

    showWinningEffect(positions: number[], symbol: number) {
        positions.forEach((position) => {
            const { col, row } = this.getLocation(position);
            this.reels[col].showWinningEffect(row, symbol);
        });
        this.winningOverlayNode.active = true;
    }

    hideWinningEffect() {
        this.reels.forEach((reel) => reel.hideWinningEffect());
        this.winningOverlayNode.active = false;
    }

    setItemWinningEffect() {
        this.reels.forEach((reel) => {
            reel.items.forEach((item: SlotReelItem) => {
                item.addWinningEffect();
            });
        });
    }

    updateSymbolDuration(duration: number) {
        this.reels.forEach((reel) => {
            reel.items.forEach((item: SlotReelItem) => {
                item.updateDuration(duration);
            });
        });
    }

    showPreview(previewNode: Node, worldPosition: Vec3) {
        this.previewPopup.showPreview(previewNode, worldPosition);
    }

    async spin(duration: number, turbo: boolean) {
        AudioUtils.playSFX(turbo ? AudioIds.SPINNING_TURBO : AudioIds.SPINNING_NORMAL);
        this.previewPopup.hideSymbolPreview();
        const columns = this.convertDataToColumns(this.data);
        // const columns = this.convertDataToColumns([
        //     1,
        //     SpecialSymbol.BONUS,
        //     1,
        //     1,
        //     SpecialSymbol.BONUS,
        //     SpecialSymbol.FREESPIN,
        //     SpecialSymbol.FREESPIN,
        //     SpecialSymbol.FREESPIN,
        //     SpecialSymbol.BONUS,
        //     1,
        //     SpecialSymbol.FREESPIN,
        //     1,
        //     1,
        // ]);

        if (turbo) {
            await this.spinTurbo(duration, columns);
        } else {
            const specialEffect = this.checkSpecialEffect(columns);
            if (Object.keys(specialEffect).length > 0) {
                await this.spinNormal(duration, columns, specialEffect);
            } else {
                await this.spinNormal(duration, columns);
            }
        }
    }

    async spinNormal(duration: number, columns: number[][], specialEffect?: { [symbol: number]: number }) {
        return new Promise<void>(async (resolve) => {
            let minIndex = this.reels.length - 1;
            if (specialEffect) {
                minIndex = Object.values(specialEffect).sort((a, b) => a - b)[0];
            }
            let i = 0;
            for (; i < this.reels.length; i++) {
                const reel = this.reels[i];

                const current = i;

                console.time("spin reel " + current);
                if (i > 0) {
                    await AnimationUtils.delayTime(this.startReelDelayTime);
                }
                if (i < minIndex) {
                    reel.spinNormal(duration, columns[i]).then(() => {
                        console.timeEnd("spin reel " + current);
                    });
                } else {
                    const isEdgeItem = i === minIndex;
                    reel.spinNormal(isEdgeItem ? duration : SPIN_FOREVER, columns[i]).then(() => {
                        console.timeEnd("spin reel " + current);
                        if (current < this.reels.length - 1) {
                            const nextReelIndex = current + 1;
                            this.showPeekEffect(nextReelIndex);
                            //calculate peek effect at current
                            const peekEffects = this.checkSpecialEffect(columns.slice(0, nextReelIndex));
                            log("peekEffects ", peekEffects);
                            this.showPeekEffectSymbols(Object.keys(peekEffects).map(Number));
                            //update symbols highlight
                            this.reels[nextReelIndex].stopSoon();
                        } else {
                            this.hidePeekEffect();
                            resolve();
                        }
                    });
                }
            }
        });
    }

    showPeekEffect(reelIndex: number) {
        this.peekEffectContainer.active = true;
        this.peekEffectNode.active = true;
        this.peekEffectNode.setPosition(this.reels[reelIndex].node.position);
    }

    hidePeekEffect() {
        this.peekEffectContainer.active = false;
        this.peekEffectNode.active = false;
    }

    showPeekEffectSymbols(symbols: number[]) {
        symbols.forEach((symbol) => {
            this.reels.forEach((reel) => {
                reel.showHighlightSpecialSymbols(symbol);
            });
        });
    }

    checkSpecialEffect(columns: number[][]) {
        log("columns ", columns);
        //TODO: implement special effect
        const specialSymbols = [SpecialSymbol.BONUS, SpecialSymbol.FREESPIN];
        const result = {};
        specialSymbols.forEach((specialSymbol) => {
            let count = 0;
            for (const [index, column] of columns.entries()) {
                if (column.includes(specialSymbol)) {
                    count++;
                }
                if (count === 2 && index < this.reelCount - 1) {
                    result[specialSymbol] = index;
                    break;
                }
            }
        });
        log("result ", result);
        return result;
    }

    async spinTurbo(duration: number, columns: number[][]) {
        //TODO: implement turbo spin
    }

    getSymbolCountPerReel(index: number) {
        return this.symbolCountPerReel + index * this.stepSymbolPerReel;
    }

    async showPreviewPopup(info: SymbolPreviewType, isInfoOnLeft: boolean, worldPosition: Vec3) {
        const previewPrefab = await this.getPreviewSymbolPrefab(isInfoOnLeft);
        const previewNode = instantiate(previewPrefab);
        const symbolPreview = previewNode.getComponent(SymbolPreview);
        symbolPreview.setInfo(info);
        this.showPreview(previewNode, worldPosition);
    }

    async getPreviewSymbolPrefab(isInfoOnLeft: boolean) {
        if (isInfoOnLeft) {
            if (!this.previewSymbolLeft) {
                this.previewSymbolLeft = await bundleManager.loadResourcesAsset("prefabs/preview-odd-left", Prefab);
            }
            return this.previewSymbolLeft;
        } else {
            if (!this.previewSymbolRight) {
                this.previewSymbolRight = await bundleManager.loadResourcesAsset("prefabs/preview-odd-right", Prefab);
            }
            return this.previewSymbolRight;
        }
    }
}
