import { _decorator } from "cc";
import { InGameMenuStore } from "db://shared-components/game/in-game-menu/scripts/stores/in-game-menu-store";
import { LazyloadNodeContainer } from "db://shared-components/shared/common-components/node-container/lazyload-node-container";
import Observer from "observer";
import { InGameMenuEvents } from "../../definitions";
const { ccclass, property } = _decorator;
const { render, handle } = Observer;
@ccclass
export default class SlotGameTopWinnerContainer extends LazyloadNodeContainer {
    @render(InGameMenuStore, (store) => store.event, { fireImmediately: false })
    openTopWinner({ event }: { event: InGameMenuEvents }) {
        if (event === InGameMenuEvents.OPEN_TOP_WINNER) {
            this.createNodeAsync();
        }
    }
}
