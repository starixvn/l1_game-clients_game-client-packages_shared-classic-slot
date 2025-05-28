import { _decorator, EventTouch, Node, Prefab, Tween, tween } from "cc";
import HoverItemBase from "db://shared-components/shared/common-components/hover-item-base";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { ComponentUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import { LineData } from "../../definitions";
import { SlotBoardStore } from "../../handlers/stores/slot-board-store";
import SlotBoard from "../slot-board/slot-board";
import LineView from "./line-view";
const { ccclass, property } = _decorator;
const { render } = Observer;

@ccclass
export default class LineViewContainer extends ObserverComponent {
    @property(Prefab)
    linePrefab: Prefab = null;

    @property(Prefab)
    lineGlowPrefab: Prefab = null;

    @property(Node)
    lineContainer: Node = null;

    @property(SlotBoard)
    slotBoard: SlotBoard = null;

    readonly lineOrders = {
        left: [20, 8, 2, 14, 17, 7, 1, 10, 23, 15, 9, 3, 21],
        right: [18, 5, 12, 24, 6, 22, 16, 11, 19, 13, 4, 25],
    };

    showingWinningLine = false;
    showWinningLinesTween: Tween = null;
    onLoad() {
        this.createAllLines();
        super.onLoad();
    }

    @render(SlotBoardStore, (store) => store.winningLines)
    protected renderWinningLine(winningLines: LineData[]) {
        this.showingWinningLine = winningLines.length > 0;
        this.hideAllLines();
        this.showWinningLinesTween?.stop();

        winningLines.forEach((line) => {
            this.showLine(line.payline + 1, this.showingWinningLine);
        });

        const delayTime = 0.5;
        const timeShowPayline = 1.3;
        if (this.showingWinningLine) {
            let index = 0;
            let lastPayline = -1;
            this.showWinningLinesTween = tween(this)
                .delay(delayTime)
                .call(() => {
                    this.hideAllLines();
                    this.slotBoard.hideWinningEffect();
                })
                .repeatForever(
                    tween()
                        .call(() => {
                            if (lastPayline !== -1) {
                                this.showLine(lastPayline, false);
                            }
                            const line = winningLines[index];
                            this.showLine(line.payline + 1, true);
                            this.slotBoard.hideWinningEffect();
                            this.slotBoard.showWinningEffectOnLine(line);
                            lastPayline = line.payline + 1;

                            index++;
                            if (index >= winningLines.length) {
                                index = 0;
                            }
                        })
                        .delay(timeShowPayline)
                )
                .start();
        }
    }

    protected createLineView(child: Node) {
        const node = new Node();
        const view = node.addComponent(LineView);
        view.linePrefab = this.linePrefab;
        view.lightPrefab = this.lineGlowPrefab;
        view.board = this.slotBoard;
        view.label = child;
        node.name = child.name;
        node.active = false;
        return view;
    }

    protected createAllLines() {
        const hover = this.node.getChildByName("hover");

        const callback = {
            onMove: (e) => {
                if (!this.showingWinningLine) {
                    this.showLineWhenHover(e);
                }
            },
            onLeave: (e) => {
                if (!this.showingWinningLine) {
                    this.hideAllLines();
                }
            },
        };

        hover.children.forEach((container) => {
            container.children.forEach((child, index) => {
                child.name = this.lineOrders[container.name][index].toString();

                const view = this.createLineView(child);
                view.isLabelLeft = container.name === "left";
                this.lineContainer.addChild(view.node);
            });

            container.getComponent(HoverItemBase).touchCallback = callback;
        });
    }

    protected showLineWhenHover(event: EventTouch) {
        const container: Node = event.target;
        const location = event.getLocation();
        container.children.forEach((child) => {
            const transform = ComponentUtils.getTransform(child);
            const hit = transform.hitTest(location, event.windowId);
            this.showLine(+child.name, hit);
        });
    }

    protected hideAllLines() {
        this.lineContainer.children.forEach((child) => (child.active = false));
    }

    protected showLine(num: number, show = true) {
        const line = this.lineContainer.getChildByName(`${num}`);
        if (line) {
            line.active = show;
        }
    }
}
