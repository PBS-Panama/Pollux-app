import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Section } from '../components';
import User from './User';

type Props = {
    profile: Profile,
};

const General = forwardRef<HTMLDivElement, Props>(({ profile }: Props, ref) => {
    const { t } = useTranslation();

    return <>
        <Section ref={ref}>
            <User profile={profile} />
        </Section>
    </>;
});

export default General;
