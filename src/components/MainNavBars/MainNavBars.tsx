// Copyright (C) 2017-2023 Smart code 203358507

import React, { memo } from 'react';
import classnames from 'classnames';
import { VerticalNavBar, HorizontalNavBar } from 'leto/components/NavBar';
import styles from './MainNavBars.less';

// Leto Crewing Module: role-aware navigation tabs
const SEAFARER_TABS = [
    { id: 'companyDashboard', label: 'Dashboard', icon: 'crew-dashboard', href: '#/company-dashboard' },
    { id: 'companyCrewdb', label: 'Crew Database', icon: 'crew-person', href: '#/company-crewdb' },
    { id: 'myfiles', label: 'My Files', icon: 'crew-folder', href: '#/myfiles' },
    { id: 'calendar', label: 'Mi Calendario', icon: 'crew-anchor', href: '#/calendar' },
    { id: 'dashboard', label: 'My Schedule', icon: 'crew-ship', href: '#/dashboard' },
    { id: 'myexams', label: 'My Exams', icon: 'crew-exam', href: '#/myexams' },
    { id: 'myprofile', label: 'My Profile', icon: 'crew-person', href: '#/my-profile' },
    { id: 'settings', label: 'Settings', icon: 'crew-settings', href: '#/settings' },
];

const COMPANY_TABS = [
    { id: 'companyDashboard', label: 'Dashboard', icon: 'crew-dashboard', href: '#/company-dashboard' },
    { id: 'companyCrewdb', label: 'Crew Database', icon: 'crew-person', href: '#/company-crewdb' },
    { id: 'companyCalendar', label: 'Calendario', icon: 'crew-calendar', href: '#/company-calendar' },
    { id: 'myprofile', label: 'Mi Flota', icon: 'crew-ship', href: '#/my-profile' },
    { id: 'settings', label: 'Settings', icon: 'crew-settings', href: '#/settings' },
];

const getUserRole = (): string => {
    try {
        const data = localStorage.getItem('leto-user');
        if (data) return JSON.parse(data).role || 'seafarer';
    } catch { /* silent */ }
    return 'seafarer';
};

type Props = {
    className: string,
    route?: string,
    query?: string,
    children?: React.ReactNode,
};

const MainNavBars = memo(({ className, route, query, children }: Props) => {
    const role = getUserRole();
    const tabs = role === 'company' ? COMPANY_TABS : SEAFARER_TABS;

    return (
        <div className={classnames(className, styles['main-nav-bars-container'])}>
            <HorizontalNavBar
                className={styles['horizontal-nav-bar']}
                route={route}
                query={query}
                backButton={false}
                searchBar={true}
                fullscreenButton={true}
                navMenu={true}
            />
            <VerticalNavBar
                className={styles['vertical-nav-bar']}
                selected={route}
                tabs={tabs}
            />
            <div className={styles['nav-content-container']}>{children}</div>
        </div>
    );
});

export default MainNavBars;

