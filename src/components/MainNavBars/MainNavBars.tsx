// Copyright (C) 2017-2023 Smart code 203358507

import React, { memo } from 'react';
import classnames from 'classnames';
import { VerticalNavBar, HorizontalNavBar } from 'leto/components/NavBar';
import styles from './MainNavBars.less';

// PBS Crewing Module: STCW navigation tabs
const TABS = [
    { id: 'companyDashboard', label: 'Dashboard', icon: 'crew-dashboard', href: '#/company-dashboard' },
    { id: 'companyCrewdb', label: 'Crew Database', icon: 'crew-person', href: '#/company-crewdb' },
    { id: 'myfiles', label: 'My Files', icon: 'crew-folder', href: '#/myfiles' },
    { id: 'companyCalendar', label: 'Company', icon: 'crew-calendar', href: '#/company-calendar' },
    { id: 'calendar', label: 'Seafarer', icon: 'crew-anchor', href: '#/calendar' },
    { id: 'dashboard', label: 'My Schedule', icon: 'crew-ship', href: '#/dashboard' },
    { id: 'myexams', label: 'My Exams', icon: 'crew-exam', href: '#/myexams' },
    { id: 'settings', label: 'Settings', icon: 'crew-settings', href: '#/settings' },
];

type Props = {
    className: string,
    route?: string,
    query?: string,
    children?: React.ReactNode,
};

const MainNavBars = memo(({ className, route, query, children }: Props) => {
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
                tabs={TABS}
            />
            <div className={styles['nav-content-container']}>{children}</div>
        </div>
    );
});

export default MainNavBars;

