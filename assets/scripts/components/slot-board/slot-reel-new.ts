import { _decorator, Layout, log } from "cc";
import { SLOT_ROW_MAX_INDEX, SpecialSymbol } from "../../definitions";
import SlotReel from "./slot-reel";

const { ccclass, property } = _decorator;

@ccclass
export default class SlotReelNew extends SlotReel {
    // Computed property
    get symbolGap() {
        return this.itemHeight + this.spacingY;
    }

    // Configuration constants
    private readonly ANTICIPATION_DISTANCE = 20;
    private readonly ANTICIPATION_MIN_SPEED = 200;
    private readonly ANTICIPATION_MAX_SPEED = 300;

    private readonly SPIN_ACCELERATION = 5000;
    private readonly SPIN_ACCELERATION_2 = 5000;
    private readonly SPIN_MAX_SPEED = 1365;
    private readonly SPIN_MAX_SPEED_2 = 2243;
    private readonly SPIN_STOP_THRESHOLD = 2;

    private readonly SPIN_EXTRA_SYMBOLS = 18;
    private readonly SPIN_EXTRA_SYMBOLS_FAST = 2;

    private readonly OVERSHOOT_DISTANCE = 25;
    private readonly OVERSHOOT_DURATION = 0.3;

    private readonly TURBO_SPIN_ITEM_COUNT = 10;
    private readonly DELAY_SLOW_DOWN_DURATION = 2;
    private readonly SLOW_DOWN_DURATION = 3;
    private readonly SLOW_DOWN_DURATION_FAST = 0.4;

    // State tracking
    private isSpin = false;
    private isTurbo = false;
    public isFaster = false;
    private isStoppingPhase = false;
    private isAnticipating = false;
    private isOvershooting = false;

    // Movement tracking
    private totalDistance = 0;
    private targetStopDistance = 0;
    private stoppingDistance = 0;
    private actualTargetDistance = 0;
    private turboSpeed = 0;
    private currentSpeed = 0;
    private stoppingElapsedTime = 0;
    private easingSlowDuration = 0;

    // Anticipation state
    private anticipationProgress = 0;
    private anticipationSpeed = 0;
    private anticipationAcceleration = 0;

    // Overshoot state
    private overshootProgress = 0;
    private overshootReturnSpeed = 0;

    // Data tracking
    private spinDuration = 0;
    private cachedData: number[] = [];
    private lowestIndex = 0;
    private onSpinFinishCallback = () => {};

    protected override init() {
        super.init();
        this.layout.verticalDirection = Layout.VerticalDirection.BOTTOM_TO_TOP;
    }

    // Public API
    public spinNormal(spinDuration: number, data: number[]) {
        return new Promise<void>((resolve) => {
            this.onSpinFinishCallback = resolve;
            this.cachedData = data;
            this.totalDistance = 0;
            this.startAnticipation(spinDuration);
            log("spinNormal", spinDuration);
        });
    }

