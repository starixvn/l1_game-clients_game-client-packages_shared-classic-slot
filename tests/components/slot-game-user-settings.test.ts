import "reflect-metadata";

import { Container } from "inversify";
import SlotGameUserSettings from "../../assets/scripts/components/slot-game-user-settings";

describe("SlotGameUserSettings", () => {
    let container: Container;
    let userSettings: SlotGameUserSettings;

    beforeEach(() => {
        container = new Container();

        // Create instance
        userSettings = new SlotGameUserSettings();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe("constructor", () => {
        it("should create instance with undefined properties by default", () => {
            const settings = new SlotGameUserSettings();

            expect(settings.betChoices).toBeUndefined();
            expect(settings.stake).toBeUndefined();
            expect(settings.turboEnabled).toBeUndefined();
        });
    });

    describe("betChoices property", () => {
        it("should allow setting and getting betChoices array", () => {
            const testBetChoices = [1, 2, 5, 10, 20, 50];

            userSettings.betChoices = testBetChoices;

            expect(userSettings.betChoices).toEqual(testBetChoices);
            expect(userSettings.betChoices).toHaveLength(6);
        });

        it("should allow setting empty betChoices array", () => {
            userSettings.betChoices = [];

            expect(userSettings.betChoices).toEqual([]);
            expect(userSettings.betChoices).toHaveLength(0);
        });

        it("should allow setting single bet choice", () => {
            userSettings.betChoices = [100];

            expect(userSettings.betChoices).toEqual([100]);
            expect(userSettings.betChoices[0]).toBe(100);
        });

        it("should handle large bet choices array", () => {
            const largeBetChoices = Array.from({ length: 25 }, (_, i) => i + 1);

            userSettings.betChoices = largeBetChoices;

            expect(userSettings.betChoices).toEqual(largeBetChoices);
            expect(userSettings.betChoices).toHaveLength(25);
        });

        it("should preserve bet choices array reference", () => {
            const originalArray = [1, 5, 10];
            userSettings.betChoices = originalArray;

            expect(userSettings.betChoices).toBe(originalArray);
        });
    });

    describe("stake property", () => {
        it("should allow setting and getting stake value", () => {
            const testStake = 50;

            userSettings.stake = testStake;

            expect(userSettings.stake).toBe(testStake);
        });

        it("should handle zero stake", () => {
            userSettings.stake = 0;

            expect(userSettings.stake).toBe(0);
        });

        it("should handle negative stake", () => {
            userSettings.stake = -10;

            expect(userSettings.stake).toBe(-10);
        });

        it("should handle decimal stake values", () => {
            userSettings.stake = 12.5;

            expect(userSettings.stake).toBe(12.5);
        });

        it("should handle large stake values", () => {
            const largeStake = 999999.99;

            userSettings.stake = largeStake;

            expect(userSettings.stake).toBe(largeStake);
        });

        it("should allow overwriting stake value", () => {
            userSettings.stake = 10;
            expect(userSettings.stake).toBe(10);

            userSettings.stake = 25;
            expect(userSettings.stake).toBe(25);
        });
    });

    describe("turboEnabled property", () => {
        it("should allow setting and getting turboEnabled as true", () => {
            userSettings.turboEnabled = true;

            expect(userSettings.turboEnabled).toBe(true);
        });

        it("should allow setting and getting turboEnabled as false", () => {
            userSettings.turboEnabled = false;

            expect(userSettings.turboEnabled).toBe(false);
        });

        it("should allow toggling turboEnabled value", () => {
            userSettings.turboEnabled = false;
            expect(userSettings.turboEnabled).toBe(false);

            userSettings.turboEnabled = true;
            expect(userSettings.turboEnabled).toBe(true);

            userSettings.turboEnabled = false;
            expect(userSettings.turboEnabled).toBe(false);
        });
    });

    describe("property interactions", () => {
        it("should allow setting all properties independently", () => {
            const testBetChoices = [1, 5, 10, 25];
            const testStake = 15;
            const testTurboEnabled = true;

            userSettings.betChoices = testBetChoices;
            userSettings.stake = testStake;
            userSettings.turboEnabled = testTurboEnabled;

            expect(userSettings.betChoices).toEqual(testBetChoices);
            expect(userSettings.stake).toBe(testStake);
            expect(userSettings.turboEnabled).toBe(testTurboEnabled);
        });

        it("should not affect other properties when setting one property", () => {
            // Set initial values
            userSettings.betChoices = [1, 2, 3];
            userSettings.stake = 20;
            userSettings.turboEnabled = false;

            // Change only stake
            userSettings.stake = 50;

            expect(userSettings.betChoices).toEqual([1, 2, 3]);
            expect(userSettings.stake).toBe(50);
            expect(userSettings.turboEnabled).toBe(false);
        });

        it("should handle complete settings configuration", () => {
            const completeSettings = {
                betChoices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                stake: 100,
                turboEnabled: true,
            };

            Object.assign(userSettings, completeSettings);

            expect(userSettings.betChoices).toEqual(completeSettings.betChoices);
            expect(userSettings.stake).toBe(completeSettings.stake);
            expect(userSettings.turboEnabled).toBe(completeSettings.turboEnabled);
        });
    });

    describe("type safety", () => {
        it("should maintain proper types for all properties", () => {
            userSettings.betChoices = [1, 2, 3];
            userSettings.stake = 25;
            userSettings.turboEnabled = true;

            expect(Array.isArray(userSettings.betChoices)).toBe(true);
            expect(typeof userSettings.stake).toBe("number");
            expect(typeof userSettings.turboEnabled).toBe("boolean");
        });

        it("should handle property reassignment", () => {
            // Initial assignment
            userSettings.betChoices = [1, 2];
            userSettings.stake = 10;
            userSettings.turboEnabled = false;

            // Reassignment with different values
            userSettings.betChoices = [5, 10, 15, 20];
            userSettings.stake = 75;
            userSettings.turboEnabled = true;

            expect(userSettings.betChoices).toEqual([5, 10, 15, 20]);
            expect(userSettings.stake).toBe(75);
            expect(userSettings.turboEnabled).toBe(true);
        });
    });

    describe("edge cases", () => {
        it("should handle null assignments gracefully", () => {
            userSettings.betChoices = null as any;
            userSettings.stake = null as any;
            userSettings.turboEnabled = null as any;

            expect(userSettings.betChoices).toBeNull();
            expect(userSettings.stake).toBeNull();
            expect(userSettings.turboEnabled).toBeNull();
        });

        it("should handle undefined assignments", () => {
            userSettings.betChoices = undefined;
            userSettings.stake = undefined;
            userSettings.turboEnabled = undefined;

            expect(userSettings.betChoices).toBeUndefined();
            expect(userSettings.stake).toBeUndefined();
            expect(userSettings.turboEnabled).toBeUndefined();
        });

        it("should handle mixed valid and invalid states", () => {
            userSettings.betChoices = [1, 2, 3];
            userSettings.stake = undefined;
            userSettings.turboEnabled = true;

            expect(userSettings.betChoices).toEqual([1, 2, 3]);
            expect(userSettings.stake).toBeUndefined();
            expect(userSettings.turboEnabled).toBe(true);
        });
    });

    describe("object integrity", () => {
        it("should maintain object integrity after multiple operations", () => {
            const instance1 = new SlotGameUserSettings();
            const instance2 = new SlotGameUserSettings();

            instance1.betChoices = [1, 2];
            instance1.stake = 10;
            instance1.turboEnabled = true;

            instance2.betChoices = [5, 10];
            instance2.stake = 50;
            instance2.turboEnabled = false;

            // Verify instances are independent
            expect(instance1.betChoices).not.toEqual(instance2.betChoices);
            expect(instance1.stake).not.toBe(instance2.stake);
            expect(instance1.turboEnabled).not.toBe(instance2.turboEnabled);
        });

        it("should be JSON serializable", () => {
            userSettings.betChoices = [1, 5, 10];
            userSettings.stake = 25;
            userSettings.turboEnabled = true;

            const serialized = JSON.stringify(userSettings);
            const deserialized = JSON.parse(serialized);

            expect(deserialized.betChoices).toEqual([1, 5, 10]);
            expect(deserialized.stake).toBe(25);
            expect(deserialized.turboEnabled).toBe(true);
        });
    });
});
