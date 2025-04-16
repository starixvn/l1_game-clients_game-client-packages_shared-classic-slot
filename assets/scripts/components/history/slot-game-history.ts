// import { _decorator, Node, Prefab } from "cc";
// import CommonDialog from "../../common/_base/view-models/CommonDialog";
// import SocketIOGameHistoryBase from "../_base/view-models/SocketIOGameHistoryBase";
// import SlotGameHistoryItem from "./SlotGameHistoryItem";
// import SlotGameTicketDetail from "./SlotGameTicketDetail";
// const { ccclass, property } = _decorator;

// @ccclass
// export default class SlotGameHistory extends SocketIOGameHistoryBase {
//     @property(Prefab)
//     ticketDetailPrefab: Prefab = null;

//     isSlotGame = true;

//     onLoad() {
//         this.pagination.init(this);
//         const commonDialog = this.mainFrame.getComponent(CommonDialog);
//         commonDialog.addOnDidHide(() => {
//             this.node.destroy();
//         });
//     }

//     initTicketDetail(): Node {
//         const node = instantiate(this.ticketDetailPrefab);
//         this.node.addChild(node);
//         return node;
//     }

//     showTicketDetail(data: any) {
//         const node = this.initTicketDetail();
//         const slotGameTicketDetail = node.getComponent(SlotGameTicketDetail);
//         slotGameTicketDetail.setData(data);
//     }

//     bindItemRowData(betLog, index) {
//         const itemNode = instantiate(this.itemPrefab);
//         const item = itemNode.getComponent(SlotGameHistoryItem);
//         item.setData(betLog, index, this.gameId);
//         item.showTicketDetail = (log) => {
//             this.showTicketDetail(log);
//         };
//         this.content.addChild(itemNode);
//     }
// }
