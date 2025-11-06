import { _decorator, easing, Layout } from "cc";
import { AudioIds } from "db://assets/game/audios/AudioIds";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { SLOT_ROW_MAX_INDEX, SpecialSymbol } from "../../definitions";
import SlotReel from "./slot-reel";

const { ccclass, property } = _decorator;

enum State {
    None,
    BounceStart,
    Spin,
    BounceStop,
    Turbo,
}

@ccclass
export default class SlotReelNew extends SlotReel {
    // Computed property
    get symbolGap() {
        return this.itemHeight + this.spacingY;
    }

    // Configuration constants
    protected readonly BLURRY_SPEED = 1000;

    protected readonly BOUNCE_START_DISTANCE = 20;
    protected readonly BOUNCE_START_DURATION = 0.15;

    protected readonly DELAY_SLOW_DOWN_DURATION = 2;
    protected readonly SLOW_DOWN_DURATION = 3;
    protected readonly SLOW_DOWN_DURATION_FAST = 0.4;

    protected readonly BOUNCE_STOP_DISTANCE = 25;
    protected readonly BOUNCE_STOP_DURATION = 0.2;

    protected readonly SPIN_MAX_SPEED = 4000;
    protected readonly SPIN_MAX_SPEED_2 = this.SPIN_MAX_SPEED + 500;
    protected readonly SPIN_ACCELERATION = 20000;

    protected readonly SPEED_STOP_THRESHOLD = 1;
    protected readonly SPIN_EXTRA_SYMBOLS = 18;

    protected readonly TURBO_SPIN_ITEM_COUNT = 10;

    // State tracking
    private state = State.None;
    public isFaster = false;
    private isStoppingPhase = false;

    // Movement tracking
    private movingDistance = 0;
    private finalMovingDistance = 0;

    private turboSpeed = 0;
    private currentSpeed = 0;
    private stoppingDistance = 0;
    private stoppingDuration = 0;
    private deltaTime = 0;

    // Data tracking
    private spinDuration = 0;
    private cachedData: number[] = [];
    private lowestIndex = 0;
    private onSpinFinishCallback = () => { };

    protected override init() {
        super.init();
        this.layout.verticalDirection = Layout.VerticalDirection.BOTTOM_TO_TOP;
    }

    public spinNormal(spinDuration: number, data: number[]) {
        return new Promise<void>((resolve) => {
            this.onSpinFinishCallback = resolve;
            this.cachedData = data;
            this.clear();
            this.startBounceStart(spinDuration);
        });
    }

    public spinTurbo(spinDuration: number, data: number[]) {
        return new Promise<void>((resolve) => {
            this.onSpinFinishCallback = resolve;
            this.cachedData = data;
            this.clear();
            this.state = State.Turbo;
            this.finalMovingDistance = this.symbolGap * this.TURBO_SPIN_ITEM_COUNT;
            this.turboSpeed = this.finalMovingDistance / spinDuration;
            this.syncReelData();
        });
    }

    protected rowIndexToItemIndex(rowIndex: number) {
        return (this.lowestIndex - rowIndex + SLOT_ROW_MAX_INDEX) % this.items.length;
    }

    public showWinningEffect(rowIndex: number, symbol: number) {
        const id = this.rowIndexToItemIndex(rowIndex);
        const item = this.items[id];
        const highlight = item.index === symbol || (item.index === SpecialSymbol.WILD && symbol !== SpecialSymbol.JACKPOT);
        item.showWinningEffect(highlight);
        this.moveToOtherNode(item, this.winningContainer);
    }

    showHighlightSpecialSymbols(symbol: number) {
        for (let i = 0; i < 3; i++) {
            const id = this.rowIndexToItemIndex(i);
            const item = this.items[id];
            if (item.index === symbol) {
                this.moveToOtherNode(item, this.winningContainer);
                item.showWinningEffect(true);
            }
        }
    }

    // Main update loop
    protected update(deltaTime: number): void {
        const dt = Math.min(deltaTime, 1 / 30);
        switch (this.state) {
            case State.BounceStart:
                this.updateBounceStart(dt);
                break;
            case State.Spin:
                this.updateSpin(dt);
                break;
            case State.BounceStop:
                this.updateBounceStop(dt);
                break;
            case State.Turbo:
                this.updateTurbo(dt);
                break;
        }
    }

    private updateTurbo(dt: number) {
        const offset = this.turboSpeed * dt;
        this.movingDistance += offset;
        this.movingReelDown(offset);

        if (this.checkDistanceLessThan(this.finalMovingDistance, this.movingDistance)) {
            this.state = State.None;
            this.finalAdjustment();
            this.onSpinFinishCallback();
        }
    }

    private startBounceStart(spinDuration: number) {
        this.state = State.BounceStart;
        this.deltaTime = 0;
        this.spinDuration = spinDuration;
    }

    private updateBounceStart(dt: number) {
        const prev = easing.sineOut(Math.min(1, this.deltaTime / this.BOUNCE_START_DURATION)) * this.BOUNCE_START_DISTANCE;
        this.deltaTime += dt;
        const progress = this.deltaTime / this.BOUNCE_START_DURATION;
        const current = easing.sineOut(Math.min(1, progress)) * this.BOUNCE_START_DISTANCE;
        const offset = current - prev;

        this.movingDistance -= offset;
        this.movingReelDown(-offset);
        if (progress >= 1) {
            this.startSpin(this.spinDuration);
        }
    }

    private clear() {
        this.deltaTime = 0;
        this.isFaster = false;
        this.currentSpeed = 0;
        this.isStoppingPhase = false;
        this.movingDistance = 0;
    }

