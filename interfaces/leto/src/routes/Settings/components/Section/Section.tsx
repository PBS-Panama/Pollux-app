import React, { forwardRef } from 'react';
import classNames from 'classnames';
import { t } from 'i18next';
import styles from './Section.less';

type Props = {
    className?: string,
    label?: string,
    children: React.ReactNode,
};

const SectionHeading = ({ label }: { label: string }) => (
    <div className={styles['section-heading']}>{t(label)}</div>
);

const Section = forwardRef<HTMLDivElement, Props>(({ className, label, children }, ref) => {
    const rootClassName = classNames(className, styles['settings-section']);
    return (
        <div ref={ref} className={rootClassName}>
            {label ? <SectionHeading label={label} /> : null}
            {children}
        </div>
    );
});

export default Section;