    public spinTurbo(spinDuration: number, data: number[]) {
        return new Promise<void>((resolve) => {
            this.onSpinFinishCallback = resolve;
            this.cachedData = data;
            this.totalDistance = 0;
            this.isTurbo = true;
            this.actualTargetDistance = this.symbolGap * this.TURBO_SPIN_ITEM_COUNT;
            this.turboSpeed = this.actualTargetDistance / spinDuration;
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
    protected update(dt: number): void {
        if (this.isAnticipating) {
            this.updateAnticipation(dt);
        } else if (this.isSpin) {
            this.updateSpin(dt);
        } else if (this.isOvershooting) {
            this.updateOvershoot(dt);
        } else if (this.isTurbo) {
            this.updateTurbo(dt);
        }
    }

    private updateTurbo(dt: number) {
        const offset = this.turboSpeed * dt;
        this.totalDistance += offset;
        this.movingReel(offset);

        if (this.totalDistance >= this.actualTargetDistance) {
            this.isTurbo = false;
            this.finalAdjustment();
            this.onSpinFinishCallback();
        }
    }

    // Anticipation phase
    private startAnticipation(spinDuration: number) {
        this.isAnticipating = true;
        this.anticipationProgress = 0;
        this.spinDuration = spinDuration;

        this.anticipationSpeed = this.ANTICIPATION_MIN_SPEED;

        this.anticipationAcceleration =
            (Math.pow(this.ANTICIPATION_MAX_SPEED, 2) - Math.pow(this.ANTICIPATION_MIN_SPEED, 2)) / (2 * this.ANTICIPATION_DISTANCE);
    }

    private updateAnticipation(dt: number) {
        this.anticipationSpeed = Math.min(this.ANTICIPATION_MAX_SPEED, this.anticipationSpeed + this.anticipationAcceleration * dt);

        const deltaMove = this.anticipationSpeed * dt;
        this.anticipationProgress += deltaMove;

        if (this.anticipationProgress >= this.ANTICIPATION_DISTANCE) {
            this.isAnticipating = false;
            this.startSpin(this.spinDuration);
            return;
        }

        this.totalDistance -= deltaMove;
        this.items.forEach((item) => {
            item.node.setPosition(item.node.position.x, item.node.position.y + deltaMove, item.node.position.z);
        });
    }

    // Spin phase
    private startSpin(spinDuration: number) {
        this.isSpin = true;
        this.isFaster = false;
        this.currentSpeed = 0;
        this.spinDuration = spinDuration;
        this.isStoppingPhase = false;

        if (spinDuration > 0) {
            this.scheduleOnce(() => {
                this.prepareStop(true);
            }, spinDuration - this.SLOW_DOWN_DURATION_FAST);
        }
    }

    private updateSpin(dt: number) {
        const offset = this.calculateSpinOffset(dt);
        this.totalDistance += offset;

        this.movingReel(offset);

        if (this.isStoppingPhase) {
            const remainingDistance = Math.abs(this.targetStopDistance - this.totalDistance);
            if (
                remainingDistance <= 0.1 ||
                this.totalDistance >= this.targetStopDistance ||
                this.currentSpeed <= this.SPIN_STOP_THRESHOLD
            ) {
                this.targetStopDistance = this.actualTargetDistance;
                this.startOvershootEffect();
            }
        }
    }

    private movingReel(offset: number) {
        this.items.forEach((item) => {
            item.node.setPosition(item.node.position.x, item.node.position.y - offset, item.node.position.z);

            if (item.node.worldPositionY < this.node.worldPositionY - this.symbolGap / 2) {
                item.node.setPosition(item.node.position.x, item.node.position.y + this.reelHeight, item.node.position.z);
            }
        });
    }

    easeOutSine(x: number) {
        return Math.sin((x * Math.PI) / 2); //sineOut
    }

    private calculateSpinOffset(dt: number) {
        if (this.isStoppingPhase) {
            const distance = this.stoppingDistance;
            const prev = this.easeOutSine(this.stoppingElapsedTime / this.easingSlowDuration) * distance;
            this.stoppingElapsedTime += dt;
            const progress = Math.min(1, this.stoppingElapsedTime / this.easingSlowDuration);
            const current = this.easeOutSine(progress) * distance;
            console.log(`slow speed ${this.node.name}`, (current - prev) / dt);
            return current - prev;
        } else {
            console.log(`speed ${this.node.name}`, this.currentSpeed);
            this.currentSpeed = Math.min(this.maxSpeed, this.currentSpeed + this.acceleration * dt);
        }

        if (this.currentSpeed > 1000) {
            this.blurSymbols();
        }

        return this.currentSpeed * dt;
    }

    get acceleration() {
        return this.isFaster ? this.SPIN_ACCELERATION_2 : this.SPIN_ACCELERATION;
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
            this.isFaster = false;
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
        console.time("stop in " + this.node.name);
        console.log("--------------- current speed ", this.currentSpeed);
        this.normalSymbols();

        const symbolGap = this.symbolGap;
        const currentExcess = this.totalDistance % symbolGap;
        const remainingToNext = symbolGap - currentExcess;
        const extraDistance = symbolGap * (fast ? this.SPIN_EXTRA_SYMBOLS_FAST : this.SPIN_EXTRA_SYMBOLS);
        this.actualTargetDistance = this.totalDistance + remainingToNext + extraDistance;
        this.targetStopDistance = this.actualTargetDistance + this.OVERSHOOT_DISTANCE;

        this.stoppingDistance = this.targetStopDistance - this.totalDistance;
        this.easingSlowDuration = fast ? this.SLOW_DOWN_DURATION_FAST : this.SLOW_DOWN_DURATION;
        this.stoppingElapsedTime = 0;

        this.syncReelData();
        this.isStoppingPhase = true;
    }

    // Overshoot phase
    private startOvershootEffect() {
        console.timeEnd("stop in " + this.node.name);
        console.time("back in " + this.node.name);
        this.isOvershooting = true;
        this.isSpin = false;
        this.overshootProgress = 0;

        const currentOvershoot = Math.abs(this.totalDistance - this.actualTargetDistance);
        this.overshootReturnSpeed = currentOvershoot / this.OVERSHOOT_DURATION;
    }

    private updateOvershoot(dt: number) {
        this.overshootProgress += this.overshootReturnSpeed * dt;

        const progress = Math.min(1, this.overshootProgress / this.OVERSHOOT_DISTANCE);
        const easedSpeed = this.overshootReturnSpeed * (1 - Math.pow(progress, 2));

        const offset = easedSpeed * dt;
        this.totalDistance -= offset;

        this.items.forEach((item) => {
            item.node.setPosition(item.node.position.x, item.node.position.y + offset, item.node.position.z);
        });

        if (progress >= 1) {
            this.isOvershooting = false;
            this.finalAdjustment();
            this.currentSpeed = 0;
            this.isStoppingPhase = false;
            this.onSpinFinishCallback();
            this.moveAllItemsToReelNode();
            console.timeEnd("back in " + this.node.name);
        }
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
        const totalSymbolsPassed = Math.round(this.actualTargetDistance / this.symbolGap) % this.items.length;
        this.lowestIndex = (this.lowestIndex + totalSymbolsPassed) % this.items.length;
    }

    // Final position adjustment
    private finalAdjustment() {
        const finalAdjustment = this.actualTargetDistance - this.totalDistance;
        if (Math.abs(this.totalDistance - this.actualTargetDistance) > 0.01) {
            this.items.forEach((item) => {
                item.node.setPosition(item.node.position.x, item.node.position.y - finalAdjustment, item.node.position.z);
            });
            this.totalDistance = this.actualTargetDistance;
        }
    }
}
