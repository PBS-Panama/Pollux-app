import React from 'react';
import { useTranslation } from 'react-i18next';
import { Option, Section } from '../components';
import styles from './Info.less';

const VERSION_ROWS = [
    { labelKey: 'SETTINGS_APP_VERSION', value: process.env.VERSION },
    { labelKey: 'SETTINGS_BUILD_VERSION', value: process.env.COMMIT_HASH },
];

const Info = () => {
    const { t } = useTranslation();

    return (
        <Section className={styles['info']}>
            {VERSION_ROWS.map(({ labelKey, value }) => (
                <Option key={labelKey} label={t(labelKey)}>
                    <div className={styles['label']}>{value}</div>
                </Option>
            ))}
        </Section>
    );
};

export default Info;
