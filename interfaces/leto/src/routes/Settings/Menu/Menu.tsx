import React from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button } from 'pollux/components';
import { SECTIONS } from '../constants';
import styles from './Menu.less';

type Props = {
    selected: string,
    onSelect: (event: React.MouseEvent<HTMLDivElement>) => void,
};

const MENU_ITEMS = [
    { section: SECTIONS.GENERAL, labelKey: 'SETTINGS_NAV_GENERAL' },
    { section: SECTIONS.INTERFACE, labelKey: 'INTERFACE' },
    { section: SECTIONS.SHORTCUTS, labelKey: 'SETTINGS_NAV_SHORTCUTS' },
];

const Menu = ({ selected, onSelect }: Props) => {
    const { t } = useTranslation();

    return (
        <div className={styles['menu']}>
            {MENU_ITEMS.map(({ section, labelKey }) => (
                <Button
                    key={section}
                    className={classNames(styles['button'], { [styles['selected']]: selected === section })}
                    title={t(labelKey)}
                    data-section={section}
                    onClick={onSelect}
                >
                    {t(labelKey)}
                </Button>
            ))}

            <div className={styles['spacing']} />
            <div className={styles['version-info-label']} title={process.env.VERSION}>
                {t('SETTINGS_APP_VERSION')}: {process.env.VERSION}
            </div>
            <div className={styles['version-info-label']} title={process.env.COMMIT_HASH}>
                {t('SETTINGS_BUILD_VERSION')}: {process.env.COMMIT_HASH}
            </div>
        </div>
    );
};

export default Menu;
