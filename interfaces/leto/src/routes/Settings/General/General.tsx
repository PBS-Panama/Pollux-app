import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Section, Link } from '../components';
import User from './User';

// PBS Crewing Module: this whole tab was unmodified Stremio boilerplate —
// Trakt integration, a link to Stremio's own GitHub source, Stremio's
// zendesk support/account-deletion articles, strem.io calendar-subscribe
// and password-reset, and Terms/Privacy pointing at stremio.com. All of it
// gated on `profile.auth` (Stremio's own account system, always null in
// this fork) except the always-shown Support/Source/Terms/Privacy links,
// which had nothing to do with Pollux. Removed; only Help & Feedback stays,
// pointed at PBS's real contact address (same fix as NavMenuContent.js).
const General = forwardRef<HTMLDivElement, {}>((_props, ref) => {
    const { t } = useTranslation();

    return <>
        <Section ref={ref}>
            <User />
        </Section>

        <Section>
            <Link
                label={t('SETTINGS_SUPPORT')}
                href={'mailto:commercialaffairs@pbtradingsolutions.com'}
            />
        </Section>
    </>;
});

export default General;
