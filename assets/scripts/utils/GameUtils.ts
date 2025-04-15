import { Node } from "cc";

class GameUtils {
    /**
     * Tạo một delay promise
     * @param seconds Thời gian delay tính bằng giây
     * @returns Promise
     */
    public static delayTime(seconds: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, seconds * 1000);
        });
    }

    /**
     * Di chuyển một node sang parent node khác
     * @param node Node cần di chuyển
     * @param targetParent Node cha mới
     */
    public static moveToOtherNode(node: Node, targetParent: Node): void {
        if (!node || !targetParent) return;

        const worldPos = node.worldPosition;
        node.parent = targetParent;
        node.worldPosition = worldPos;
    }
}

export default GameUtils;
