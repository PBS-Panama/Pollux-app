// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button, Image } = require('leto/components');
const styles = require('./styles');

// PBS Crewing Module: custom navigation SVG icons
const CREW_ICONS = {
    'crew-dashboard': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round">
            <rect x="80" y="80" width="352" height="272" rx="24" />
            <line x1="80" y1="140" x2="432" y2="140" />
            <rect x="80" y="352" width="352" height="8" rx="4" fill="currentColor" stroke="none" />
            <line x1="200" y1="380" x2="312" y2="380" />
            <circle cx="120" cy="110" r="10" fill="currentColor" stroke="none" />
            <circle cx="156" cy="110" r="10" fill="currentColor" stroke="none" />
            <circle cx="192" cy="110" r="10" fill="currentColor" stroke="none" />
            <rect x="120" y="180" width="120" height="80" rx="8" strokeWidth="20" />
            <rect x="272" y="180" width="120" height="80" rx="8" strokeWidth="20" />
            <line x1="120" y1="296" x2="392" y2="296" strokeWidth="16" opacity="0.5" />
            <line x1="120" y1="320" x2="300" y2="320" strokeWidth="16" opacity="0.3" />
        </svg>
    ),
    'crew-person': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="256" cy="176" r="96" />
            <path d="M108 432c0-82 66-148 148-148s148 66 148 148" />
        </svg>
    ),
    'crew-folder': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round">
            <path d="M80 152V120a32 32 0 0 1 32-32h96l40 48h152a32 32 0 0 1 32 32v224a32 32 0 0 1-32 32H112a32 32 0 0 1-32-32V152z" />
            <line x1="176" y1="264" x2="336" y2="264" />
            <line x1="176" y1="312" x2="296" y2="312" />
        </svg>
    ),
    'crew-calendar': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round">
            <rect x="80" y="96" width="352" height="336" rx="32" />
            <line x1="80" y1="192" x2="432" y2="192" />
            <line x1="176" y1="64" x2="176" y2="128" />
            <line x1="336" y1="64" x2="336" y2="128" />
            <path d="M224 304 l24 24 l48 -48" strokeWidth="32" />
        </svg>
    ),
    'crew-exam': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round">
            <path d="M144 48h192l80 80v320a32 32 0 0 1-32 32H144a32 32 0 0 1-32-32V80a32 32 0 0 1 32-32z" />
            <polyline points="336,48 336,128 416,128" />
            <line x1="176" y1="224" x2="336" y2="224" strokeWidth="20" />
            <line x1="176" y1="280" x2="336" y2="280" strokeWidth="20" />
            <line x1="176" y1="336" x2="272" y2="336" strokeWidth="20" />
            <path d="M296 360 l24 24 l48 -48" strokeWidth="28" />
        </svg>
    ),
    'crew-settings': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="256" cy="256" r="72" />
            <path d="M234 64h44l8 52a148 148 0 0 1 36 20l50-18 22 38-42 34a148 148 0 0 1 0 40l42 34-22 38-50-18a148 148 0 0 1-36 20l-8 52h-44l-8-52a148 148 0 0 1-36-20l-50 18-22-38 42-34a148 148 0 0 1 0-40l-42-34 22-38 50 18a148 148 0 0 1 36-20z" />
        </svg>
    ),
    'crew-anchor': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="256" cy="112" r="48" />
            <line x1="256" y1="160" x2="256" y2="448" />
            <line x1="176" y1="224" x2="336" y2="224" />
            <path d="M96 352c0 64 72 112 160 112s160-48 160-112" />
        </svg>
    ),
    'crew-ship': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round">
            <path d="M80 320 l48-160 h256 l48 160" />
            <path d="M48 320 c64 64 160 64 208 32 s144 32 208-32" />
            <line x1="256" y1="96" x2="256" y2="160" />
            <line x1="256" y1="96" x2="352" y2="144" />
            <line x1="176" y1="224" x2="336" y2="224" />
            <path d="M64 400 c64 32 128 32 192 0 s128-32 192 0" />
        </svg>
    ),
};

const NavTabButton = ({ className, logo, icon, label, href, selected, onClick }) => {
    const renderLogoFallback = React.useCallback(() => (
        typeof icon === 'string' && icon.length > 0 ?
            <Icon className={styles['icon']} name={icon} />
            :
            null
    ), [icon]);
    const onDoubleClick = () => {
        const scrollableElements = document.querySelectorAll('div');

        scrollableElements.forEach((element) => {
            if (element.scrollTop > 0) {
                element.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    };
    // PBS Crewing: render custom SVG if it's a crew icon
    const renderIcon = () => {
        if (typeof icon === 'string' && CREW_ICONS[icon]) {
            return <div className={styles['icon']}>{CREW_ICONS[icon]}</div>;
        }
        if (typeof icon === 'string' && icon.length > 0) {
            return <Icon className={styles['icon']} name={selected ? icon : `${icon}-outline`} />;
        }
        return null;
    };
    return (
        <Button className={classnames(className, styles['nav-tab-button-container'], { 'selected': selected })} title={label} tabIndex={-1} href={href} onClick={onClick} onDoubleClick={onDoubleClick}>
            {
                typeof logo === 'string' && logo.length > 0 ?
                    <Image
                        className={styles['logo']}
                        src={logo}
                        alt={' '}
                        renderFallback={renderLogoFallback}
                    />
                    :
                    renderIcon()
            }
            {
                typeof label === 'string' && label.length > 0 ?
                    <div className={styles['label']}>{label}</div>
                    :
                    null
            }
        </Button>
    );
};

NavTabButton.propTypes = {
    className: PropTypes.string,
    logo: PropTypes.string,
    icon: PropTypes.string,
    label: PropTypes.string,
    href: PropTypes.string,
    selected: PropTypes.bool,
    onClick: PropTypes.func
};

module.exports = NavTabButton;
