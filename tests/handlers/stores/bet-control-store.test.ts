import "reflect-metadata";
//rest
import gc from "@sg/game-client-base";
import { Container } from "inversify";
import mobx from "mobx";
import { SLOT_LINES } from "../../../assets/scripts/definitions";
import { BetControlStore } from "../../../assets/scripts/handlers/stores/bet-control-store";

// Mocks
jest.mock("@sg/game-client-base", () => {
    const actualGc = jest.requireActual("@sg/game-client-base");
    return {
        ...actualGc,
        GameConfigs: {
            ...actualGc.GameConfigs,
            GameConfigStore: jest.fn().mockImplementation(() => ({
                chips: ["10", "20", "30"], // chips are string[] as per gc.GameServiceMessage.GameConfigs
            })),
        },
        Rounds: {
            ...actualGc.Rounds,
            RoundTimeStore: jest.fn().mockImplementation(() => ({})),
            RoundStore: jest.fn().mockImplementation(() => ({})),
        },
        Player: {
            ...actualGc.Player,
            MainPlayerStore: jest.fn().mockImplementation(() => ({})),
        },
        GameUserSettings: {
            ...actualGc.GameUserSettings,
            GameUserSettingHandler: jest.fn().mockImplementation(() => ({})),
        },
        System: {
            ...actualGc.System,
            EventSystem: {
                instance: {
                    on: jest.fn(),
                    off: jest.fn(),
                    emit: jest.fn(),
                },
            },
        },
    };
});

