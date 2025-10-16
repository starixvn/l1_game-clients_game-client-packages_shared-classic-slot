import { _decorator, Component } from "cc";
import { resourceCaches } from "db://shared-classic-slot/scripts/utils/classic-slot-utils";
import { ChangeNodeColor } from "db://shared-components/shared/common-components/change-node-color";
const { ccclass, property } = _decorator;

@ccclass
export class GroupNodeColor extends Component {
    @property
    colorKey = "";

    onLoad() {
        const colorNodes = this.node.getComponentsInChildren(ChangeNodeColor);

        const color = resourceCaches.colorJson[this.colorKey];
        colorNodes.forEach((colorNode) => {
            colorNode.updateColor(color);
        });
    }
}
