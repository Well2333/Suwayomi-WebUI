/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import Stack from '@mui/material/Stack';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { makeToast } from '@/modules/core/utils/Toast.ts';
import {
    ExtensionAction,
    ExtensionState,
    InstalledState,
    InstalledStates,
    TExtension,
} from '@/modules/extension/Extensions.types.ts';
import {
    EXTENSION_ACTION_TO_FAILURE_TRANSLATION_KEY_MAP,
    EXTENSION_ACTION_TO_NEXT_ACTION_MAP,
    EXTENSION_ACTION_TO_STATE_MAP,
    INSTALLED_STATE_TO_TRANSLATION_KEY_MAP,
} from '@/modules/extension/Extensions.constants.ts';
import { getInstalledState } from '@/modules/extension/Extensions.utils.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { CustomTooltip } from '@/modules/core/components/CustomTooltip';
import { ListCardAvatar } from '@/modules/core/components/lists/cards/ListCardAvatar.tsx';
import { ListCardContent } from '@/modules/core/components/lists/cards/ListCardContent.tsx';

interface IProps {
    extension: TExtension;
    handleUpdate: () => void;
    showSourceRepo: boolean;
    forcedState?: ExtensionState;
    showOptions: () => void;
}

export function ExtensionCard(props: IProps) {
    const { t } = useTranslation();

    const {
        extension: { name, lang, versionName, isInstalled, hasUpdate, isObsolete, pkgName, iconUrl, isNsfw, repo },
        handleUpdate,
        showOptions,
        showSourceRepo,
        forcedState,
    } = props;
    const [localInstalledState, setInstalledState] = useState<InstalledStates>(
        getInstalledState(isInstalled, isObsolete, hasUpdate),
    );
    const installedState = forcedState ?? localInstalledState;

    useEffect(() => {
        setInstalledState(getInstalledState(isInstalled, isObsolete, hasUpdate));
    }, [getInstalledState(isInstalled, isObsolete, hasUpdate)]);

    const langPress = lang === 'all' ? t('extension.language.all') : lang.toUpperCase();

    const requestExtensionAction = async (action: ExtensionAction): Promise<void> => {
        const nextAction = EXTENSION_ACTION_TO_NEXT_ACTION_MAP[action];
        const state = EXTENSION_ACTION_TO_STATE_MAP[action];

        try {
            setInstalledState(state);
            switch (action) {
                case ExtensionAction.INSTALL:
                    await requestManager.updateExtension(pkgName, { install: true, isObsolete }).response;
                    break;
                case ExtensionAction.UNINSTALL:
                    await requestManager.updateExtension(pkgName, { uninstall: true, isObsolete }).response;
                    break;
                case ExtensionAction.UPDATE:
                    await requestManager.updateExtension(pkgName, { update: true, isObsolete }).response;
                    break;
                default:
                    throw new Error(`Unexpected ExtensionAction "${action}"`);
            }
            setInstalledState(nextAction);

            handleUpdate();
        } catch (e) {
            setInstalledState(getInstalledState(isInstalled, isObsolete, hasUpdate));
            makeToast(
                t(EXTENSION_ACTION_TO_FAILURE_TRANSLATION_KEY_MAP[action], { count: 1 }),
                'error',
                getErrorMessage(e),
            );
        }
    };

    function handleButtonClick() {
        switch (installedState) {
            case ExtensionAction.INSTALL:
            case ExtensionAction.UPDATE:
            case ExtensionAction.UNINSTALL:
                requestExtensionAction(installedState).catch(
                    defaultPromiseErrorHandler(`ExtensionCard:handleButtonClick(${installedState})`),
                );
                break;
            case ExtensionState.OBSOLETE:
                requestExtensionAction(ExtensionAction.UNINSTALL).catch(
                    defaultPromiseErrorHandler(`ExtensionCard:handleButtonClick(${installedState})`),
                );
                break;
            default:
                break;
        }
    }

    return (
        <Card>
            <ListCardContent>
                <ListCardAvatar iconUrl={requestManager.getValidImgUrlFor(iconUrl)} alt={name} />
                <Stack
                    sx={{
                        justifyContent: 'center',
                        flexGrow: 1,
                        flexShrink: 1,
                        wordBreak: 'break-word',
                    }}
                >
                    <Typography variant="h6" component="h3">
                        {name}
                    </Typography>
                    <Typography variant="caption">
                        {langPress} {versionName}
                        {isNsfw && (
                            <Typography variant="caption" color="error">
                                {' 18+'}
                            </Typography>
                        )}
                    </Typography>
                    {showSourceRepo && <Typography variant="caption">{repo}</Typography>}
                </Stack>
                {isInstalled && (
                    <CustomTooltip title={t('settings.title')}>
                        <IconButton onClick={showOptions} color="inherit">
                            <SettingsIcon />
                        </IconButton>
                    </CustomTooltip>
                )}
                <Button
                    variant="outlined"
                    sx={{
                        color: installedState === InstalledState.OBSOLETE ? 'red' : 'inherit',
                        flexShrink: 0,
                    }}
                    onClick={() => handleButtonClick()}
                >
                    {t(INSTALLED_STATE_TO_TRANSLATION_KEY_MAP[installedState])}
                </Button>
            </ListCardContent>
        </Card>
    );
}
