// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button } = require('leto/components');
const styles = require('./styles');
const { Tooltip } = require('leto/common/Tooltips');

// PBS Crewing Module: custom action button SVG icons
const CREW_ACTION_ICONS = {
    'crew-add-list': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
            <line x1="80" y1="144" x2="336" y2="144" />
            <line x1="80" y1="256" x2="288" y2="256" />
            <line x1="80" y1="368" x2="240" y2="368" />
            <line x1="368" y1="288" x2="368" y2="432" />
            <line x1="296" y1="360" x2="440" y2="360" />
        </svg>
    ),
    'crew-download-cv': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
            <path d="M144 48h192l80 80v320a32 32 0 0 1-32 32H144a32 32 0 0 1-32-32V80a32 32 0 0 1 32-32z" />
            <polyline points="336,48 336,128 416,128" />
            <line x1="256" y1="208" x2="256" y2="368" />
            <polyline points="192,320 256,384 320,320" />
        </svg>
    ),
    'crew-interview': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
            <rect x="80" y="96" width="352" height="256" rx="24" />
            <polygon points="208,192 208,288 320,240" fill="currentColor" stroke="none" />
            <line x1="160" y1="416" x2="352" y2="416" />
            <line x1="256" y1="352" x2="256" y2="416" />
        </svg>
    ),
    'crew-full-profile': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="256" cy="176" r="80" />
            <path d="M128 400c0-70 58-128 128-128s128 58 128 128" />
            <rect x="64" y="48" width="384" height="416" rx="32" />
        </svg>
    ),
    'crew-check': (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="416,128 176,368 96,288" />
        </svg>
    ),
};

const ActionButton = ({ className, icon, label, tooltip, ...props }) => {
    const isCrewIcon = typeof icon === 'string' && CREW_ACTION_ICONS[icon];
    return (
        <Button title={tooltip ? '' : label} {...props} className={classnames(className, styles['action-button-container'], { 'wide': typeof label === 'string' && !tooltip })}>
            {
                tooltip === true ?
                    <Tooltip label={label} position={'top'} />
                    :
                    null
            }
            {
                isCrewIcon ?
                    <div className={styles['icon-container']}>
                        <div className={styles['icon']}>{CREW_ACTION_ICONS[icon]}</div>
                    </div>
                    :
                    typeof icon === 'string' && icon.length > 0 ?
                        <div className={styles['icon-container']}>
                            <Icon className={styles['icon']} name={icon} />
                        </div>
                        :
                        null
            }
            {
                !tooltip && typeof label === 'string' && label.length > 0 ?
                    <div className={styles['label-container']}>
                        <div className={styles['label']}>{label}</div>
                    </div>
                    :
                    null
            }
        </Button>
    );
};

ActionButton.propTypes = {
    className: PropTypes.string,
    icon: PropTypes.string,
    label: PropTypes.string,
    tooltip: PropTypes.bool
};

module.exports = ActionButton;