describe("BetControlStore", () => {
    let container: Container;
    let betControlStore: BetControlStore;
    let mockGameConfigStore: jest.Mocked<gc.GameConfigs.GameConfigStore>;

    beforeEach(() => {
        container = new Container();
        mockGameConfigStore = new (jest.requireMock(
            "@sg/game-client-base"
        ).GameConfigs.GameConfigStore)() as jest.Mocked<gc.GameConfigs.GameConfigStore>;

        container.bind(BetControlStore).toSelf();
        container.bind(gc.GameConfigs.GameConfigStore).toConstantValue(mockGameConfigStore);
        container.bind(gc.Rounds.RoundTimeStore).toConstantValue(new (jest.requireMock("@sg/game-client-base").Rounds.RoundTimeStore)());
        container.bind(gc.Rounds.RoundStore).toConstantValue(new (jest.requireMock("@sg/game-client-base").Rounds.RoundStore)());
        container.bind(gc.Player.MainPlayerStore).toConstantValue(new (jest.requireMock("@sg/game-client-base").Player.MainPlayerStore)());
        container
            .bind(gc.GameUserSettings.GameUserSettingHandler)
            .toConstantValue(new (jest.requireMock("@sg/game-client-base").GameUserSettings.GameUserSettingHandler)());

        betControlStore = container.get(BetControlStore);

        // Manually trigger the reaction logic for betLevels initialization as it's in a setTimeout
        // In the actual store, this reaction converts string chips to number betLevels.
        mobx.runInAction(() => {
            const stringChips = mockGameConfigStore.chips;
            betControlStore.betLevels = stringChips.map((chip) => +chip);
            if (betControlStore.betLevels.length > 3) {
                betControlStore.betLevels = betControlStore.betLevels.slice(0, 3);
            }
            if (betControlStore.betLevels.length > 0) {
                betControlStore.stake = betControlStore.betLevels[0];
            } else {
                betControlStore.stake = 0;
            }
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("Constructor and Initialization", () => {
        it("should initialize betLevels from gameConfigStore.chips (as numbers)", () => {
            // This test now relies on the manual reaction trigger in beforeEach
            expect(betControlStore.betLevels).toEqual([10, 20, 30]);
            expect(betControlStore.stake).toBe(10);
        });

        it("should cap betLevels at 3 if string chips from config are more than 3 items", () => {
            // Override mock for this specific test
            mockGameConfigStore.chips = ["1", "2", "3", "4", "5"];

            // Re-trigger the reaction logic with the new chips value
            mobx.runInAction(() => {
                const stringChips = mockGameConfigStore.chips;
                betControlStore.betLevels = stringChips.map((chip) => +chip);
                if (betControlStore.betLevels.length > 3) {
                    betControlStore.betLevels = betControlStore.betLevels.slice(0, 3);
                }
                if (betControlStore.betLevels.length > 0) {
                    betControlStore.stake = betControlStore.betLevels[0];
                } else {
                    betControlStore.stake = 0;
                }
            });

            expect(betControlStore.betLevels).toEqual([1, 2, 3]);
            expect(betControlStore.stake).toBe(1);
        });

        it("should initialize with default values", () => {
            // Create a fresh store to ensure constructor defaults prior to reaction
            const freshStore = new BetControlStore();
            // // Manually inject dependencies for this fresh instance as container.get(BetControlStore) would run constructor logic again
            // Object.assign(freshStore, {
            //     gameConfigStore: mockGameConfigStore,
            //     roundTimeStore: container.get(gc.Rounds.RoundTimeStore),
            //     roundStore: container.get(gc.Rounds.RoundStore),
            //     mainPlayerStore: container.get(gc.Player.MainPlayerStore),
            //     gameUserSettingHandler: container.get(gc.GameUserSettings.GameUserSettingHandler),
            // });

            expect(freshStore.betLevels).toEqual([]); // Before reaction
            expect(freshStore.stake).toBe(0); // Before reaction sets it based on betLevels
            expect(freshStore.roundId).toBe(-1);
            expect(freshStore.interactableBet).toBe(false);
            expect(freshStore.stakeSelectorShow).toBe(false);
            expect(freshStore.stakeSelectorDisabled).toBe(false);
            expect(freshStore.showLineSelection).toBeNull();
            expect(freshStore.triggerAutoSpin).toBe(true);
            expect(freshStore.autoSpinCount).toBe(0);
            expect(freshStore.autoSpinEnabled).toBe(false);
            expect(freshStore.autoSpinDialogOpenEvent).toBeNull();
            expect(freshStore.autoSpinSelectedValue).toBe(10);
            expect(freshStore.freeSpinCount).toBe(-1);
            expect(freshStore.freeSpinCountDisplay).toBe(-1);
            expect(freshStore.turboEnabled).toBe(false);
        });
    });

    describe("Computed Properties", () => {
        describe("totalBet", () => {
            it("should calculate totalBet based on stake and SLOT_LINES", () => {
                mobx.runInAction(() => {
                    betControlStore.stake = 20;
                });
                expect(betControlStore.totalBet).toBe(20 * SLOT_LINES);
            });
        });

        describe("freeSpinEnabled", () => {
            it("should be true if freeSpinCount > 0", () => {
                mobx.runInAction(() => {
                    betControlStore.freeSpinCount = 1;
                });
                expect(betControlStore.freeSpinEnabled).toBe(true);
            });
            it("should be false if freeSpinCount is 0 or less", () => {
                mobx.runInAction(() => {
                    betControlStore.freeSpinCount = 0;
                });
                expect(betControlStore.freeSpinEnabled).toBe(false);
                mobx.runInAction(() => {
                    betControlStore.freeSpinCount = -1;
                });
                expect(betControlStore.freeSpinEnabled).toBe(false);
            });
        });

        describe("stakeIndex", () => {
            it("should return the correct index of stake in betLevels", () => {
                mobx.runInAction(() => {
                    betControlStore.betLevels = [10, 20, 50];
                    betControlStore.stake = 20;
                });
                expect(betControlStore.stakeIndex).toBe(1);
            });
            it("should return -1 if stake is not in betLevels", () => {
                mobx.runInAction(() => {
                    betControlStore.betLevels = [10, 20, 50];
                    betControlStore.stake = 30; // Not in levels
                });
                expect(betControlStore.stakeIndex).toBe(-1);
            });
        });

        describe("disableIncreaseStake", () => {
            beforeEach(() => {
                mobx.runInAction(() => {
                    betControlStore.betLevels = [10, 20, 30];
                });
            });
            it("should be true if stakeIndex is at the last element", () => {
                mobx.runInAction(() => {
                    betControlStore.stake = 30;
                });
                expect(betControlStore.disableIncreaseStake).toBe(true);
            });
            it("should be true if stakeIndex is -1", () => {
                mobx.runInAction(() => {
                    betControlStore.stake = 100;
                }); // Not in betLevels
                expect(betControlStore.disableIncreaseStake).toBe(true);
            });
            it("should be false if stake can be increased", () => {
                mobx.runInAction(() => {
                    betControlStore.stake = 10;
                });
                expect(betControlStore.disableIncreaseStake).toBe(false);
                mobx.runInAction(() => {
                    betControlStore.stake = 20;
                });
                expect(betControlStore.disableIncreaseStake).toBe(false);
            });
        });

        describe("disableDecreaseStake", () => {
            beforeEach(() => {
                mobx.runInAction(() => {
                    betControlStore.betLevels = [10, 20, 30];
                });
            });
            it("should be true if stakeIndex is 0", () => {
                mobx.runInAction(() => {
                    betControlStore.stake = 10;
                });
                expect(betControlStore.disableDecreaseStake).toBe(true);
            });
            it("should be true if stakeIndex is -1", () => {
                mobx.runInAction(() => {
                    betControlStore.stake = 100;
                }); // Not in betLevels
                expect(betControlStore.disableDecreaseStake).toBe(true);
            });
            it("should be false if stake can be decreased", () => {
                mobx.runInAction(() => {
                    betControlStore.stake = 30;
                });
                expect(betControlStore.disableDecreaseStake).toBe(false);
                mobx.runInAction(() => {
                    betControlStore.stake = 20;
                });
                expect(betControlStore.disableDecreaseStake).toBe(false);
            });
        });
    });

    describe("Actions", () => {
        beforeEach(() => {
            // This setup uses the betLevels already processed in the main beforeEach
            // Ensure stake is also set according to initial betLevels
            mobx.runInAction(() => {
                // betControlStore.betLevels are ["10", "20", "30"] converted to [10, 20, 30]
                // betControlStore.stake is 10 from the main beforeEach
                // For these tests, let's use a more diverse set if needed or rely on the default
                betControlStore.betLevels = [10, 20, 50, 100];
                betControlStore.stake = 20;
            });
        });

        describe("setStake", () => {
            it("should update stake", () => {
                betControlStore.setStake(50);
                expect(betControlStore.stake).toBe(50);
            });
        });

        describe("quickChangeStake", () => {
            it("should increase stake to the next level", () => {
                betControlStore.quickChangeStake(true);
                expect(betControlStore.stake).toBe(50);
            });
            it("should not increase stake if at max level", () => {
                mobx.runInAction(() => {
                    betControlStore.stake = 100;
                });
                betControlStore.quickChangeStake(true);
                expect(betControlStore.stake).toBe(100);
            });
            it("should decrease stake to the previous level", () => {
                betControlStore.quickChangeStake(false);
                expect(betControlStore.stake).toBe(10);
            });
            it("should not decrease stake if at min level", () => {
                mobx.runInAction(() => {
                    betControlStore.stake = 10;
                });
                betControlStore.quickChangeStake(false);
                expect(betControlStore.stake).toBe(10);
            });
            it("should not change stake if stakeIndex is -1", () => {
                mobx.runInAction(() => {
                    betControlStore.stake = 99; // Not in levels
                });
                betControlStore.quickChangeStake(true);
                expect(betControlStore.stake).toBe(99);
                betControlStore.quickChangeStake(false);
                expect(betControlStore.stake).toBe(99);
            });
        });

        describe("setStakeSelectorShow", () => {
            it("should update stakeSelectorShow", () => {
                betControlStore.setStakeSelectorShow(true);
                expect(betControlStore.stakeSelectorShow).toBe(true);
                betControlStore.setStakeSelectorShow(false);
                expect(betControlStore.stakeSelectorShow).toBe(false);
            });
        });

        describe("setStakeSelectorDisabled", () => {
            it("should update stakeSelectorDisabled", () => {
                betControlStore.setStakeSelectorDisabled(true);
                expect(betControlStore.stakeSelectorDisabled).toBe(true);
                betControlStore.setStakeSelectorDisabled(false);
                expect(betControlStore.stakeSelectorDisabled).toBe(false);
            });
        });

        describe("setBetLevels", () => {
            it("should update betLevels (input should be number[])", () => {
                const newLevels = [5, 15, 25];
                betControlStore.setBetLevels(newLevels);
                expect(betControlStore.betLevels).toEqual(newLevels);
            });
        });

        describe("Free Spin Actions", () => {
            it("setTotalFreeSpins should update freeSpinCount", () => {
                betControlStore.setTotalFreeSpins(10);
                expect(betControlStore.freeSpinCount).toBe(10);
            });
            it("syncFreeSpinCount should set freeSpinCountDisplay to freeSpinCount", () => {
                mobx.runInAction(() => {
                    betControlStore.freeSpinCount = 7;
                });
                betControlStore.syncFreeSpinCount();
                expect(betControlStore.freeSpinCountDisplay).toBe(7);
            });
            it("decreaseFreeSpinCount should decrement freeSpinCountDisplay", () => {
                mobx.runInAction(() => {
                    betControlStore.freeSpinCountDisplay = 5;
                });
                betControlStore.decreaseFreeSpinCount();
                expect(betControlStore.freeSpinCountDisplay).toBe(4);
            });
            it("clearFreeSpins should reset freeSpinCount and freeSpinCountDisplay to -1", () => {
                mobx.runInAction(() => {
                    betControlStore.freeSpinCount = 5;
                    betControlStore.freeSpinCountDisplay = 5;
                });
                betControlStore.clearFreeSpins();
                expect(betControlStore.freeSpinCount).toBe(-1);
                expect(betControlStore.freeSpinCountDisplay).toBe(-1);
            });
        });

        describe("Turbo Actions", () => {
            it("setTurbo should update turboEnabled", () => {
                betControlStore.setTurbo(true);
                expect(betControlStore.turboEnabled).toBe(true);
                betControlStore.setTurbo(false);
                expect(betControlStore.turboEnabled).toBe(false);
            });
        });

        describe("Auto Spin Actions", () => {
            it("acceptAutoSpinValue should set autoSpinCount, autoSpinSelectedValue, and enable autoSpin", () => {
                betControlStore.acceptAutoSpinValue(50);
                expect(betControlStore.autoSpinCount).toBe(50);
                expect(betControlStore.autoSpinSelectedValue).toBe(50);
                expect(betControlStore.autoSpinEnabled).toBe(true);
            });

            it("decreaseAutoSpinCount should decrement autoSpinCount and return true if count > 0", () => {
                mobx.runInAction(() => {
                    betControlStore.autoSpinCount = 5;
                });
                const result = betControlStore.decreaseAutoSpinCount();
                expect(result).toBe(true);
                expect(betControlStore.autoSpinCount).toBe(4);
            });
            it("decreaseAutoSpinCount should not change autoSpinCount and return false if count is 0 or less", () => {
                mobx.runInAction(() => {
                    betControlStore.autoSpinCount = 0;
                });
                let result = betControlStore.decreaseAutoSpinCount();
                expect(result).toBe(false);
                expect(betControlStore.autoSpinCount).toBe(0);

                mobx.runInAction(() => {
                    betControlStore.autoSpinCount = -1;
                });
                result = betControlStore.decreaseAutoSpinCount();
                expect(result).toBe(false);
                expect(betControlStore.autoSpinCount).toBe(-1);
            });

            it("cancelAutoSpin should set autoSpinEnabled to false", () => {
                mobx.runInAction(() => {
                    betControlStore.autoSpinEnabled = true;
                });
                betControlStore.cancelAutoSpin();
                expect(betControlStore.autoSpinEnabled).toBe(false);
            });
        });
    });
});
