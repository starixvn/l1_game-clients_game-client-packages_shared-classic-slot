import { _decorator, instantiate, Node, Prefab, ToggleContainer } from "cc";
import RawPagination from "db://shared-components/game/pagination/scripts/components/raw-pagination";
import { Dialog } from "db://shared-components/shared/common-components/dialogs/dialog";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import Observer from "observer";
import { TopWinnersHandler } from "../../handlers/handlers/top-winners-handlers";
import { TopWinnersStore, TopWinnerType, WinnersData } from "../../handlers/stores/top-winners-store";
import SlotGameTopWinnerItem from "./slot-game-top-winner-item";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;
@ccclass
export default class SlotGameTopWinner extends ObserverComponent {
    @property(Dialog)
    dialog: Dialog = null;

    @property(ToggleContainer)
    toggleContainer: ToggleContainer = null;

    @property(RawPagination)
    pagination: RawPagination = null;

    @property(Prefab)
    itemPrefab: Prefab = null;

    @property(Node)
    content: Node = null;

    onLoad() {
        this.dialog.onHideComplete = () => {
            this.node.destroy();
        };
        this.pagination.onPageChanged = (page) => {
            this.onPageChanged(page);
        };
        super.onLoad();
        this.onPageChanged(1);
    }

    @render(TopWinnersStore, (store) => store.type)
    renderType(type: TopWinnerType) {
        const toggle = this.toggleContainer.toggleItems.find((toggle) => toggle.name === type);
        if (toggle) {
            toggle.isChecked = true;
        }
    }

    @render(TopWinnersStore, (store) => store.data)
    renderData(data: WinnersData) {
        if (!data) {
            return;
        }
        this.pagination.setData(data);
        const { winners } = data;

        this.content.destroyAllChildren();
        winners.map((winner, index) => {
            const node = instantiate(this.itemPrefab);

            this.content.addChild(node);
            node.getComponent(SlotGameTopWinnerItem).setData(winner, index);
        });
    }

    @handle(TopWinnersHandler, (handler, page: number) => handler.getData(page))
    onPageChanged(page: number) {
        return page;
    }

    @handle(TopWinnersHandler, (handler) => handler.swapType())
    onToggleChanged() {}
}
