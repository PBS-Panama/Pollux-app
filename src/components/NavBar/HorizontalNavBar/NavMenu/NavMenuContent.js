// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button } = require('leto/components');
const { withCoreSuspender } = require('leto/common/CoreSuspender');
const styles = require('./styles');

// Read the authenticated Leto user from localStorage (set by landing page on login)
const getLetoUser = () => {
    try {
        const data = typeof localStorage !== 'undefined' && localStorage.getItem('leto-user');
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};

const NavMenuContent = ({ onClick }) => {
    const { t } = useTranslation();
    const [letoUser, setLetoUser] = React.useState(getLetoUser);

    // Re-read if localStorage changes (e.g. login happening in parent window)
    React.useEffect(() => {
        const onStorage = () => setLetoUser(getLetoUser());
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const displayName = React.useMemo(() => {
        if (!letoUser) return 'ANONYMOUS';
        if (letoUser.first_name || letoUser.last_name) {
            return `${letoUser.first_name || ''} ${letoUser.last_name || ''}`.trim().toUpperCase();
        }
        return (letoUser.email || '').split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').toUpperCase();
    }, [letoUser]);

    const seafarerRank = letoUser ? (letoUser.rank || 'N/A') : null;
    const seafarerStatus = 'Validado';

    const logoutButtonOnClick = React.useCallback(() => {
        try { localStorage.removeItem('leto-auth'); } catch { /* */ }
        try { localStorage.removeItem('leto-user'); } catch { /* */ }
        // Navigate the top-level window back to the landing page
        (window.top || window).location.href = '/';
    }, []);

    return (
        <div className={classnames(styles['nav-menu-container'], 'animation-fade-in')} onClick={onClick}>
            {
                letoUser !== null ?
                    <div className={styles['seafarer-profile-card']}>
                        <div className={styles['seafarer-header']}>
                            <div
                                className={styles['seafarer-avatar']}
                                style={{ backgroundImage: `url('${require('/assets/images/default_avatar.png')}')` }}
                            />
                            <div className={styles['seafarer-details']}>
                                <div className={styles['seafarer-name']}>{displayName}</div>
                                <div className={styles['seafarer-rank-status']}>
                                    <span className={styles['seafarer-badge-rank']}>{seafarerRank}</span>
                                    <span className={styles['seafarer-badge-status']}>&#x2714; {seafarerStatus}</span>
                                </div>
                                <div className={styles['seafarer-email']}>{letoUser.email}</div>
                            </div>
                        </div>
                        <div className={styles['seafarer-actions']}>
                            <Button className={styles['action-button-primary']} title={'Mis Documentos'} href={'#/myfiles'}>
                                Mis Documentos
                            </Button>
                            <Button className={styles['action-button-danger']} title={'Cerrar sesión'} onClick={logoutButtonOnClick}>
                                Cerrar sesión
                            </Button>
                        </div>
                    </div>
                :
                    <div className={styles['user-info-container']}>
                        <div
                            className={styles['avatar-container']}
                            style={{ backgroundImage: `url('${require('/assets/images/anonymous.png')}')` }}
                        />
                        <div className={styles['user-info-details']}>
                            <div className={styles['email-container']}>
                                <div className={styles['email-label']}>{t('ANONYMOUS_USER')}</div>
                            </div>
                            <Button className={styles['logout-button-container']} title={'Iniciar Sesión'} onClick={() => { (window.top || window).location.href = '/'; }}>
                                <div className={styles['logout-label']}>Iniciar Sesión</div>
                            </Button>
                        </div>
                    </div>
            }
            <div className={styles['nav-menu-section']}>
                <Button className={styles['nav-menu-option-container']} title={'Ver perfil completo'} href={'#/my-profile'}>
                    <Icon className={styles['icon']} name={'person'} />
                    <div className={styles['nav-menu-option-label']}>Ver perfil completo</div>
                </Button>
            </div>
            <div className={styles['nav-menu-section']}>
                <Button className={styles['nav-menu-option-container']} title={t('SETTINGS')} href={'#/settings'}>
                    <Icon className={styles['icon']} name={'settings'} />
                    <div className={styles['nav-menu-option-label']}>{t('SETTINGS')}</div>
                </Button>
                <Button className={styles['nav-menu-option-container']} title={'Mis Entrenamientos'} href={'#/myexams'}>
                    <Icon className={styles['icon']} name={'addons-outline'} />
                    <div className={styles['nav-menu-option-label']}>Mis Entrenamientos</div>
                </Button>
            </div>
        </div>
    );
};

NavMenuContent.propTypes = {
    onClick: PropTypes.func
};

const NavMenuContentFallback = () => (
    <div className={styles['nav-menu-container']} />
);

module.exports = withCoreSuspender(NavMenuContent, NavMenuContentFallback);