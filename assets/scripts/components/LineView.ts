import { _decorator, Component, instantiate, misc, Node, Prefab, Tween, tween, v2, v3, Vec2, Widget } from "cc";
import SlotBoard from "./SlotBoard";
const { ccclass, property } = _decorator;

@ccclass
export default class LineView extends Component {
    @property(Prefab)
    linePrefab: Prefab = null;

    @property(Prefab)
    lightPrefab: Prefab = null;

    @property(SlotBoard)
    board: SlotBoard = null;

    @property(Node)
    label: Node = null;

    @property
    isLabelLeft = true;

    public light: Node = null;
    private subLines = {};

    onLoad() {
        this.light = instantiate(this.lightPrefab);
        this.light.active = false;
        this.drawLines();
    }

    drawLines() {
        const labelPos = this.label.convertToWorldSpaceAR(v2(0, 0));
        const lineNum = +this.node.name;
        const linePositions = this.board.getItemPositions(lineNum - 1);
        const positions = [];
        const offset = this.label.width / 2;
        if (this.isLabelLeft) {
            positions.push(v2(labelPos.x + offset, labelPos.y), ...linePositions);
        } else {
            positions.push(...linePositions, v2(labelPos.x - offset, labelPos.y));
        }
        this.createLines(positions);
    }

    onEnable() {
        this.playLightAnimation();
    }

    onDisable() {
        this.stopAnimationLight();
    }

    stopAnimationLight() {
        this.node.stopAllActions();
        Tween.stopAllByTarget(this.node);
        Tween.stopAllByTarget(this.light);
        this.light.active = false;
    }

    runLightOnLine(index: number) {
        if (index >= this.node.children.length) {
            return;
        }
        const child = this.node.children[index];
        const speed = 800;
        const duration = (child.width - this.light.width) / speed;

        this.light.removeFromParent();
        const mask = child.getChildByName("mask");
        mask.addChild(this.light);
        this.light.position = v3();

        let nextIndex = index + 1;
        if (nextIndex > this.node.children.length - 1) {
            nextIndex = 0;
        }
        this.light.scaleX = 1;
        tween(this.light)
            .to(duration, { x: child.width - this.light.width })
            .to(this.light.width / speed, { x: child.width, scaleX: 0 })
            .call(() => {
                this.runLightOnLine(nextIndex);
            })
            .start();
    }

    playLightAnimation() {
        this.light.active = true;
        this.runLightOnLine(0);
    }

    createLines(positions: Vec2[]) {
        let lastNode: Node;
        for (let i = 0; i < positions.length - 1; i++) {
            const start = this.node.convertToNodeSpaceAR(v2(positions[i]));
            const end = this.node.convertToNodeSpaceAR(v2(positions[i + 1]));
            const angle = this.calculateAngle(start, end);
            const width = start.sub(end).len();
            if (lastNode !== undefined && Math.abs(lastNode.angle - angle) < 2) {
                lastNode.width += width;
                lastNode.angle = angle;
                continue;
            }

            let node = this.subLines[i];
            if (!node) {
                node = this.createSubLine();
                this.subLines[i] = node;
            }
            lastNode = node;

            node.angle = this.calculateAngle(start, end);
            node.position = v3(start);
            node.width = width;
        }
    }

    createSubLine(): Node {
        const node = instantiate(this.linePrefab);
        node.anchorX = 0;
        node.anchorY = 0.5;
        this.node.addChild(node);

        const mask = new Node();
        mask.anchorX = 0;
        mask.name = "mask";
        const widget = mask.addComponent(Widget);
        widget.isAlignLeft = true;
        widget.left = 0;
        widget.isAlignRight = true;
        widget.right = 0;
        mask.height = 100;
        node.addChild(mask);
        return node;
    }

    calculateAngle(start: Vec2, end: Vec2): number {
        const dy = end.y - start.y;
        const dx = end.x - start.x;
        if (dx === 0) {
            return dy > 0 ? 90 : -90;
        }

        const rad = Math.atan(dy / dx);
        return misc.radiansToDegrees(rad);
    }
}
