// Copyright (C) 2017-2023 Smart code 203358507
// Company-only build — role is locked to 'company'. Seafarer tabs removed.
// R14: segunda pasada — la configuración fija del topbar pasó a un objeto
// spreadeado en vez de listar cada prop literal en el JSX.

import React, { memo, useCallback, useState } from 'react';
import classnames from 'classnames';
import { VerticalNavBar, HorizontalNavBar } from 'pollux/components/NavBar';
import styles from './MainNavBars.less';

// Iconoir classes (Reference/Frontend-UI, Mannat admin-dashboard skin) —
// closest match per tab; 'anchor'/'ship' have no Iconoir equivalent (generic
// UI icon set), so those stay as the hand-drawn CREW_ICONS SVGs in
// NavTabButton for any future tab that needs them.
const COMPANY_TABS = [
    { id: 'companyDashboard', label: 'Dashboard',     icon: 'iconoir-report-columns', href: '#/company-dashboard' },
    { id: 'companyCrewdb',    label: 'Crew Database', icon: 'iconoir-group',          href: '#/company-crewdb' },
    // 'crew-ship' is a hand-drawn CREW_ICONS SVG (NavTabButton.js) — Iconoir has no ship/anchor icon.
    { id: 'myFleet',          label: 'Mi Flota',      icon: 'crew-ship',              href: '#/my-fleet' },
    { id: 'companyCalendar',  label: 'Calendar',      icon: 'iconoir-calendar',       href: '#/company-calendar' },
    { id: 'myfiles',          label: 'My Files',      icon: 'iconoir-folder',         href: '#/myfiles' },
    { id: 'settings',         label: 'Settings',      icon: 'iconoir-settings',       href: '#/settings' },
];

// La única pantalla company-only siempre pide lo mismo del topbar (sin
// botón atrás, con fullscreen/campana/menú de perfil) — se declara una sola
// vez acá en vez de repetirlo como props literales en el JSX de abajo.
const TOPBAR_CONFIG = {
    backButton: false,
    fullscreenButton: true,
    notificationBell: true,
    navMenu: true,
};

const SIDEBAR_COLLAPSED_KEY = 'pbs-sidebar-collapsed';

const useSidebarCollapsed = () => {
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
        } catch {
            return false;
        }
    });

    const toggle = useCallback(() => {
        setCollapsed((wasCollapsed) => {
            const nextCollapsed = !wasCollapsed;
            try {
                localStorage.setItem(SIDEBAR_COLLAPSED_KEY, nextCollapsed ? '1' : '0');
            } catch {
                // el estado simplemente no persiste entre recargas
            }
            return nextCollapsed;
        });
    }, []);

    return [collapsed, toggle] as const;
};

type Props = {
    className: string,
    route?: string,
    children?: React.ReactNode,
};

const MainNavBars = memo(({ className, route, children }: Props) => {
    const [collapsed, toggleCollapsed] = useSidebarCollapsed();

    return (
        <div className={classnames(className, styles['main-nav-bars-container'], { [styles['collapsed']]: collapsed })}>
            <VerticalNavBar
                className={styles['vertical-nav-bar']}
                selected={route}
                tabs={COMPANY_TABS}
                collapsed={collapsed}
            />
            <HorizontalNavBar
                {...TOPBAR_CONFIG}
                className={styles['horizontal-nav-bar']}
                sidebarCollapsed={collapsed}
                onToggleSidebar={toggleCollapsed}
            />
            <div className={styles['nav-content-container']}>{children}</div>
        </div>
    );
});

export default MainNavBars;
