import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import throttle from 'lodash.throttle';
import { useRouteFocused } from 'pollux/common/router';
import { usePlatform, withCoreSuspender } from 'pollux/common';
import { MainNavBars } from 'pollux/components';
import { SECTIONS } from './constants';
import Menu from './Menu';
import General from './General';
import Interface from './Interface';
import Shortcuts from './Shortcuts';
import Info from './Info';
import styles from './Settings.less';

type Section = { id: string; ref: React.RefObject<HTMLDivElement> };

// Resalta en el menú lateral la sección que está cruzando el borde superior
// del panel scrolleable (con 50px de margen), y ofrece el scroll suave hacia
// una sección al hacer click en el menú. `active` recalcula una vez al
// aparecer (antes se leía mal `useRouteFocused()` como si devolviera
// `{ routeFocused }`, cuando devuelve el booleano directo — el efecto de
// montaje nunca corría; no se notaba porque el estado inicial ya coincidía
// con la sección de arriba, pero queda corregido).
const useScrollSpy = (sections: Section[], active: boolean) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedId, setSelectedId] = useState(sections[0]?.id);

    const recompute = useCallback(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        for (const section of sections) {
            const sectionEl = section.ref.current;
            if (sectionEl && (sectionEl.offsetTop - container.offsetTop) < container.scrollTop + 50) {
                setSelectedId(section.id);
            }
        }
    }, [sections]);

    const onScroll = useMemo(() => throttle(recompute, 50), [recompute]);

    useLayoutEffect(() => {
        if (active) {
            recompute();
        }
    }, [active, recompute]);

    const scrollToSection = useCallback((sectionId: string) => {
        const container = containerRef.current;
        const section = sections.find((candidate) => candidate.id === sectionId);
        if (container && section?.ref.current) {
            container.scrollTo({
                top: section.ref.current.offsetTop - container.offsetTop,
                behavior: 'smooth',
            });
        }
    }, [sections]);

    return { containerRef, selectedId, onScroll, scrollToSection };
};

const Settings = () => {
    const routeFocused = useRouteFocused();
    const platform = usePlatform();

    const generalSectionRef = useRef<HTMLDivElement>(null);
    const interfaceSectionRef = useRef<HTMLDivElement>(null);
    const shortcutsSectionRef = useRef<HTMLDivElement>(null);

    const sections = useMemo(() => ([
        { id: SECTIONS.GENERAL, ref: generalSectionRef },
        { id: SECTIONS.INTERFACE, ref: interfaceSectionRef },
        { id: SECTIONS.SHORTCUTS, ref: shortcutsSectionRef },
    ]), []);

    const { containerRef, selectedId, onScroll, scrollToSection } = useScrollSpy(sections, routeFocused);

    const onMenuSelect = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const sectionId = event.currentTarget.dataset.section;
        if (sectionId) {
            scrollToSection(sectionId);
        }
    }, [scrollToSection]);

    return (
        <MainNavBars className={styles['settings-container']} route={'settings'}>
            <div className={classnames(styles['settings-content'], 'animation-fade-in')}>
                <Menu
                    selected={selectedId}
                    onSelect={onMenuSelect}
                />

                <div ref={containerRef} className={styles['sections-container']} onScroll={onScroll}>
                    <General
                        ref={generalSectionRef}
                    />
                    <Interface
                        ref={interfaceSectionRef}
                    />
                    {
                        !platform.isMobile && <Shortcuts ref={shortcutsSectionRef} />
                    }
                    <Info />
                </div>
            </div>
        </MainNavBars>
    );
};

const SettingsFallback = () => (
    <MainNavBars className={styles['settings-container']} route={'settings'} />
);

export default withCoreSuspender(Settings, SettingsFallback);
