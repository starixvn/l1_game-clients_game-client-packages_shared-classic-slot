import { Asset, sp, SpriteAtlas, tween } from "cc";
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

export interface GameFeatureJson {
    enablePeekEffect: boolean;
}

interface ResourceCaches {
    slotSymbols?: any;
    slotWinningAnimation?: any;
    gameAtlas?: SpriteAtlas;
    sharedSlotAtlas?: SpriteAtlas;
    colorJson?: ColorJson;
    gameFeature?: GameFeatureJson;
}

export const resourceCaches: ResourceCaches = {};

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

    if (bundleManager.cachedAssets[path]) {
        return Promise.resolve(bundleManager.cachedAssets[path]);
    }

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

        const data = bundleManager.cachedAssets[path]
            ? bundleManager.cachedAssets[path]
            : await bundleManager.loadResourcesAsset<sp.SkeletonData>(path, sp.SkeletonData);
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

export enum DialogName {
    AUTO_SPIN = "auto-spin",
    STAKE_SELECTOR = "stake-selector",
    LINE_SELECTION = "line-selection",
    PREVIEW_ODDS = "preview-odds",
    SPINNING = "spinning",
    IN_GAME_MENU = "in-game-menu",
    DUMMY_DIALOG = "dummy-dialog",
}
