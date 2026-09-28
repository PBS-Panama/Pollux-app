// PBS Crewing Module — Mi Flota
// Two-step model (Rick, 2026-09-12): a company first "hires" a seafarer (creates the
// company<->seafarer link in `relationships` — this is the first real write path from the
// company side into that table, previously only ever written by the admin panel's manual
// "+ New" button) and only afterward assigns that hired staff member to a vessel rotation
// (temporary or permanent). This page owns both steps plus the vessel registry itself.

const React = require('react');
const { MainNavBars } = require('pollux/components');
const styles = require('./styles');

const CATEGORY_LABELS = {
    merchant: 'Marina Mercante', offshore: 'Offshore / MOU',
    fishing: 'Pesquero', yacht: 'Yates / Recreo', national: 'Aguas Nacionales',
};

const getAuthToken = () => {
    try {
        const raw = localStorage.getItem('pollux-auth');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return (parsed && parsed.state && parsed.state.accessToken) || null;
    } catch {
        return null;
    }
};

const authedFetch = (url, options) => {
    const token = getAuthToken();
    const headers = Object.assign({}, options && options.headers, token ? { Authorization: 'Bearer ' + token } : {});
    return fetch(url, Object.assign({}, options, { headers }));
};

const authedJson = (url, options) => {
    const opts = options || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers);
    return authedFetch(url, Object.assign({}, opts, { headers })).then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) {
            const err = new Error((body && body.detail) || ('HTTP ' + r.status));
            err.status = r.status;
            throw err;
        }
        return body;
    });
};

// Resize + compress an uploaded image client-side so photo_b64 stays a reasonable size.
const fileToResizedDataUrl = (file, maxDim) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
            let { width, height } = img;
            if (width > height && width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
            else if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
});

const formatDate = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('es-PA') : null;
const todayStr = () => new Date().toISOString().slice(0, 10);

