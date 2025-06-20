import { Asset, EventTarget, sp, SpriteAtlas, tween } from "cc";
import { bundleManager } from "db://shared-components/shared/common-components/bundle-manager/bundle-manager";
import { AppUtils } from "db://shared-components/shared/utils";
import { SlotGameBaseConfigs } from "../config/slot-game-base-configs";
import { SpecialSymbol } from "../definitions";

export interface ColorJson {
    bottomAreaTextColor: string;
    bottomAreaNumberColor: string;
    bottomAreaButtonBorderColor: string;
    bottomAreaWinAmountColor: string;
    previewOddsBorderColor: string;
    previewOddsSymbolNumberColor: string;
    previewOddsWinValueColor: string;
    noticeTextColor: string;
    noticeHighlightTextColor: string;
    bonusCountItemTextColor: string;
}

interface ResourceCaches {
    slotSymbols?: any;
    slotWinningAnimation?: any;
    gameAtlas?: SpriteAtlas;
    sharedSlotAtlas?: SpriteAtlas;
    colorJson?: ColorJson;
}
export const resourceCaches: ResourceCaches = {};

export const globalEmitter = new EventTarget();

let slotGameConfigs: SlotGameBaseConfigs;

export const getSlotGameConfigs = () => {
    return slotGameConfigs;
};

export const setSlotGameConfigs = (configs: SlotGameBaseConfigs) => {
    slotGameConfigs = configs;
};

export const CLASSIC_SLOT_BUNDLE = "classic-slot-bundle";

export const loadSharedClassicSlotAsset = <T extends Asset>(path: string, type: any) => {
    if (bundleManager.cachedAssets[path]) {
        return bundleManager.cachedAssets[path];
    }
    return bundleManager.loadAssetsFromBundle<T>(CLASSIC_SLOT_BUNDLE, path, type, null, true);
};

export enum InternalEvents {
    LOAD_OTHER_ICONS_AND_BANNERS = "lobby= load other icons and banners",
    OPEN_GAME_MINI = "lobby= open game mini",
    CLICK_LINE_SELECTION_BUTTON = "slot= click on the line selection button",
    CLICK_AUTO_SPIN_BUTTON = "slot= click on the auto spin button",
    CLICK_SPIN_BUTTON = "slot= click on the spin button",
    CLICK_HAMBURGER_MENU = "slot= click on the hamburger menu",
    CLICK_OUTSIDE_REEL_AREA = "slot= click outside reeel area",
    SLOT_PLAY_SOUND = "play sound slot",
    CASCADING_SLOT_PLAY_SOUND = "play sound cascading slot",
    CASCADING_CLICK_CHANGE_MODE = "cascading change mode play",
    CASCADING_CLOSE_MENU = "cascading collapse menu",
    CASCADING_CLICK_TOTAL_BET = "cascading click total bet",

    NOT_PERMITTED_TO_PLAY = "NOT_PERMITTED_TO_PLAY",
    USER_STAKE_LEVEL_UPDATED = "USER_STAKE_LEVEL_UPDATED",
    SSO_FAILED = "SSO_FAILED",
    SSO_ERROR = "SSO_ERROR",
    GAME_IS_UM = "GAME_IS_UM",
    MINI_PANEL_GAME_UM = "mini_panel_game_um",
    MINI_PANEL_GAME_CONNECT_FAILED = "mini_panel_game_connect_failed",
    MINI_PANEL_OPEN_TABLE_GAME = "mini_panel_open_table_game",
    MINI_PANEL_OPEN_MINI_GAME = "mini_panel_open_mini_game",
    SIGN_OUT = "sign-out",
    LOADING_GAME = "loading-game",
    NOTICE = "notice-popup",

    RECEIVED_JACKPOT_WINNER = "Received jackpot winner data",
    RECEIVED_JACKPOT_WINNERS = "Received jackpot top winners data",
    RECEIVED_RAW_JACKPOT_POOLS = "Received raw jackpot pools data",
    RECEIVED_JACKPOT_POOLS = "Received jackpot pools data and filter pool type",
    RECEIVED_JACKPOT_POOLS_ON_GAME = "Received jackpot pools data on game",
    RECEIVED_JACKPOT_POOLS_IN_GAME = "Received jackpot pools data in game",
    HIDE_JACKPOT_POOLS_ON_GAME = "hide jackpot pools on game",

