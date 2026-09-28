// E-3, mitad de Pollux (Handover.md nota 63/71) — la campanita de empresa.
//
// GET /api/notifications/me ya viene filtrada server-side por
// recipient_user_id (el JWT del usuario de la naviera) — no hay parámetro
// de scope que mandar: es el mismo endpoint que usa la campanita de admin
// en interfaces/admin, la diferencia es solo qué app la renderiza.
//
// requires_ack (hoy solo embarkation_verified_reverted, y solo importa acá
// del lado de la naviera — es su "declararse anuente", pedido textual de
// Rick) es un gate duro: leer (PATCH .../read) no cierra la notificación si
// requires_ack es true y no está acusada; hace falta el POST .../acknowledge
// aparte.
//
// El backend (notification_dispatch.py) ya renderiza el texto de
// embarkation_observado para scope="company" SIN field/finding — este
// componente no arma ningún link ni tooltip "ver detalle" que pudiera traer
// ese dato por otra vía (no existe ningún endpoint de empresa que lo
// exponga, confirmado antes de escribir esto — ver Handover).
import React from 'react';
import classnames from 'classnames';
import styles from './styles';

const _getJwt = () => {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('pollux-auth') : null;
        return JSON.parse(raw || 'null')?.state?.accessToken ?? null;
    } catch { return null; }
};

type NotificationItem = {
    id: string;
    kind: string;
    subject_type: string;
    subject_id: string;
    title: string;
    body: string;
    created_at: string | null;
    read_at: string | null;
    requires_ack: boolean;
    acknowledged_at: string | null;
};

const fmt = (iso: string | null) => {
    if (!iso) return '';
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffMin < 1440) return `hace ${Math.round(diffMin / 60)} h`;
    return new Date(iso).toLocaleDateString();
};

const NotificationBell = React.memo(() => {
    const [items, setItems] = React.useState<NotificationItem[]>([]);
    const [open, setOpen] = React.useState(false);
    const [busyId, setBusyId] = React.useState<string | null>(null);
    const rootRef = React.useRef<HTMLDivElement>(null);

    const load = React.useCallback(() => {
        const jwt = _getJwt();
        if (!jwt) return;
        fetch('/api/notifications/me', { headers: { Authorization: `Bearer ${jwt}` } })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setItems(data.items); })
            .catch(() => {});
    }, []);

    React.useEffect(() => {
        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [load]);

    React.useEffect(() => {
        if (!open) return undefined;
        const onClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    const unreadCount = items.filter(n => !n.read_at).length;

    const markRead = (n: NotificationItem) => {
        if (n.read_at) return;
        const jwt = _getJwt();
        if (!jwt) return;
        setBusyId(n.id);
        fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${jwt}` } })
            .finally(() => { setBusyId(null); load(); });
    };

    const acknowledge = (n: NotificationItem, e: React.MouseEvent) => {
        e.stopPropagation();
        const jwt = _getJwt();
        if (!jwt) return;
        setBusyId(n.id);
        fetch(`/api/notifications/${n.id}/acknowledge`, { method: 'POST', headers: { Authorization: `Bearer ${jwt}` } })
            .finally(() => { setBusyId(null); load(); });
    };

    return (
        <div ref={rootRef} style={{ position: 'relative' }}>
            <button
                type="button"
                title="Notificaciones"
                className={classnames(styles['button-container'])}
                onClick={() => setOpen(v => !v)}
                style={{ position: 'relative', border: 'none', cursor: 'pointer' }}
            >
                <i className={classnames(styles['icon'], 'iconoir-bell')} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16,
                        padding: '0 4px', borderRadius: 8, background: '#ef4444', color: '#fff',
                        fontSize: 10, fontWeight: 700, lineHeight: '16px', textAlign: 'center',
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: '2.75rem', width: 360, maxHeight: 420,
                    overflowY: 'auto', background: '#0b1220', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', zIndex: 999,
                }}>
                    <div style={{
                        padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.07)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Notificaciones
                        </span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{unreadCount} sin leer</span>
                    </div>
                    {items.length === 0 ? (
                        <p style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                            Sin notificaciones
                        </p>
                    ) : items.map(n => {
                        const pendingAck = n.requires_ack && !n.acknowledged_at;
                        return (
                            <div key={n.id}
                                onClick={() => markRead(n)}
                                style={{
                                    padding: '0.75rem 1rem', fontSize: 12, cursor: 'pointer',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    background: !n.read_at ? 'rgba(0,240,255,0.04)' : 'transparent',
                                }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: 600, color: !n.read_at ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)' }}>
                                            {n.title}
                                        </p>
                                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{n.body}</p>
                                    </div>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flex: 'none' }}>{fmt(n.created_at)}</span>
                                </div>
                                {pendingAck && (
                                    <div style={{
                                        marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                                        padding: '0.4rem 0.6rem', background: 'rgba(251,191,36,0.1)',
                                        border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8,
                                    }}>
                                        <span style={{ fontSize: 11, color: '#fcd34d' }}>Requiere tu acuse</span>
                                        <button
                                            type="button"
                                            disabled={busyId === n.id}
                                            onClick={(e) => acknowledge(n, e)}
                                            style={{
                                                padding: '0.3rem 0.6rem', background: 'rgba(251,191,36,0.2)',
                                                border: '1px solid rgba(251,191,36,0.3)', color: '#fde68a',
                                                fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                                                opacity: busyId === n.id ? 0.4 : 1,
                                            }}>
                                            Declarar anuencia
                                        </button>
                                    </div>
                                )}
                                {n.requires_ack && n.acknowledged_at && (
                                    <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(52,211,153,0.7)' }}>
                                        ✓ Acusado {fmt(n.acknowledged_at)}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

NotificationBell.displayName = 'NotificationBell';

export default NotificationBell;