// ── Staff tab ─────────────────────────────────────────────────────────
const StaffTab = () => {
    const [staff, setStaff] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [hiring, setHiring] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [directory, setDirectory] = React.useState([]);
    const [directoryLoading, setDirectoryLoading] = React.useState(false);
    const [busyId, setBusyId] = React.useState(null);
    const [error, setError] = React.useState('');

    const loadStaff = React.useCallback(() => {
        setLoading(true);
        authedJson('/api/company/staff')
            .then((data) => setStaff((data && data.items) || []))
            .catch(() => setError('No se pudo cargar el personal.'))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => { loadStaff(); }, [loadStaff]);

    React.useEffect(() => {
        if (!hiring) return;
        setDirectoryLoading(true);
        authedFetch('/api/company/seafarers')
            .then((r) => r.ok ? r.json() : { seafarers: [] })
            .then((data) => setDirectory((data && data.seafarers) || []))
            .catch(() => setDirectory([]))
            .finally(() => setDirectoryLoading(false));
    }, [hiring]);

    const hiredIds = React.useMemo(() => new Set(staff.filter((s) => s.status === 'active').map((s) => s.seafarer_id)), [staff]);

    const filteredDirectory = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        return directory.filter((s) => {
            if (hiredIds.has(s.id)) return false;
            if (!q) return true;
            const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
            return name.includes(q) || (s.rank || '').toLowerCase().includes(q);
        });
    }, [directory, search, hiredIds]);

    const hire = (seafarerId) => {
        setBusyId(seafarerId);
        setError('');
        authedJson('/api/company/staff', { method: 'POST', body: JSON.stringify({ seafarer_id: seafarerId }) })
            .then(() => { loadStaff(); })
            .catch(() => setError('No se pudo contratar al marino.'))
            .finally(() => setBusyId(null));
    };

    const release = (relationshipId) => {
        setBusyId(relationshipId);
        authedJson('/api/company/staff/' + relationshipId, { method: 'PATCH', body: JSON.stringify({ status: 'ended' }) })
            .then(() => { loadStaff(); })
            .catch(() => setError('No se pudo dar de baja.'))
            .finally(() => setBusyId(null));
    };

    return (
        <div className={styles['tab-content']}>
            <div className={styles['tab-header-row']}>
                <div className={styles['section-label']}>{staff.filter((s) => s.status === 'active').length} en tu personal</div>
                <button className={styles['btn-primary']} onClick={() => setHiring((v) => !v)}>
                    {hiring ? 'Cerrar' : '+ Contratar'}
                </button>
            </div>

            {error && <div className={styles['error-banner']}>{error}</div>}

            {hiring && (
                <div className={styles['hire-panel']}>
                    <input
                        className={styles['text-input']}
                        placeholder="Buscar por nombre o rango…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {directoryLoading && <div className={styles['muted']}>Cargando marinos disponibles…</div>}
                    {!directoryLoading && filteredDirectory.length === 0 && (
                        <div className={styles['muted']}>No hay marinos disponibles que coincidan con la búsqueda.</div>
                    )}
                    <div className={styles['directory-list']}>
                        {filteredDirectory.map((s) => (
                            <div key={s.id} className={styles['directory-row']}>
                                <div>
                                    <div className={styles['row-title']}>{s.first_name} {s.last_name}</div>
                                    <div className={styles['row-sub']}>{s.rank || 'Sin rango'} · {s.fleet_category_label || ''}</div>
                                </div>
                                <button className={styles['btn-small']} disabled={busyId === s.id} onClick={() => hire(s.id)}>
                                    {busyId === s.id ? '…' : 'Contratar'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading && <div className={styles['muted']}>Cargando personal…</div>}

            {!loading && staff.length === 0 && (
                <div className={styles['empty-state']}>
                    <div className={styles['empty-title']}>Aún no tienes personal contratado</div>
                    <div className={styles['empty-desc']}>Usa "+ Contratar" para agregar marinos a tu staff antes de asignarlos a un barco.</div>
                </div>
            )}

            <div className={styles['card-list']}>
                {staff.map((s) => (
                    <div key={s.id} className={styles['staff-card']}>
                        <div>
                            <div className={styles['row-title']}>{s.name}</div>
                            <div className={styles['row-sub']}>{s.rank || 'Sin rango'}</div>
                        </div>
                        <div className={styles['row-right']}>
                            <span className={styles['status-chip']} data-status={s.status}>{s.status}</span>
                            {s.status === 'active' && (
                                <button className={styles['btn-ghost']} disabled={busyId === s.id} onClick={() => release(s.id)}>
                                    {busyId === s.id ? '…' : 'Dar de baja'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Vessel detail (rotations) ────────────────────────────────────────
const VesselDetail = ({ vessel, staff, onBack }) => {
    const [assignments, setAssignments] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [assigning, setAssigning] = React.useState(false);
    const [form, setForm] = React.useState({ seafarer_id: '', rank: '', embark_date: todayStr(), disembark_date: '' });
    const [error, setError] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    const load = React.useCallback(() => {
        setLoading(true);
        authedJson('/api/company/vessels/' + vessel.id + '/assignments')
            .then((data) => setAssignments((data && data.items) || []))
            .catch(() => setError('No se pudieron cargar las rotaciones.'))
            .finally(() => setLoading(false));
    }, [vessel.id]);

    React.useEffect(() => { load(); }, [load]);

    const activeStaff = staff.filter((s) => s.status === 'active');

    const submitAssignment = (e) => {
        e.preventDefault();
        if (!form.seafarer_id || !form.rank || !form.embark_date) return;
        setSaving(true);
        setError('');
        authedJson('/api/company/vessels/' + vessel.id + '/assignments', {
            method: 'POST',
            body: JSON.stringify({
                seafarer_id: form.seafarer_id,
                rank: form.rank,
                embark_date: form.embark_date,
                disembark_date: form.disembark_date || null,
            }),
        })
            .then(() => {
                setAssigning(false);
                setForm({ seafarer_id: '', rank: '', embark_date: todayStr(), disembark_date: '' });
                load();
            })
            .catch((err) => setError(err.message || 'No se pudo asignar la rotación.'))
            .finally(() => setSaving(false));
    };

    return (
        <div className={styles['tab-content']}>
            <button className={styles['btn-ghost']} onClick={onBack}>← Volver a Mis Barcos</button>

            <div className={styles['vessel-detail-header']}>
                <h2 className={styles['vessel-detail-title']}>{vessel.name}</h2>
                <div className={styles['row-sub']}>
                    {vessel.vessel_type_label}{vessel.flag_country ? ' · ' + vessel.flag_country : ''}
                    {vessel.imo_number ? ' · IMO ' + vessel.imo_number : ''}
                </div>
            </div>

            <div className={styles['tab-header-row']}>
                <div className={styles['section-label']}>Rotaciones</div>
                <button className={styles['btn-primary']} onClick={() => setAssigning((v) => !v)}>
                    {assigning ? 'Cerrar' : '+ Asignar tripulante'}
                </button>
            </div>

            {error && <div className={styles['error-banner']}>{error}</div>}

            {assigning && (
                <form className={styles['form-panel']} onSubmit={submitAssignment}>
                    <select
                        className={styles['text-input']}
                        value={form.seafarer_id}
                        onChange={(e) => setForm((f) => Object.assign({}, f, { seafarer_id: e.target.value }))}
                        required
                    >
                        <option value="">Selecciona un marino de tu personal…</option>
                        {activeStaff.map((s) => (
                            <option key={s.seafarer_id} value={s.seafarer_id}>{s.name} — {s.rank || 'Sin rango'}</option>
                        ))}
                    </select>
                    <input className={styles['text-input']} placeholder="Puesto/rango a cubrir (ej. 2nd-mate)"
                        value={form.rank} onChange={(e) => setForm((f) => Object.assign({}, f, { rank: e.target.value }))} required />
                    <div className={styles['form-row']}>
                        <label className={styles['form-field']}>
                            <span className={styles['form-label']}>Fecha de embarque</span>
                            <input type="date" className={styles['text-input']} value={form.embark_date}
                                onChange={(e) => setForm((f) => Object.assign({}, f, { embark_date: e.target.value }))} required />
                        </label>
                        <label className={styles['form-field']}>
                            <span className={styles['form-label']}>Fecha de desembarque (vacío = permanente)</span>
                            <input type="date" className={styles['text-input']} value={form.disembark_date}
                                onChange={(e) => setForm((f) => Object.assign({}, f, { disembark_date: e.target.value }))} />
                        </label>
                    </div>
                    {activeStaff.length === 0 && (
                        <div className={styles['muted']}>No tienes personal contratado todavía — ve a "Mi Personal" primero.</div>
                    )}
                    <button className={styles['btn-primary']} type="submit" disabled={saving || activeStaff.length === 0}>
                        {saving ? 'Asignando…' : 'Asignar'}
                    </button>
                </form>
            )}

            {loading && <div className={styles['muted']}>Cargando rotaciones…</div>}
            {!loading && assignments.length === 0 && (
                <div className={styles['empty-state']}>
                    <div className={styles['empty-title']}>Sin rotaciones registradas</div>
                    <div className={styles['empty-desc']}>Asigna tripulantes de tu personal para coordinar embarques y desembarques.</div>
                </div>
            )}

            <div className={styles['card-list']}>
                {assignments.map((a) => (
                    <div key={a.id} className={styles['assignment-card']}>
                        <div>
                            <div className={styles['row-title']}>{a.seafarer_name} — {a.rank}</div>
                            <div className={styles['row-sub']}>
                                Embarca {formatDate(a.embark_date)}
                                {' · '}
                                {a.disembark_date ? 'Desembarca ' + formatDate(a.disembark_date) : 'Permanente'}
                            </div>
                        </div>
                        <span className={styles['status-chip']} data-status={a.status}>{a.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Vessels tab ───────────────────────────────────────────────────────
const VesselsTab = ({ staff }) => {
    const [vessels, setVessels] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [creating, setCreating] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [selectedId, setSelectedId] = React.useState(null);
    const [form, setForm] = React.useState({
        name: '', vessel_type: 'merchant', flag_country: '', imo_number: '',
        mmsi_number: '', crew_capacity: '', photo_b64: null,
    });

    const load = React.useCallback(() => {
        setLoading(true);
        authedJson('/api/company/vessels')
            .then((data) => setVessels((data && data.items) || []))
            .catch(() => setError('No se pudieron cargar los barcos.'))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const onPhotoChange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            const dataUrl = await fileToResizedDataUrl(file, 640);
            setForm((f) => Object.assign({}, f, { photo_b64: dataUrl }));
        } catch {
            setError('No se pudo procesar la imagen.');
        }
    };

    const submitVessel = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSaving(true);
        setError('');
        authedJson('/api/company/vessels', {
            method: 'POST',
            body: JSON.stringify({
                name: form.name.trim(),
                vessel_type: form.vessel_type,
                flag_country: form.flag_country || null,
                imo_number: form.imo_number || null,
                mmsi_number: form.mmsi_number || null,
                crew_capacity: form.crew_capacity ? parseInt(form.crew_capacity, 10) : null,
                photo_b64: form.photo_b64,
            }),
        })
            .then(() => {
                setCreating(false);
                setForm({ name: '', vessel_type: 'merchant', flag_country: '', imo_number: '', mmsi_number: '', crew_capacity: '', photo_b64: null });
                load();
            })
            .catch(() => setError('No se pudo crear el barco.'))
            .finally(() => setSaving(false));
    };

    const selected = vessels.find((v) => v.id === selectedId);
    if (selected) {
        return <VesselDetail vessel={selected} staff={staff} onBack={() => { setSelectedId(null); load(); }} />;
    }

    return (
        <div className={styles['tab-content']}>
            <div className={styles['tab-header-row']}>
                <div className={styles['section-label']}>{vessels.length} barco{vessels.length !== 1 ? 's' : ''}</div>
                <button className={styles['btn-primary']} onClick={() => setCreating((v) => !v)}>
                    {creating ? 'Cerrar' : '+ Agregar Barco'}
                </button>
            </div>

            {error && <div className={styles['error-banner']}>{error}</div>}

            {creating && (
                <form className={styles['form-panel']} onSubmit={submitVessel}>
                    <input className={styles['text-input']} placeholder="Nombre del barco"
                        value={form.name} onChange={(e) => setForm((f) => Object.assign({}, f, { name: e.target.value }))} required />
                    <div className={styles['form-row']}>
                        <select className={styles['text-input']} value={form.vessel_type}
                            onChange={(e) => setForm((f) => Object.assign({}, f, { vessel_type: e.target.value }))}>
                            {Object.entries(CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                        </select>
                        <input className={styles['text-input']} placeholder="Bandera / país"
                            value={form.flag_country} onChange={(e) => setForm((f) => Object.assign({}, f, { flag_country: e.target.value }))} />
                    </div>
                    <div className={styles['form-row']}>
                        <input className={styles['text-input']} placeholder="Número IMO"
                            value={form.imo_number} onChange={(e) => setForm((f) => Object.assign({}, f, { imo_number: e.target.value }))} />
                        <input className={styles['text-input']} placeholder="MMSI"
                            value={form.mmsi_number} onChange={(e) => setForm((f) => Object.assign({}, f, { mmsi_number: e.target.value }))} />
                        <input className={styles['text-input']} type="number" min="0" placeholder="Capacidad de tripulación"
                            value={form.crew_capacity} onChange={(e) => setForm((f) => Object.assign({}, f, { crew_capacity: e.target.value }))} />
                    </div>
                    <label className={styles['form-field']}>
                        <span className={styles['form-label']}>Foto del barco</span>
                        <input type="file" accept="image/*" onChange={onPhotoChange} />
                    </label>
                    {form.photo_b64 && <img src={form.photo_b64} alt="" className={styles['photo-preview']} />}
                    <button className={styles['btn-primary']} type="submit" disabled={saving}>
                        {saving ? 'Guardando…' : 'Guardar barco'}
                    </button>
                </form>
            )}

            {loading && <div className={styles['muted']}>Cargando barcos…</div>}
            {!loading && vessels.length === 0 && (
                <div className={styles['empty-state']}>
                    <div className={styles['empty-title']}>Aún no tienes barcos registrados</div>
                    <div className={styles['empty-desc']}>Usa "+ Agregar Barco" para empezar a coordinar rotaciones.</div>
                </div>
            )}

            <div className={styles['vessel-grid']}>
                {vessels.map((v) => (
                    <div key={v.id} className={styles['vessel-card']} onClick={() => setSelectedId(v.id)}>
                        <div className={styles['vessel-photo']} style={v.photo_b64 ? { backgroundImage: `url(${v.photo_b64})` } : undefined}>
                            {!v.photo_b64 && <span className={styles['vessel-photo-placeholder']}>⚓</span>}
                        </div>
                        <div className={styles['vessel-card-body']}>
                            <div className={styles['row-title']}>{v.name}</div>
                            <div className={styles['row-sub']}>{v.vessel_type_label}{v.flag_country ? ' · ' + v.flag_country : ''}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────
const MyFleet = () => {
    const [tab, setTab] = React.useState('vessels');
    const [staff, setStaff] = React.useState([]);

    // Shared staff list (needed by VesselsTab -> VesselDetail for the assignment picker)
    React.useEffect(() => {
        authedJson('/api/company/staff').then((data) => setStaff((data && data.items) || [])).catch(() => {});
    }, [tab]);

    return (
        <MainNavBars className={styles['fleet-container']} route="myFleet">
            <div className={styles['fleet-page']}>
                <div className={styles['fleet-header']}>
                    <h1 className={styles['fleet-title']}>Mi Flota</h1>
                    <p className={styles['fleet-subtitle']}>Registra tus barcos, contrata personal y coordina rotaciones de embarque.</p>
                </div>

                <div className={styles['tabs']}>
                    <button className={styles['tab-btn']} data-active={tab === 'vessels'} onClick={() => setTab('vessels')}>Mis Barcos</button>
                    <button className={styles['tab-btn']} data-active={tab === 'staff'} onClick={() => setTab('staff')}>Mi Personal</button>
                </div>

                {tab === 'vessels' ? <VesselsTab staff={staff} /> : <StaffTab />}
            </div>
        </MainNavBars>
    );
};

module.exports = MyFleet;
