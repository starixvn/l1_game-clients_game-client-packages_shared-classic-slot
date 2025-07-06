import { _decorator } from "cc";
import { SpecialSymbol } from "../../definitions";
import SlotReel from "./slot-reel";

const { ccclass, property } = _decorator;

export const SPIN_FOREVER = -1;

@ccclass
export default class SlotReelNew extends SlotReel {
    // Computed property
    get symbolGap() {
        return this.itemHeight + this.spacingY;
    }

    // Configuration constants
    private readonly ANTICIPATION_DISTANCE = 40;
    private readonly ANTICIPATION_DURATION = 0.3;
    private readonly ANTICIPATION_MIN_SPEED = 20;
    private readonly ANTICIPATION_MAX_SPEED = 300;

    private readonly SPIN_ACCELERATION = 1000;
    private readonly SPIN_MAX_SPEED = 5000;
    private readonly SPIN_STOP_THRESHOLD = 2;
    private readonly SPIN_EXTRA_SYMBOLS = 10;

    private readonly OVERSHOOT_DISTANCE = 80;
    private readonly OVERSHOOT_DURATION = 0.5;

    // State tracking
    private isSpin = false;
    private isStoppingPhase = false;
    private isAnticipating = false;
    private isOvershooting = false;

    // Movement tracking
    private totalDistance = 0;
    private targetStopDistance = 0;
    private actualTargetDistance = 0;
    private currentSpeed = 0;
    private deceleration = 2000;

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
    private lowestIndex = 17;
    private onSpinFinishCallback = () => {};

    // Public API
    public spinNormal(spinDuration: number, data: number[]) {
        return new Promise<void>((resolve) => {
            this.onSpinFinishCallback = resolve;
            this.cachedData = data;
            this.totalDistance = 0;
            this.startAnticipation(spinDuration);
        });
    }

    protected rowIndexToItemIndex(index: number) {
        return (this.lowestIndex + index - 2 + this.items.length) % this.items.length;
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
        this.currentSpeed = 0;
        this.spinDuration = spinDuration;
        this.isStoppingPhase = false;

        if (spinDuration > 0) {
            this.scheduleOnce(() => {
                this.prepareStop();
            }, spinDuration);
        }
    }

    private updateSpin(dt: number) {
        const offset = this.calculateSpinOffset(dt);
        this.totalDistance += offset;

        this.items.forEach((item) => {
            item.node.setPosition(item.node.position.x, item.node.position.y - offset, item.node.position.z);

            if (item.node.worldPositionY < this.node.worldPositionY - this.symbolGap / 2) {
                item.node.setPosition(item.node.position.x, item.node.position.y + this.reelHeight, item.node.position.z);
            }
        });

        if (this.isStoppingPhase) {
            const remainingDistance = Math.abs(this.targetStopDistance - this.totalDistance);
            if (remainingDistance <= 0.1 || this.currentSpeed <= this.SPIN_STOP_THRESHOLD) {
                this.targetStopDistance = this.actualTargetDistance;
                this.startOvershootEffect();
            }
        }
    }

    private calculateSpinOffset(dt: number) {
        if (this.isStoppingPhase) {
            const remainingDistance = this.targetStopDistance - this.totalDistance;
            if (Math.abs(remainingDistance) < this.currentSpeed * dt) {
                return remainingDistance;
            }

            const totalStopDistance = this.targetStopDistance - (this.totalDistance - this.currentSpeed * dt);
            const progress = 1 - remainingDistance / totalStopDistance;
            const adjustedDeceleration = progress > 0.7 ? this.deceleration * 2 : this.deceleration;
            this.currentSpeed = Math.max(0, this.currentSpeed - adjustedDeceleration * dt);
        } else {
            this.currentSpeed = Math.min(this.SPIN_MAX_SPEED, this.currentSpeed + this.SPIN_ACCELERATION * dt);
        }

        return this.currentSpeed * dt;
    }

    public prepareStop() {
        const symbolGap = this.symbolGap;
        const currentExcess = this.totalDistance % symbolGap;
        const remainingToNext = symbolGap - currentExcess;
        const extraDistance = symbolGap * this.SPIN_EXTRA_SYMBOLS;

        this.actualTargetDistance = this.totalDistance + remainingToNext + extraDistance;
        this.targetStopDistance = this.actualTargetDistance + this.OVERSHOOT_DISTANCE;

        const remainingDistance = this.targetStopDistance - this.totalDistance;
        if (remainingDistance > 0) {
            this.deceleration = (this.currentSpeed * this.currentSpeed) / (2 * remainingDistance);
        }

        this.syncReelData();
        this.isStoppingPhase = true;
    }

    // Overshoot phase
    private startOvershootEffect() {
        this.isOvershooting = true;
        this.isSpin = false;
        this.overshootProgress = 0;

        const currentOvershoot = Math.abs(this.totalDistance - this.actualTargetDistance);
        this.overshootReturnSpeed = (currentOvershoot * 2) / this.OVERSHOOT_DURATION;
    }

    private updateOvershoot(dt: number) {
        const currentOvershoot = Math.abs(this.totalDistance - this.actualTargetDistance);
        this.overshootProgress += this.overshootReturnSpeed * dt;

        const progress = Math.min(1, this.overshootProgress / currentOvershoot);
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
        const totalSymbolsPassed = Math.round(this.actualTargetDistance / this.symbolGap);
        const symbolOffset = Math.abs(totalSymbolsPassed) % this.items.length;
        this.lowestIndex = (this.lowestIndex - symbolOffset + this.items.length) % this.items.length;
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
