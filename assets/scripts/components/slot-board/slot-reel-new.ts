import { _decorator } from "cc";
import { SpecialSymbol } from "../../definitions";
import SlotReel from "./slot-reel";

const { ccclass, property } = _decorator;

@ccclass
export default class SlotReelNew extends SlotReel {
    get symbolGap() {
        return this.itemHeight + this.spacingY;
    }
    protected onSpinFinishCallback = () => {};
    protected isSpin = false;
    protected isStoppingPhase = false;
    protected acceleration = 1000;
    protected deceleration = 2000; // Rate at which the reel slows down
    protected maxSpeed = 5000;
    protected currentSpeed = 0;
    protected spinDuration = 0;
    protected stopThreshold = 2; // Speed threshold to consider reel stopped
    protected EXTRA_SYMBOLS_BEFORE_STOP = 10; // Number of extra symbols to move before stopping

    // Track total distance and symbol spacing
    protected totalDistance = 0;
    protected targetStopDistance = 0;
    protected actualTargetDistance = 0; // New property to track actual target without overshoot
    protected cachedData: number[] = [];
    protected lowestIndex = 17;

    // New properties for anticipation and overshoot effects
    protected readonly ANTICIPATION_DISTANCE = 40; // Distance to move back before spin
    protected readonly ANTICIPATION_DURATION = 0.3; // Duration of anticipation movement
    protected readonly OVERSHOOT_DISTANCE = 80; // Increased from 50 to 80 for more noticeable overshoot
    protected readonly OVERSHOOT_DURATION = 0.5; // Duration of overshoot and return
    protected isAnticipating = false;
    protected isOvershooting = false;

    // Animation state tracking
    protected anticipationProgress = 0;
    protected anticipationSpeed = 0;
    protected anticipationAcceleration = 0;
    protected readonly ANTICIPATION_MIN_SPEED = 20; // Starting speed
    protected readonly ANTICIPATION_MAX_SPEED = 300; // Max speed before transitioning to spin
    protected overshootProgress = 0;
    protected overshootSpeed = 0;
    protected overshootReturnSpeed = 0;
    protected overshootPhase = 0; // 0: overshooting, 1: returning

    spinWithData(spinDuration: number, data: number[], turbo: boolean) {
        return new Promise<void>((resolve) => {
            this.onSpinFinishCallback = resolve;
            this.cachedData = data;

            // Start with anticipation effect
            this.startAnticipation(spinDuration, turbo);
        });
    }

    protected startAnticipation(spinDuration: number, turbo: boolean) {
        this.isAnticipating = true;
        this.anticipationProgress = 0;
        this.spinDuration = spinDuration;
        this.totalDistance = 0;

        // Calculate initial speed and acceleration
        this.anticipationSpeed = this.ANTICIPATION_MIN_SPEED;
        const duration = turbo ? this.ANTICIPATION_DURATION / 2 : this.ANTICIPATION_DURATION;

        // Calculate acceleration needed to reach max speed over the distance
        // Using v² = u² + 2as formula, where:
        // v = final velocity (ANTICIPATION_MAX_SPEED)
        // u = initial velocity (ANTICIPATION_MIN_SPEED)
        // s = distance (ANTICIPATION_DISTANCE)
        // Solve for a (acceleration)
        this.anticipationAcceleration =
            (Math.pow(this.ANTICIPATION_MAX_SPEED, 2) - Math.pow(this.ANTICIPATION_MIN_SPEED, 2)) / (2 * this.ANTICIPATION_DISTANCE);
    }

    showWinningEffect(index: number, symbol: number) {
        let id = (this.lowestIndex + index - 2 + this.items.length) % this.items.length;
        const item = this.items[id];
        const highlight = item.index === symbol || (item.index === SpecialSymbol.WILD && symbol !== SpecialSymbol.JACKPOT);
        item.showWinningEffect(highlight);
        this.moveToOtherNode(item, this.winningContainer);
    }

    protected startSpin(spinDuration: number) {
        this.isSpin = true;
        this.currentSpeed = 0;
        this.spinDuration = spinDuration;
        this.isStoppingPhase = false;

        this.scheduleOnce(() => {
            this.prepareStop();
        }, spinDuration);
    }

    protected prepareStop() {
        const symbolGap = this.symbolGap;
        const currentExcess = this.totalDistance % symbolGap;
        const remainingToNext = symbolGap - currentExcess;
        const extraDistance = symbolGap * this.EXTRA_SYMBOLS_BEFORE_STOP;

        // Set the actual target first (without overshoot)
        this.actualTargetDistance = this.totalDistance + remainingToNext + extraDistance;

        // Add overshoot distance for spin phase
        this.targetStopDistance = this.actualTargetDistance + this.OVERSHOOT_DISTANCE;

        const remainingDistance = this.targetStopDistance - this.totalDistance;
        if (remainingDistance > 0) {
            this.deceleration = (this.currentSpeed * this.currentSpeed) / (2 * remainingDistance);
        }
        this.syncReelData();
        this.isStoppingPhase = true;
    }