    CHANGE_CATEGORY = "change category",
    SCROLL_NESTED_SCROLLVIEW = "scroll in nested scrollview",

    MICROSITE_BACK_TO_LOBBY = "MICROSITE_BACK_TO_LOBBY",
    LOST_CONNECTION = "lost-connection",
    MICROSITE_OPEN_GAME_BACK_FROM_LOBBY = "MICROSITE_OPEN_GAME_BACK_FROM_LOBBY",

    RECEIVED_ROUND_TIMER = "received round timer",
    HIDE_POPUP_MINI_GAMES = "hide popup mini game",
    SHOW_POPUP_MINI_GAMES = "show popup mini game",
    HANDLE_ON_SIGN_IN = "HANDLE_ON_SIGN_IN",
    GATEWAY_OPEN_GAME = "GATEWAY_OPEN_GAME",
    OPEN_GAME = "OPEN_GAME",
    CENTER_BANNER_SHOW = "CENTER_BANNER_SHOW",
    AFTER_LUCKY_WHEEL = "AFTER_LUCKY_WHEEL",
    NOT_EXIST_MINI_GAMES = "NOT_EXIST_MINI_GAMES",
    CLOSE_GAME = "CLOSE_GAME",
}

export const formatNamePool = (name: string) => {
    return name[0].toUpperCase() + name.slice(1);
};

export const loadSlotSymbols = async (jackpotEnabled: boolean) => {
    const prefabCache = resourceCaches.slotSymbols || {};
    for (let index = 0; index < slotGameConfigs.itemTypeCount; index++) {
        if (prefabCache[index]) {
            continue;
        }
        const symbolInfo = {};
        symbolInfo["symbol"] = await addSymbolCache(index, jackpotEnabled);
        symbolInfo["isJackpot"] = jackpotEnabled && index === slotGameConfigs.jackpotSymbolIndex;
        prefabCache[index] = symbolInfo;
    }
    resourceCaches.slotSymbols = prefabCache;
};

const addSymbolCache = (index: number, jackpotEnabled: boolean) => {
    const path = getSymbolName(index, jackpotEnabled);
    return bundleManager.loadResourcesAsset<sp.SkeletonData>(path, sp.SkeletonData);
};

const getSymbolName = (index: number, jackpotEnabled: boolean) => {
    if (index === SpecialSymbol.JACKPOT && jackpotEnabled) {
        const locale = AppUtils.getLocale();
        const language = locale === "vi-VN" ? `.${locale}` : "";
        return `spines/symbols/symbol-${index}.jackpot${language}`;
    }
    return `spines/symbols/symbol-${index}`;
};

export const loadWinningSymbolAnimation = async () => {
    const prefabCache = resourceCaches.slotWinningAnimation || {};

    if (prefabCache !== null) {
        const path = `spines/symbols/winning-animation`;
        const data = await bundleManager.loadResourcesAsset<sp.SkeletonData>(path, sp.SkeletonData);
        resourceCaches.slotWinningAnimation = data;
    }
};

export const initTimer = (timer: { setTime: (value: number) => void }, duration: number, hideTimer: () => void) => {
    let count = 0;
    return tween({})
        .repeat(
            duration,
            tween()
                .call(() => {
                    timer.setTime(duration - count);
                    count++;
                })
                .delay(1)
        )
        .call(() => {
            hideTimer();
        })
        .start();
};

export const floatToNumber = (data: { from: number; to: number; duration: number; progress: (value: number) => void }) => {
    const { from, to, duration, progress } = data;
    return tween({ value: from })
        .to(
            duration,
            { value: to },
            {
                onUpdate: (target) => {
                    progress(target.value);
                },
            }
        )
        .call(() => {
            progress(to);
        })
        .start();
};

export const getSpriteLine = (line: number) => {
    return resourceCaches.sharedSlotAtlas.getSpriteFrame(`line-selection-${line + 1}`);
};
