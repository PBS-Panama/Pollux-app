import React from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button } from 'leto/components';
import { SECTIONS } from '../constants';
import styles from './Menu.less';

type Props = {
    selected: string,
    onSelect: (event: React.MouseEvent<HTMLDivElement>) => void,
};

const Menu = ({ selected, onSelect }: Props) => {
    const { t } = useTranslation();

    return (
        <div className={styles['menu']}>
            <Button className={classNames(styles['button'], { [styles['selected']]: selected === SECTIONS.GENERAL })} title={t('SETTINGS_NAV_GENERAL') || 'Profile'} data-section={SECTIONS.GENERAL} onClick={onSelect}>
                { t('SETTINGS_NAV_GENERAL') || 'Profile' }
            </Button>
            <Button className={classNames(styles['button'], { [styles['selected']]: selected === SECTIONS.INTERFACE })} title={t('INTERFACE') || 'Preferences'} data-section={SECTIONS.INTERFACE} onClick={onSelect}>
                { t('INTERFACE') || 'Preferences' }
            </Button>

            <div className={styles['spacing']} />
            <div className={styles['version-info-label']} title={process.env.VERSION}>
                {t('SETTINGS_APP_VERSION') || 'Version'}: {process.env.VERSION}
            </div>
            <div className={styles['version-info-label']} title={process.env.COMMIT_HASH}>
                {t('SETTINGS_BUILD_VERSION') || 'Build'}: {process.env.COMMIT_HASH}
            </div>
        </div>
    );
};

export default Menu;