    protected syncReelData() {
        this.updateLowestIndex();
        this.cachedData.forEach((row, index) => {
            let id = (this.lowestIndex + index - 2 + this.items.length) % this.items.length;
            this.items[id].setItem(row);
        });
    }

    protected updateLowestIndex() {
        // Use actualTargetDistance instead of targetStopDistance for symbol calculation
        const totalSymbolsPassed = Math.round(this.actualTargetDistance / this.symbolGap);
        const symbolOffset = Math.abs(-totalSymbolsPassed) % this.items.length;
        this.lowestIndex = (this.lowestIndex - symbolOffset + this.items.length) % this.items.length;
    }

    protected startOvershootEffect() {
        this.isOvershooting = true;
        this.isSpin = false;
        this.overshootProgress = 0;

        // Calculate return speed based on distance from actual target
        const currentOvershoot = Math.abs(this.totalDistance - this.actualTargetDistance);
        this.overshootReturnSpeed = (currentOvershoot * 2) / this.OVERSHOOT_DURATION;
    }

    protected update(dt: number): void {
        if (this.isAnticipating) {
            this.updateAnticipation(dt);
        } else if (this.isSpin) {
            this.updateSpin(dt);
        } else if (this.isOvershooting) {
            this.updateOvershoot(dt);
        }
    }

    protected updateAnticipation(dt: number) {
        // Update speed with acceleration
        this.anticipationSpeed = Math.min(this.ANTICIPATION_MAX_SPEED, this.anticipationSpeed + this.anticipationAcceleration * dt);

        // Update progress
        const deltaMove = this.anticipationSpeed * dt;
        this.anticipationProgress += deltaMove;

        // Check if we've reached the target distance
        if (this.anticipationProgress >= this.ANTICIPATION_DISTANCE) {
            this.isAnticipating = false;
            this.startSpin(this.spinDuration);
            return;
        }

        this.totalDistance -= deltaMove;
        // Apply position to all items
        this.items.forEach((item) => {
            item.node.setPosition(item.node.position.x, item.node.position.y + deltaMove, item.node.position.z);
        });
    }

    protected updateOvershoot(dt: number) {
        // Calculate how far we are from actual target
        const currentOvershoot = Math.abs(this.totalDistance - this.actualTargetDistance);
        this.overshootProgress += this.overshootReturnSpeed * dt;

        // Calculate easing for smooth deceleration
        const progress = Math.min(1, this.overshootProgress / currentOvershoot);
        const easedSpeed = this.overshootReturnSpeed * (1 - Math.pow(progress, 2)); // Quadratic ease-out

        const offset = easedSpeed * dt;
        // Apply position to all items
        this.totalDistance -= offset;
        this.items.forEach((item) => {
            item.node.setPosition(item.node.position.x, item.node.position.y + offset, item.node.position.z);
        });

        // Check if we've returned to target
        if (progress >= 1) {
            this.isOvershooting = false;
            this.finalAdjustment();
            this.currentSpeed = 0;
            this.isStoppingPhase = false;
            this.onSpinFinishCallback();
        }
    }

    protected updateSpin(dt: number) {
        const offset = this.calculateSpinOffset(dt);
        this.totalDistance += offset;

        // Move symbols
        this.items.forEach((item) => {
            item.node.setPosition(item.node.position.x, item.node.position.y - offset, item.node.position.z);

            if (item.node.worldPositionY < this.node.worldPositionY - this.symbolGap / 2) {
                item.node.setPosition(item.node.position.x, item.node.position.y + this.reelHeight, item.node.position.z);
            }
        });

        // Check stop conditions
        if (this.isStoppingPhase) {
            const remainingDistance = Math.abs(this.targetStopDistance - this.totalDistance);

            const condition1 = remainingDistance <= 0.1;
            const condition2 = this.currentSpeed <= this.stopThreshold;
            if (condition1 || condition2) {
                // We've reached the overshoot point, now return to actual target
                this.targetStopDistance = this.actualTargetDistance;
                this.startOvershootEffect();
            }
        }
    }

    private finalAdjustment() {
        // Use actualTargetDistance for final position
        const finalAdjustment = this.actualTargetDistance - this.totalDistance;

        if (Math.abs(this.totalDistance - this.actualTargetDistance) > 0.01) {
            this.items.forEach((item) => {
                item.node.setPosition(item.node.position.x, item.node.position.y - finalAdjustment, item.node.position.z);
            });
            this.totalDistance = this.actualTargetDistance;
        }
    }

    protected calculateSpinOffset(dt: number) {
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
            this.currentSpeed = Math.min(this.maxSpeed, this.currentSpeed + this.acceleration * dt);
        }

        return this.currentSpeed * dt;
    }
}
