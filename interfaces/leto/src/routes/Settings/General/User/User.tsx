import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '../../components';
import styles from './User.less';

// PBS Crewing Module: same fix as NavMenuContent.js — Stremio's own account
// system (`profile.auth`) never existed for real in this fork. Read the
// real Pollux session from localStorage instead.
const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('pollux-user') || 'null');
    } catch {
        return null;
    }
};

const clearStoredSession = () => {
    localStorage.removeItem('pollux-auth');
    localStorage.removeItem('pollux-user');
};

const SessionLink = ({ user, onLogout, t }: { user: unknown, onLogout: () => void, t: (key: string) => string }) => (
    user
        ? <Link label={t('LOG_OUT')} onClick={onLogout} />
        : <Link label={`${t('LOG_IN')} / ${t('SIGN_UP')}`} href={'/'} target={'_self'} />
);

const User = () => {
    const { t } = useTranslation();
    const [user] = useState(readStoredUser);

    const avatarUrl = useMemo(() => (
        user
            ? `url('${require('/assets/images/default_avatar.png')}')`
            : `url('${require('/assets/images/anonymous.png')}')`
    ), [user]);

    const onLogout = useCallback(() => {
        clearStoredSession();
        window.location.href = '/';
    }, []);

    return (
        <div className={styles['user']}>
            <div className={styles['user-info-content']}>
                <div className={styles['avatar-container']} style={{ backgroundImage: avatarUrl }} />
                <div className={styles['email-logout-container']}>
                    <div className={styles['email-label-container']} title={user ? (user as { email: string }).email : t('ANONYMOUS_USER')}>
                        <div className={styles['email-label']}>
                            {user ? (user as { email: string }).email : t('ANONYMOUS_USER')}
                        </div>
                    </div>
                    <SessionLink user={user} onLogout={onLogout} t={t} />
                </div>
            </div>
        </div>
    );
};

export default User;
