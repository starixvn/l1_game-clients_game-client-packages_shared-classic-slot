import { _decorator, AudioSource, Component, Node, v2, Vec2 } from "cc";

import { GameUtils } from "@sg/game-client-base";
import AudioManager from "db://shared-components/game/audios/scripts/audio-manager";
import { paylines, SlotGameBaseConfigs } from "./SlotGameBaseConfigs";
import SlotReel from "./SlotReel";

enum SlotGameSound {
    SPINNING_NORMAL = 0,
    SPINNING_TURBO = 1,
}
const { ccclass, property } = _decorator;

@ccclass
export default class SlotBoard extends Component {
    @property(Node)
    winningOverlayNode: Node = null;

    @property(Node)
    winningSymbolsNode: Node = null;

    @property(Node)
    itemLocationMap: Node = null;

    @property({ type: AudioSource })
    soundSources: AudioSource[] = [];

    public reels: SlotReel[] = [];

    public get reelCount() {
        return this.reels.length;
    }

    protected data: number[] = [];
    protected slotGameConfig: SlotGameBaseConfigs;
    public gameId: number;
    public startReelDelayTime = 0.075;
    protected symbolCountPerReel = 18;

    onLoad() {
        this.winningOverlayNode.active = false;
    }

    initReels() {
        this.node.children.forEach((child, index) => {
            const reel = child.getComponent(SlotReel);
            if (reel) {
                this.reels.push(reel);
                reel.slotGameConfig = this.slotGameConfig;
                reel.gameId = this.gameId;
                reel.itemCount = this.getSymbolCountPerReel(index);
                reel.createReel();
            }
            reel.winningContainer = this.winningSymbolsNode;
        });
    }

    getSymbolCountPerReel(index: number) {
        return this.symbolCountPerReel;
    }

    getItemPositions(index: number): Vec2[] {
        const payline = paylines[index];
        const pos = [];
        payline.forEach((position) => {
            const item = this.itemLocationMap.children[position];
            const worldPos = item.convertToWorldSpaceAR(v2(0, 0));
            pos.push(worldPos);
        });

        return pos;
    }

    setConfig(config: SlotGameBaseConfigs) {
        this.slotGameConfig = config;
        this.reels.forEach((reel) => (reel.slotGameConfig = this.slotGameConfig));
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

    protected playSpinningAudio(turbo: boolean) {
        if (this.soundSources.length > 0) {
            const sound = turbo ? SlotGameSound.SPINNING_TURBO : SlotGameSound.SPINNING_NORMAL;
            AudioManager.getInstance().playSFX(this.soundSources[sound].clip);
        }
    }

    async spin(duration: number, turbo: boolean) {
        this.playSpinningAudio(turbo);
        const columns = this.convertDataToColumns(this.data);
        for (let i = 0; i < this.reels.length; i++) {
            const reel = this.reels[i];

            if (i > 0 && !turbo) {
                await GameUtils.delayTime(this.startReelDelayTime);
            }

            if (i < this.reels.length - 1) {
                reel.spinWithData(duration, columns[i], turbo);
            } else {
                await reel.spinWithData(duration, columns[i], turbo);
            }
        }
    }

    showWinningEffect(positions: number[], symbol: number) {
        positions.forEach((position) => {
            const { col, row } = this.getLocation(position);
            this.reels[col].showWinningEffect(row, symbol);
        });
        this.winningOverlayNode.active = true;
    }

    showHighlightSpecialSymbols(symbol: number) {
        this.reels.forEach((reel) => reel.showHighlightSpecialSymbols(symbol));
    }

    hideWinningEffect() {
        this.reels.forEach((reel) => reel.hideWinningEffect());
        this.winningOverlayNode.active = false;
    }
}