    // Spin phase
    private startSpin(spinDuration: number) {
        this.state = State.Spin;
        this.spinDuration = spinDuration;

        if (spinDuration > 0) {
            this.scheduleOnce(() => {
                this.prepareStop(true);
            }, spinDuration - this.BOUNCE_START_DURATION - this.SLOW_DOWN_DURATION_FAST - this.BOUNCE_STOP_DURATION);
        }
    }

    private updateSpin(dt: number) {
        this.updateCurrentSpeed(dt);
        this.updateBlurSymbols();
        const offset = this.calculateSpinOffset(dt);
        this.movingDistance += offset;

        this.movingReelDown(offset);

        if (this.isStoppingPhase) {
            if (this.currentSpeed <= this.SPEED_STOP_THRESHOLD) {
                AudioUtils.playSFX(AudioIds.REEL_STOP);
                this.startBounceStop();
            }
        }
    }

    private movingReelDown(offset: number) {
        this.items.forEach((item) => {
            item.node.setPosition(item.node.position.x, item.node.position.y - offset, item.node.position.z);

            if (item.node.worldPositionY < this.node.worldPositionY - this.symbolGap / 2) {
                item.node.setPosition(item.node.position.x, item.node.position.y + this.reelHeight, item.node.position.z);
            }
        });
    }

    private calculateSpinOffset(dt: number) {
        return this.currentSpeed * dt;
    }

    private updateBlurSymbols() {
        if (this.currentSpeed > this.BLURRY_SPEED) {
            this.blurSymbols();
        } else {
            this.normalSymbols();
        }
    }

    private updateCurrentSpeed(dt: number) {
        if (this.isStoppingPhase) {
            const distance = this.stoppingDistance;
            const prev = easing.circOut(Math.min(1, this.deltaTime / this.stoppingDuration)) * distance;
            this.deltaTime += dt;
            const current = easing.circOut(Math.min(1, this.deltaTime / this.stoppingDuration)) * distance;
            this.currentSpeed = (current - prev) / dt;
        } else {
            this.currentSpeed = Math.min(this.maxSpeed, this.currentSpeed + this.acceleration * dt);
        }
    }

    get acceleration() {
        return this.SPIN_ACCELERATION;
    }

    get maxSpeed() {
        return this.isFaster ? this.SPIN_MAX_SPEED_2 : this.SPIN_MAX_SPEED;
    }

    public moveFast() {
        this.isFaster = true;
    }

    public stopSoon() {
        this.moveAllItemsToWinningLayer();
        this.scheduleOnce(() => {
            this.prepareStop();
        }, this.DELAY_SLOW_DOWN_DURATION);
    }

    protected moveAllItemsToWinningLayer() {
        this.items.forEach((item) => {
            this.moveToOtherNode(item, this.winningContainer);
        });
    }

    protected moveAllItemsToReelNode() {
        this.items.forEach((item) => {
            this.moveToOtherNode(item, this.node);
        });
    }

    blurSymbols() {
        this.items.forEach((item) => {
            item.handleBlurAnim(true);
        });
    }

    public prepareStop(fast = false) {
        this.isFaster = false;
        const symbolGap = this.symbolGap;
        const currentExcess = this.movingDistance % symbolGap;
        const remainingToNext = symbolGap - currentExcess;
        const extraDistance = symbolGap * this.SPIN_EXTRA_SYMBOLS;
        this.finalMovingDistance = this.movingDistance + remainingToNext + extraDistance;
        this.stoppingDistance = remainingToNext + extraDistance + this.BOUNCE_STOP_DISTANCE;
        this.stoppingDuration = fast ? this.SLOW_DOWN_DURATION_FAST : this.SLOW_DOWN_DURATION;
        this.deltaTime = 0;
        this.isStoppingPhase = true;

        this.syncReelData();
    }

    private startBounceStop() {
        this.deltaTime = 0;
        this.isStoppingPhase = false;
        this.state = State.BounceStop;
    }

    private updateBounceStop(dt: number) {
        const prev = easing.sineOut(Math.min(1, this.deltaTime / this.BOUNCE_STOP_DURATION)) * this.BOUNCE_STOP_DISTANCE;
        this.deltaTime += dt;
        const current = easing.sineOut(Math.min(1, this.deltaTime / this.BOUNCE_STOP_DURATION)) * this.BOUNCE_STOP_DISTANCE;

        const offset = current - prev;
        this.movingDistance -= offset;

        this.movingReelDown(-offset);

        if (this.checkDistanceLessThan(this.movingDistance, this.finalMovingDistance)) {
            this.state = State.None;
            this.finalAdjustment();
            this.onSpinFinishCallback();
            this.moveAllItemsToReelNode();
            this.clear();
        }
    }

    private checkDistanceLessThan(distance: number, targetDistance: number) {
        return distance <= targetDistance || Math.abs(distance - targetDistance) < 1;
    }

    // Data synchronization
    private syncReelData() {
        this.updateLowestIndex();
        this.cachedData.forEach((row, index) => {
            const id = this.rowIndexToItemIndex(index);
            this.items[id].setItem(row);
        });
    }

    private updateLowestIndex() {
        const totalSymbolsPassed = Math.round(this.finalMovingDistance / this.symbolGap) % this.items.length;
        this.lowestIndex = (this.lowestIndex + totalSymbolsPassed) % this.items.length;
    }

    // Final position adjustment
    private finalAdjustment() {
        const finalAdjustment = this.finalMovingDistance - this.movingDistance;
        this.movingReelDown(finalAdjustment);
        this.movingDistance = this.finalMovingDistance;
    }
}
