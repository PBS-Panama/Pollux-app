import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import withTrailingSeparator from '../withTrailingSeparator';
import styles from './Keys.less';

type Props = {
    keys: string[],
};

const KEY_LABELS: Record<string, (t: (key: string) => string) => string> = {
    'Shift': (t) => `⇧ ${t('SETTINGS_SHORTCUT_SHIFT')}`,
    'Space': (t) => t('SETTINGS_SHORTCUT_SPACE'),
    'Ctrl': (t) => t('SETTINGS_SHORTCUT_CTRL'),
    'Escape': (t) => t('SETTINGS_SHORTCUT_ESC'),
    'ArrowUp': () => '↑',
    'ArrowDown': () => '↓',
    'ArrowLeft': () => '←',
    'ArrowRight': () => '→',
};

const labelForKey = (key: string, t: (key: string) => string) => (KEY_LABELS[key]?.(t) ?? key.toUpperCase());

// Un combo de puras teclas numéricas consecutivas ("1","2",...,"6") se
// muestra colapsado como rango ("1 to 6") en vez de listar cada tecla.
const isNumericRange = (keys: string[]) => keys.length > 1 && keys.every((key) => !Number.isNaN(parseInt(key, 10)));

const Keys = ({ keys }: Props) => {
    const { t } = useTranslation();
    const displayKeys = isNumericRange(keys) ? [keys[0], keys[keys.length - 1]] : keys;
    const separatorLabel = isNumericRange(keys) ? t('SETTINGS_SHORTCUT_TO') : '+';

    return (
        <>
            {withTrailingSeparator(
                displayKeys,
                (key, index, separator) => (
                    <Fragment key={key}>
                        <kbd>{labelForKey(key, t)}</kbd>
                        {separator}
                    </Fragment>
                ),
                () => <div className={styles['key-separator']}>{separatorLabel}</div>,
            )}
        </>
    );
};

export default Keys;
