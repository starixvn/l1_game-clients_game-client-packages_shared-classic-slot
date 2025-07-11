import { _decorator, Component, instantiate, log, Node, NodePool, Prefab, tween, v3, Vec2, Vec3 } from "cc";

import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { bundleManager } from "db://shared-components/shared/common-components/bundle-manager/bundle-manager";
import { AnimationUtils } from "db://shared-components/shared/utils";
import { ComponentUtils } from "db://shared-components/shared/utils/component-utils";
import { LineData, paylines, SLOT_COLUMN_MAX_INDEX, SpecialSymbol, SPIN_FOREVER } from "../../definitions";
import PreviewOddsPopup from "../others/preview-odds-popup";
import SymbolPreview, { SymbolPreviewType } from "../others/symbol-preview";
import SlotReelItem from "./slot-reel-item";
import SlotReelNew from "./slot-reel-new";

const { ccclass, property } = _decorator;

interface PeekEffectCheckData {
    position: number;
    jackpotLine?: number;
    symbols: number[];
}

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

    protected peekEffectPool: NodePool = null;

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

    private readonly PEEK_EFFECT_SCALE = 1.05;
    private readonly PEEK_EFFECT_DURATION = 1.5;
    private readonly PEEK_EFFECT_HIDE = 0.3;

    onLoad() {
        this.winningOverlayNode.active = false;
        this.initPeekEffectPool();
    }

    protected initPeekEffectPool() {
        this.peekEffectPool = new NodePool();
        // Pre-instantiate a few nodes for the pool
        for (let i = 0; i < 2; i++) {
            const node = instantiate(this.peekEffectNode);
            this.peekEffectPool.put(node);
        }
    }

    initReels() {
        this.node.children.forEach((child, index) => {
            const reel = child.getComponent(SlotReelNew);
            if (reel) {
                this.reels.push(reel);
                reel.gameId = this.gameId;
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
        // this.data = [2, 5, 10, 10, 2, 3, 2, 5, 10, 10, 3, 6, 7, 6, 10];
        // this.data = [
        //     1,
        //     SpecialSymbol.JACKPOT,
        //     1,
        //     1,
        //     SpecialSymbol.JACKPOT,
        //     1,
        //     0,
        //     SpecialSymbol.JACKPOT,
        //     SpecialSymbol.JACKPOT,
        //     1,
        //     SpecialSymbol.JACKPOT,
        //     1,
        //     1,
        // ];
        const columns = this.convertDataToColumns(this.data);

        if (turbo) {
            await this.spinTurbo(duration, columns);
        } else {
            const specialEffect = this.checkSpecialEffect(this.data, columns);
            if (specialEffect) {
                await this.spinNormal(duration, columns, specialEffect);
            } else {
                await this.spinNormal(duration, columns);
            }
        }
    }

    async spinNormal(duration: number, columns: number[][], specialEffect?: PeekEffectCheckData) {
        return new Promise<void>(async (resolve) => {
            let minIndex = specialEffect ? specialEffect.position : SLOT_COLUMN_MAX_INDEX;

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
                        this.hidePeekEffectAtIndex(current);
                        if (current < SLOT_COLUMN_MAX_INDEX) {
                            const nextReelIndex = current + 1;
                            this.showPeekEffect(nextReelIndex);
                            //calculate peek effect at current
                            const peekEffects = this.checkSpecialEffect(this.data, columns.slice(0, nextReelIndex));
                            this.handleSymbolsPeekEffect(peekEffects);
                            //update symbols highlight
                            this.zoomPeekEffect(true);
                            this.reels[nextReelIndex].stopSoon();
                        } else {
                            this.hidePeekEffect();
                            this.zoomPeekEffect(false);

                            resolve();
                        }
                    });
                }
            }
        });
    }

    handleSymbolsPeekEffect(peekEffects) {
        log("peekEffects ", peekEffects);
        if (peekEffects.jackpotLine !== undefined) {
            this.showWinningEffect(paylines[peekEffects.jackpotLine], SpecialSymbol.JACKPOT);
        }

        this.showPeekEffectSymbols(peekEffects.symbols);
    }

    showPeekEffect(reelIndex: number) {
        this.peekEffectContainer.active = true;

        const peekEffectNode = this.peekEffectPool.get();
        peekEffectNode.active = true;

        const position = this.reels[reelIndex].node.position;
        peekEffectNode.setPosition(v3(position.x, 0));
        peekEffectNode.name = reelIndex.toString();
        this.peekEffectContainer.addChild(peekEffectNode);
        AnimationUtils.fadeIn(peekEffectNode, 0.3);
    }

    async hidePeekEffectAtIndex(reelIndex: number) {
        const node = this.peekEffectContainer.getChildByName(`${reelIndex}`);
        if (node) {
            await AnimationUtils.fadeOut(node, 0.3);
            this.peekEffectPool.put(node);
        }
    }

    hidePeekEffect() {
        this.peekEffectContainer.active = false;

        // Return all peek effect nodes to the pool
        const peekEffectNodes = this.peekEffectContainer.children.slice(); // Create a copy to avoid modification during iteration
        peekEffectNodes.forEach((node) => {
            this.peekEffectPool.put(node);
        });
    }

    showPeekEffectSymbols(symbols: number[]) {
        symbols.forEach((symbol) => {
            this.reels.forEach((reel) => {
                reel.showHighlightSpecialSymbols(symbol);
            });
        });
    }

    checkSpecialEffect(rawData: number[], columns: number[][]): PeekEffectCheckData {
        log("columns ", columns);
        const length = columns.length;
        const specialSymbols = [SpecialSymbol.BONUS, SpecialSymbol.FREESPIN];
        const result: PeekEffectCheckData = {
            position: -1,
            symbols: [],
        };
        const positions = [];
        specialSymbols.forEach((specialSymbol) => {
            let count = 0;
            for (const [index, column] of columns.entries()) {
                if (column.includes(specialSymbol)) {
                    count++;
                }
                if (count === 2 && index < SLOT_COLUMN_MAX_INDEX) {
                    positions.push(index);
                    result.symbols.push(specialSymbol);
                    break;
                }
            }
        });

        if (columns[0].includes(SpecialSymbol.JACKPOT) && length >= SLOT_COLUMN_MAX_INDEX) {
            const lineIndex = paylines.findIndex((line) => {
                const temp = line.slice(0, SLOT_COLUMN_MAX_INDEX);
                const notJackpot = temp.some((position) => rawData[position] !== SpecialSymbol.JACKPOT);
                return !notJackpot;
            });
            if (lineIndex !== -1) {
                positions.push(SLOT_COLUMN_MAX_INDEX - 1);
                result.jackpotLine = lineIndex;
            }
        }

        if (positions.length > 0) {
            result.position = positions.sort((a, b) => a - b)[0];
        }

        log("result ", result);
        return result.position > -1 ? result : null;
    }

    async spinTurbo(duration: number, columns: number[][]) {
        for (let i = 0; i < this.reels.length; i++) {
            const reel = this.reels[i];
            if (i < SLOT_COLUMN_MAX_INDEX) {
                reel.spinTurbo(duration, columns[i]);
            } else {
                await reel.spinTurbo(duration, columns[i]);
            }
        }
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

    zoomPeekEffect(zooming: boolean) {
        const scale = zooming ? this.PEEK_EFFECT_SCALE : 1;
        const duration = zooming ? this.PEEK_EFFECT_DURATION : this.PEEK_EFFECT_HIDE;
        tween(this.node)
            .to(duration, { scale: v3(1, 1, 1).multiplyScalar(scale) }, { easing: "sineInOut" })
            .start();
    }

    onDestroy() {
        if (this.peekEffectPool) {
            this.peekEffectPool.clear();
        }
    }
}
