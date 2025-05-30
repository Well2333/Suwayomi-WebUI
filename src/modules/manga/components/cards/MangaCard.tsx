/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import PopupState, { bindMenu } from 'material-ui-popup-state';
import { memo, useCallback, useMemo, useState } from 'react';
import { useLongPress } from 'use-long-press';
import { MangaActionMenuItems, SingleModeProps } from '@/modules/manga/components/MangaActionMenuItems.tsx';
import { Menu } from '@/modules/core/components/menu/Menu.tsx';
import { MigrateDialog } from '@/modules/migration/components/MigrateDialog.tsx';
import { useManageMangaLibraryState } from '@/modules/manga/hooks/useManageMangaLibraryState.tsx';
import { MangaGridCard } from '@/modules/manga/components/cards/MangaGridCard.tsx';
import { MangaListCard } from '@/modules/manga/components/cards/MangaListCard.tsx';
import { MangaCardMode, MangaCardProps } from '@/modules/manga/Manga.types.ts';
import { ContinueReadingButton } from '@/modules/manga/components/ContinueReadingButton.tsx';
import { MangaBadges } from '@/modules/manga/components/MangaBadges.tsx';
import { GridLayout } from '@/modules/core/Core.types.ts';
import { AppRoutes } from '@/modules/core/AppRoute.constants.ts';
import { useMetadataServerSettings } from '@/modules/settings/services/ServerSettingsMetadata.ts';

const getMangaLinkTo = (
    mode: MangaCardMode,
    mangaId: number,
    sourceId: string | undefined,
    mangaTitle: string,
): string => {
    switch (mode) {
        case 'default':
        case 'source':
        case 'duplicate':
            return AppRoutes.manga.path(mangaId);
        case 'migrate.search':
            return `${AppRoutes.migrate.childRoutes.search.path(sourceId ?? '-1', mangaId)}?query=${mangaTitle}`;
        case 'migrate.select':
            return '';
        default:
            throw new Error(`getMangaLinkTo: unexpected MangaCardMode "${mode}"`);
    }
};

export const MangaCard = memo((props: MangaCardProps) => {
    const { manga, gridLayout, inLibraryIndicator, selected, handleSelection, mode = 'default' } = props;
    const { id, firstUnreadChapter, downloadCount, unreadCount } = manga;
    const {
        settings: { showContinueReadingButton },
    } = useMetadataServerSettings();

    const { CategorySelectComponent, updateLibraryState, isInLibrary } = useManageMangaLibraryState(
        manga,
        mode === 'source',
    );

    const mangaLinkTo = getMangaLinkTo(mode, manga.id, manga.sourceId, manga.title);

    const [isMigrateDialogOpen, setIsMigrateDialogOpen] = useState(false);

    const handleClick = useCallback(
        (event: React.MouseEvent | React.TouchEvent, openMenu?: () => void) => {
            const isDefaultMode = mode === 'default';
            const isSourceMode = mode === 'source';
            const isMigrateSelectMode = mode === 'migrate.select';
            const isSelectionMode = selected !== null;
            const isLongPress = !!openMenu;

            const shouldHandleClick =
                isMigrateSelectMode || isSelectionMode || ((isDefaultMode || isSourceMode) && isLongPress);
            if (!shouldHandleClick) {
                return;
            }

            event.preventDefault();

            if (isSourceMode) {
                updateLibraryState();
                return;
            }

            if (isSelectionMode) {
                handleSelection?.(id, !selected, { selectRange: event.shiftKey });
                return;
            }

            if (isDefaultMode) {
                openMenu?.();
                return;
            }

            if (isMigrateSelectMode) {
                setIsMigrateDialogOpen(true);
            }
        },
        [mode, selected, updateLibraryState, handleSelection],
    );

    const longPressBind = useLongPress(
        useCallback(
            (e: any, { context }: any) => {
                e.shiftKey = true;
                handleClick(e, context as () => {});
            },
            [handleClick],
        ),
    );

    const MangaCardComponent = useMemo(
        () => (gridLayout === GridLayout.List ? MangaListCard : MangaGridCard),
        [gridLayout],
    );

    return (
        <>
            {isMigrateDialogOpen && (
                <MigrateDialog mangaIdToMigrateTo={manga.id} onClose={() => setIsMigrateDialogOpen(false)} />
            )}
            <PopupState variant="popover" popupId="manga-card-action-menu">
                {(popupState) => (
                    <>
                        <MangaCardComponent
                            {...props}
                            longPressBind={longPressBind}
                            popupState={popupState}
                            handleClick={handleClick}
                            mangaLinkTo={mangaLinkTo}
                            isInLibrary={isInLibrary}
                            inLibraryIndicator={inLibraryIndicator}
                            continueReadingButton={
                                <ContinueReadingButton
                                    showContinueReadingButton={showContinueReadingButton && mode === 'default'}
                                    chapter={firstUnreadChapter}
                                    mangaLinkTo={mangaLinkTo}
                                />
                            }
                            mangaBadges={
                                <MangaBadges
                                    inLibraryIndicator={inLibraryIndicator}
                                    isInLibrary={isInLibrary}
                                    unread={unreadCount}
                                    downloadCount={downloadCount}
                                    updateLibraryState={updateLibraryState}
                                    mode={mode}
                                />
                            }
                        />
                        {!!handleSelection && popupState.isOpen && (
                            <Menu {...bindMenu(popupState)}>
                                {(onClose, setHideMenu) => (
                                    <MangaActionMenuItems
                                        manga={manga as SingleModeProps['manga']}
                                        handleSelection={handleSelection}
                                        onClose={onClose}
                                        setHideMenu={setHideMenu}
                                    />
                                )}
                            </Menu>
                        )}
                        {CategorySelectComponent}
                    </>
                )}
            </PopupState>
        </>
    );
});
