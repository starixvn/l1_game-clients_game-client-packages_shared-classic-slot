import { _decorator, Component, instantiate, Node, NodePool, Prefab, sp, v3, Vec2, Vec3 } from "cc";

import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { bundleManager } from "db://shared-components/shared/common-components/bundle-manager/bundle-manager";
import { AnimationUtils } from "db://shared-components/shared/utils";
import { ComponentUtils } from "db://shared-components/shared/utils/component-utils";
import { LineData, paylines, SLOT_COLUMN_MAX_INDEX, SpecialSymbol, SPIN_FOREVER } from "../../definitions";
import { resourceCaches } from "../../utils/classic-slot-utils";
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
    peekEffectOverlay: Node = null;

    @property(Node)
    peekEffectContainer: Node = null;

    peekEffectPrefab: Prefab = null;

    protected peekEffectPool: NodePool = new NodePool();

    public reels: SlotReelNew[] = [];

    private readonly REEL_DURATION_OFFSET = 0.25;

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

        if (resourceCaches.gameFeature?.enablePeekEffect) {
            this.loadPeekEffectPrefab().then(() => {
                this.initPeekEffectPool();
            });
        }
    }

    async loadPeekEffectPrefab() {
        this.peekEffectPrefab = await bundleManager.loadResourcesAsset("prefabs/effects/peek-effect", Prefab);
    }

    protected initPeekEffectPool() {
        // Pre-instantiate a few nodes for the pool
        for (let i = 0; i < 2; i++) {
            const node = instantiate(this.peekEffectPrefab);
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
        const columns = this.convertDataToColumns(this.data);

        const beginTime = Date.now();
        if (turbo) {
            await this.spinTurbo(duration, columns);
        } else {
            const peekEffect = this.checkPeekEffect(this.data, columns);
            if (peekEffect) {
                await this.spinNormal(duration, columns, peekEffect);
            } else {
                await this.spinNormal(duration, columns);
            }
        }
        return (Date.now() - beginTime) / 1000;
    }

    makeReelsMoveFast(currentIndex: number) {
        this.reels.forEach((reel, index) => {
            if (index >= currentIndex) {
                reel.moveFast();
            }
        });
    }

    async spinNormal(originalDuration: number, columns: number[][], peekEffect?: PeekEffectCheckData) {
        return new Promise<void>(async (resolve) => {
            const minIndex = peekEffect ? peekEffect.position : SLOT_COLUMN_MAX_INDEX;

            let duration = originalDuration;
            for (let i = 0; i < this.reels.length; i++) {
                const reel = this.reels[i];
                duration = originalDuration + i * this.REEL_DURATION_OFFSET;

                const current = i;

                if (i > 0) {
                    await AnimationUtils.delayTime(this.startReelDelayTime);
                }
                console.time(`time reel ${i}`);
                if (i < minIndex) {
                    reel.spinNormal(duration, columns[i]).then(() => {
                        console.timeEnd(`time reel ${i}`);
                    });
                } else {
                    const isEdgeItem = i === minIndex;
                    reel.spinNormal(isEdgeItem ? duration : SPIN_FOREVER, columns[i]).then(async () => {
                        console.timeEnd(`time reel ${i}`);
                        await this.handleSpinReelEnded(current, columns, resolve);
                    });
                }
            }
        });
    }

    private async handleSpinReelEnded(current: number, columns: number[][], resolve: (value: void | PromiseLike<void>) => void) {
        this.hidePeekEffectAtIndex(current);
        //calculate peek effect at current
        const nextReelIndex = current + 1;
        const currentColumns = current < SLOT_COLUMN_MAX_INDEX ? columns.slice(0, nextReelIndex) : columns;
        const peekEffects = this.checkPeekEffect(this.data, currentColumns);
        this.handleSymbolsPeekEffect(peekEffects);

        if (current < SLOT_COLUMN_MAX_INDEX) {
            if (!this.reels[nextReelIndex].isFaster) {
                this.makeReelsMoveFast(current);
            }
            this.showPeekEffect(nextReelIndex);
            this.reels[nextReelIndex].stopSoon();
        } else {
            if (peekEffects) {
                await AnimationUtils.delayTime(1);
            }
            this.hidePeekEffect();

            resolve();
        }
    }

    handleSymbolsPeekEffect(peekEffects) {
        if (!resourceCaches.gameFeature?.enablePeekEffect) {
            return;
        }
        if (!peekEffects) {
            return;
        }
        if (peekEffects.jackpotLine !== undefined) {
            this.showWinningEffect(paylines[peekEffects.jackpotLine], SpecialSymbol.JACKPOT);
        }

        this.showPeekEffectSymbols(peekEffects.symbols);
    }

    showPeekEffect(reelIndex: number) {
        if (!resourceCaches.gameFeature?.enablePeekEffect) {
            return;
        }
        this.peekEffectOverlay.active = true;
        this.peekEffectContainer.active = true;

        const peekEffectNode = this.peekEffectPool.get();
        if (!peekEffectNode) {
            return;
        }
        peekEffectNode.active = true;

        const position = this.reels[reelIndex].node.position;
        peekEffectNode.setPosition(v3(position.x, 0));
        peekEffectNode.name = reelIndex.toString();
        this.peekEffectContainer.addChild(peekEffectNode);
        AnimationUtils.fadeIn(peekEffectNode, 0.3);
        const spine = peekEffectNode.getComponentInChildren(sp.Skeleton);
        spine.setAnimation(0, "show", true);
        AudioUtils.playSFX(AudioIds.PEEK_EFFECT);
    }

    async hidePeekEffectAtIndex(reelIndex: number) {
        if (!resourceCaches.gameFeature?.enablePeekEffect) {
            return;
        }
        const node = this.peekEffectContainer.getChildByName(`${reelIndex}`);
        if (node) {
            await AnimationUtils.fadeOut(node, 0.3);
            this.peekEffectPool.put(node);
        }
    }

    hidePeekEffect() {
        if (!resourceCaches.gameFeature?.enablePeekEffect) {
            return;
        }
        this.peekEffectOverlay.active = false;
        this.peekEffectContainer.active = false;

        // Return all peek effect nodes to the pool
        const peekEffectNodes = this.peekEffectContainer.children.slice(); // Create a copy to avoid modification during iteration
        peekEffectNodes.forEach((node) => {
            this.peekEffectPool.put(node);
        });
    }

    showPeekEffectSymbols(symbols: number[]) {
        if (!resourceCaches.gameFeature?.enablePeekEffect) {
            return;
        }
        symbols.forEach((symbol) => {
            this.reels.forEach((reel) => {
                reel.showHighlightSpecialSymbols(symbol);
            });
        });
    }

    checkPeekEffect(rawData: number[], columns: number[][]): PeekEffectCheckData {
        if (!resourceCaches.gameFeature?.enablePeekEffect) {
            return null;
        }
        const specialSymbols = [SpecialSymbol.BONUS, SpecialSymbol.FREESPIN];
        const result: PeekEffectCheckData = {
            position: -1,
            symbols: [],
        };
        const positions: number[] = [];
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

        const peekEffectForJackpot = this.checkPeekEffectForJackpot(columns, rawData);
        if (peekEffectForJackpot) {
            positions.push(peekEffectForJackpot.position);
            result.jackpotLine = peekEffectForJackpot.jackpotLine;
        }

        if (positions.length > 0) {
            positions.sort((a, b) => a - b);
            result.position = positions[0];
        }

        return result.position > -1 ? result : null;
    }

    private checkPeekEffectForJackpot(columns: number[][], rawData: number[]) {
        if (!resourceCaches.gameFeature?.enablePeekEffect || !resourceCaches.jackpotEnabled) {
            return null;
        }
        const length = columns.length;
        if (columns[0].includes(SpecialSymbol.JACKPOT) && length >= SLOT_COLUMN_MAX_INDEX) {
            const lineIndex = paylines.findIndex((line) => {
                const temp = line.slice(0, SLOT_COLUMN_MAX_INDEX);
                const notJackpot = temp.some((position) => rawData[position] !== SpecialSymbol.JACKPOT);
                return !notJackpot;
            });
            if (lineIndex !== -1) {
                return {
                    position: SLOT_COLUMN_MAX_INDEX - 1,
                    jackpotLine: lineIndex,
                };
            }
        }
        return null;
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

    onDestroy() {
        if (this.peekEffectPool) {
            this.peekEffectPool.clear();
        }
    }
}
