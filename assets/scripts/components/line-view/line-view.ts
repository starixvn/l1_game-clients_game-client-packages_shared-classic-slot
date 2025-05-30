import { _decorator, Component, instantiate, misc, Node, Prefab, tween, Tween, v3, Vec3, Widget } from "cc";
import { ComponentUtils } from "db://shared-components/shared/utils/component-utils";
import SlotBoard from "../slot-board/slot-board";
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
        const transform = ComponentUtils.getTransform(this.label);
        const labelPos = transform.convertToWorldSpaceAR(v3(0, 0));
        const lineNum = +this.node.name;
        const linePositions = this.board.getItemPositions(lineNum - 1);
        const positions = [];
        const offset = transform.width / 2;
        if (this.isLabelLeft) {
            positions.push(v3(labelPos.x + offset, labelPos.y), ...linePositions);
        } else {
            positions.push(...linePositions, v3(labelPos.x - offset, labelPos.y));
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
        const transform = ComponentUtils.getTransform(child);
        const lightTransform = ComponentUtils.getTransform(this.light);
        const duration = (transform.width - lightTransform.width) / speed;

        this.light.removeFromParent();
        const mask = child.getChildByName("mask");
        mask.addChild(this.light);
        this.light.position = v3();

        let nextIndex = index + 1;
        if (nextIndex > this.node.children.length - 1) {
            nextIndex = 0;
        }
        this.light.scale = v3(1, 1, 1);
        tween(this.light)
            .to(duration, { position: v3(transform.width - lightTransform.width, this.light.position.y, 0) })
            .to(lightTransform.width / speed, { position: v3(transform.width, this.light.position.y, 0), scale: v3(0, 1, 1) })
            .call(() => {
                this.runLightOnLine(nextIndex);
            })
            .start();
    }

    playLightAnimation() {
        this.light.active = true;
        this.runLightOnLine(0);
    }

    createLines(positions: Vec3[]) {
        let lastNode: Node;
        for (let i = 0; i < positions.length - 1; i++) {
            const transform = ComponentUtils.getTransform(this.node);
            const wStart = v3(positions[i]);
            const start = transform.convertToNodeSpaceAR(wStart);
            const wEnd = v3(positions[i + 1]);
            const end = transform.convertToNodeSpaceAR(wEnd);

            const angle = this.calculateAngle(start, end);
            const width = Vec3.distance(start, end);
            if (lastNode !== undefined && Math.abs(lastNode.angle - angle) < 2) {
                const lastNodeTransform = ComponentUtils.getTransform(lastNode);
                ComponentUtils.setNodeTransform(lastNode, { width: lastNodeTransform.width + width });
                lastNode.angle = angle;
                continue;
            }

            let node = this.subLines[i];
            if (!node) {
                node = this.createSubLine();
                this.subLines[i] = node;
            }
            lastNode = node;

            node.angle = angle;
            node.position = v3(start);
            ComponentUtils.setNodeTransform(node, { width });
        }
    }

    createSubLine(): Node {
        const node = instantiate(this.linePrefab);
        const transform = ComponentUtils.getTransform(node);
        transform.anchorX = 0;
        transform.anchorY = 0.5;
        this.node.addChild(node);

        const mask = new Node();
        const maskTransform = ComponentUtils.getTransform(mask);
        maskTransform.anchorX = 0;
        mask.name = "mask";
        const widget = mask.addComponent(Widget);
        widget.isAlignLeft = true;
        widget.left = 0;
        widget.isAlignRight = true;
        widget.right = 0;
        maskTransform.height = 100;
        node.addChild(mask);
        return node;
    }

    calculateAngle(start: Vec3, end: Vec3): number {
        const dy = end.y - start.y;
        const dx = end.x - start.x;
        if (dx === 0) {
            return dy > 0 ? 90 : -90;
        }

        const rad = Math.atan(dy / dx);
        return misc.radiansToDegrees(rad);
    }
}
