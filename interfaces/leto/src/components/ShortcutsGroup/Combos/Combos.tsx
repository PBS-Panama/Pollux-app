import React from 'react';
import { useTranslation } from 'react-i18next';
import Keys from './Keys';
import withTrailingSeparator from './withTrailingSeparator';
import styles from './Combos.less';

type Props = {
    combos: string[][],
};

const Combos = ({ combos }: Props) => {
    const { t } = useTranslation();

    return (
        <div className={styles['combo-list']}>
            {withTrailingSeparator(
                combos,
                (keys, index, separator) => (
                    <div className={styles['combo-entry']} key={index}>
                        <Keys keys={keys} />
                        {separator}
                    </div>
                ),
                () => <div className={styles['combo-separator']}>{t('SETTINGS_SHORTCUT_OR')}</div>,
            )}
        </div>
    );
};

export default Combos;
