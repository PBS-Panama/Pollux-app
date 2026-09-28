import React from 'react';
import { useTranslation } from 'react-i18next';
import { Option, Section } from '../components';
import styles from './Info.less';

const Info = () => {
    const { t } = useTranslation();

    return (
        <Section className={styles['info']}>
            <Option label={t('SETTINGS_APP_VERSION')}>
                <div className={styles['label']}>
                    {process.env.VERSION}
                </div>
            </Option>
            <Option label={t('SETTINGS_BUILD_VERSION')}>
                <div className={styles['label']}>
                    {process.env.COMMIT_HASH}
                </div>
            </Option>
        </Section>
    );
};

export default Info;
