import { useEffect, useState } from 'react'
import api from '../../lib/api'

interface Course {
  id: string; name: string; code: string; stcw_ref: string;
  level: string; departments: string[]; description: string;
  duration: string; validity: string; is_active: boolean;
}
interface Center {
  id: string; name: string; abbreviation: string; city: string; district: string;
  type: string; resolution: string; website: string | null;
  courses_count: number | null; specialties: string[]; notes: string; is_active: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  'All Levels': '#6b7280', 'Ratings': '#2563eb', 'OOW': '#d97706', 'Management': '#dc2626',
}
const LEVELS = ['All Levels', 'Ratings', 'OOW', 'Management']
const DEPTS = ['Deck Department', 'Engine Department', 'Electro-Technical', 'Radio / GMDSS', 'Medical', 'Catering / Hotel']

interface CourseForm {
  name: string; code: string; stcw_ref: string; level: string;
  departments: string[]; description: string; duration: string; validity: string;
}
const EMPTY_COURSE: CourseForm = {
  name: '', code: '', stcw_ref: '', level: 'All Levels',
  departments: [], description: '', duration: '', validity: '',
}

interface CenterForm {
  name: string; abbreviation: string; city: string; district: string;
  type: string; resolution: string; website: string;
  courses_count: string; specialties: string; notes: string;
}
const EMPTY_CENTER: CenterForm = {
  name: '', abbreviation: '', city: '', district: '',
  type: '', resolution: '', website: '', courses_count: '', specialties: '', notes: '',
}

function centerToForm(c: Center): CenterForm {
  return {
    name: c.name, abbreviation: c.abbreviation, city: c.city, district: c.district,
    type: c.type, resolution: c.resolution, website: c.website || '',
    courses_count: c.courses_count != null ? String(c.courses_count) : '',
    specialties: c.specialties.join('\n'), notes: c.notes,
  }
}

function courseToForm(c: Course): CourseForm {
  return {
    name: c.name, code: c.code, stcw_ref: c.stcw_ref, level: c.level,
    departments: [...c.departments], description: c.description,
    duration: c.duration, validity: c.validity,
  }
}

export default function AdminExams() {
  const [tab, setTab] = useState<'courses' | 'centers'>('courses')

  // ── Courses ────────────────────────────────────────────────────────
  const [courses, setCourses] = useState<Course[]>([])
  const [courseSearch, setCourseSearch] = useState('')
  const [courseLevel, setCourseLevel] = useState('')
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [courseModal, setCourseModal] = useState<{ mode: 'add' | 'edit'; data: CourseForm; id?: string } | null>(null)
  const [courseSaving, setCourseSaving] = useState(false)
  const [courseExpanded, setCourseExpanded] = useState<string | null>(null)

  const loadCourses = (lvl = courseLevel, q = courseSearch) => {
    setCoursesLoading(true)
    const params = new URLSearchParams({ limit: '200', ...(lvl && { level: lvl }), ...(q && { search: q }) })
    api.get(`/admin/exams/courses?${params}`).then(r => setCourses(r.data.items)).catch(() => {}).finally(() => setCoursesLoading(false))
  }

  useEffect(() => { loadCourses() }, [])

  const handleCourseSearch = (e: React.FormEvent) => { e.preventDefault(); loadCourses(courseLevel, courseSearch) }

  const changeCourseLevel = (lvl: string) => {
    setCourseLevel(lvl)
    loadCourses(lvl, courseSearch)
  }

  const saveCourse = async () => {
    if (!courseModal) return
    setCourseSaving(true)
    try {
      if (courseModal.mode === 'add') {
        await api.post('/admin/exams/courses', courseModal.data)
      } else {
        await api.patch(`/admin/exams/courses/${courseModal.id}`, courseModal.data)
      }
      setCourseModal(null)
      loadCourses()
    } catch { } finally { setCourseSaving(false) }
  }

  const deleteCourse = async (id: string) => {
    if (!confirm('Delete this course from the catalog?')) return
    await api.delete(`/admin/exams/courses/${id}`)
    loadCourses()
  }

  const toggleCourseDept = (dept: string) => {
    if (!courseModal) return
    const depts = courseModal.data.departments
    const next = depts.includes(dept) ? depts.filter(d => d !== dept) : [...depts, dept]
    setCourseModal({ ...courseModal, data: { ...courseModal.data, departments: next } })
  }

  // ── Centers ────────────────────────────────────────────────────────
  const [centers, setCenters] = useState<Center[]>([])
  const [centerSearch, setCenterSearch] = useState('')
  const [centersLoading, setCentersLoading] = useState(true)
  const [centerModal, setCenterModal] = useState<{ mode: 'add' | 'edit'; data: CenterForm; id?: string } | null>(null)
  const [centerSaving, setCenterSaving] = useState(false)

  const loadCenters = (q = centerSearch) => {
    setCentersLoading(true)
    const params = new URLSearchParams({ limit: '100', ...(q && { search: q }) })
    api.get(`/admin/exams/centers?${params}`).then(r => setCenters(r.data.items)).catch(() => {}).finally(() => setCentersLoading(false))
  }

  useEffect(() => { loadCenters() }, [])

  const handleCenterSearch = (e: React.FormEvent) => { e.preventDefault(); loadCenters(centerSearch) }

  const saveCenter = async () => {
    if (!centerModal) return
    setCenterSaving(true)
    try {
      const raw = centerModal.data
      const payload = {
        ...raw,
        courses_count: raw.courses_count ? parseInt(raw.courses_count) : null,
        specialties: raw.specialties.split('\n').map(s => s.trim()).filter(Boolean),
        website: raw.website || null,
      }
      if (centerModal.mode === 'add') {
        await api.post('/admin/exams/centers', payload)
      } else {
        await api.patch(`/admin/exams/centers/${centerModal.id}`, payload)
      }
      setCenterModal(null)
      loadCenters()
    } catch { } finally { setCenterSaving(false) }
  }

  const deleteCenter = async (id: string) => {
    if (!confirm('Delete this training center?')) return
    await api.delete(`/admin/exams/centers/${id}`)
    loadCenters()
  }

  const inp = 'w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-400/40'
  const textArea = `${inp} resize-y min-h-[80px]`
  const label = 'block text-xs text-white/40 mb-1'
  const modalOverlay = 'fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4'
  const modalBox = 'bg-[#0f1923] border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4'
  const saveBtn = (saving: boolean) => `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${saving ? 'bg-cyan-400/30 text-cyan-400/50 cursor-not-allowed' : 'bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 border border-cyan-400/30'}`
  const cancelBtn = 'px-4 py-2 rounded-lg text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/50 border border-white/10'

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white"><i className="iconoir-graduation-cap mr-2" aria-hidden="true" />Exams &amp; Training Centers</h2>
          <p className="text-xs text-white/30 mt-0.5">STCW course catalog and AMP-recognized training centers</p>
        </div>
        <button
          onClick={() => tab === 'courses'
            ? setCourseModal({ mode: 'add', data: { ...EMPTY_COURSE } })
            : setCenterModal({ mode: 'add', data: { ...EMPTY_CENTER } })
          }
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-400 border border-cyan-400/25 transition-colors"
        >
          + Add {tab === 'courses' ? 'Course' : 'Center'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 w-fit">
        {(['courses', 'centers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${tab === t ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/20' : 'text-white/35 hover:text-white/60'}`}>
            {t === 'courses' ? `Courses (${courses.length})` : `Centers (${centers.length})`}
          </button>
        ))}
      </div>

      {/* ── COURSES TAB ──────────────────────────────────────── */}
      {tab === 'courses' && (
        <div className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <form onSubmit={handleCourseSearch} className="flex gap-2 flex-1 min-w-[200px]">
              <input value={courseSearch} onChange={e => setCourseSearch(e.target.value)}
                placeholder="Search courses…" className={`${inp} flex-1`} />
              <button type="submit" className="px-3 py-2 rounded-lg text-sm bg-white/[0.05] hover:bg-white/[0.09] text-white/50 border border-white/10">Search</button>
            </form>
            <div className="flex gap-1 flex-wrap">
              {['', ...LEVELS].map(lvl => (
                <button key={lvl} onClick={() => changeCourseLevel(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${courseLevel === lvl
                    ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-400'
                    : 'border-white/10 bg-white/[0.03] text-white/35 hover:text-white/60'}`}>
                  {lvl || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {coursesLoading
            ? <p className="text-white/25 text-sm py-8 text-center">Loading…</p>
            : courses.length === 0
              ? <p className="text-white/20 text-sm py-8 text-center">No courses found.</p>
              : (
                <div className="flex flex-col gap-2">
                  {courses.map(c => {
                    const lvlColor = LEVEL_COLORS[c.level] || '#6b7280'
                    const isExp = courseExpanded === c.id
                    return (
                      <div key={c.id}
                        className="bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] rounded-xl transition-colors">
                        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                          onClick={() => setCourseExpanded(isExp ? null : c.id)}>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                            style={{ background: lvlColor + '28', color: lvlColor, border: `1px solid ${lvlColor}44` }}>
                            {c.level}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white/80 truncate">{c.name}</p>
                            <p className="text-xs text-white/30">{c.code} · {c.stcw_ref}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.is_active ? 'bg-green-500/15 text-green-400' : 'bg-white/[0.06] text-white/25'}`}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <button onClick={e => { e.stopPropagation(); setCourseModal({ mode: 'edit', data: courseToForm(c), id: c.id }) }}
                              className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors text-xs"><i className="iconoir-edit-pencil" aria-hidden="true" /></button>
                            <button onClick={e => { e.stopPropagation(); deleteCourse(c.id) }}
                              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors text-xs"><i className="iconoir-trash" aria-hidden="true" /></button>
                          </div>
                        </div>
                        {isExp && (
                          <div className="px-4 pb-3 border-t border-white/[0.05] pt-3 flex flex-col gap-2">
                            <p className="text-xs text-white/45 leading-relaxed">{c.description || '—'}</p>
                            <div className="flex gap-4 text-xs text-white/35">
                              <span><span className="text-white/20">Duration:</span> {c.duration || '—'}</span>
                              <span><span className="text-white/20">Validity:</span> {c.validity || '—'}</span>
                            </div>
                            <div className="flex gap-1 flex-wrap mt-1">
                              {c.departments.map(d => (
                                <span key={d} className="px-2 py-0.5 rounded bg-white/[0.05] text-white/35 text-[10px] border border-white/[0.07]">{d}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
          }
        </div>
      )}

      {/* ── CENTERS TAB ──────────────────────────────────────── */}
      {tab === 'centers' && (
        <div className="flex flex-col gap-4">
          <form onSubmit={handleCenterSearch} className="flex gap-2">
            <input value={centerSearch} onChange={e => setCenterSearch(e.target.value)}
              placeholder="Search centers…" className={`${inp} flex-1`} />
            <button type="submit" className="px-3 py-2 rounded-lg text-sm bg-white/[0.05] hover:bg-white/[0.09] text-white/50 border border-white/10">Search</button>
          </form>

          {centersLoading
            ? <p className="text-white/25 text-sm py-8 text-center">Loading…</p>
            : centers.length === 0
              ? <p className="text-white/20 text-sm py-8 text-center">No centers found.</p>
              : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {centers.map(c => (
                    <div key={c.id} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-white/80">{c.abbreviation}</p>
                          <p className="text-xs text-white/40 leading-snug">{c.name}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setCenterModal({ mode: 'edit', data: centerToForm(c), id: c.id })}
                            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors text-xs"><i className="iconoir-edit-pencil" aria-hidden="true" /></button>
                          <button onClick={() => deleteCenter(c.id)}
                            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors text-xs"><i className="iconoir-trash" aria-hidden="true" /></button>
                        </div>
                      </div>
                      <div className="text-xs text-white/30 flex gap-3 flex-wrap">
                        <span>{c.district || c.city}</span>
                        {c.courses_count != null && <span>{c.courses_count} courses</span>}
                        <span className={c.is_active ? 'text-green-400' : 'text-white/20'}>{c.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <p className="text-[10px] text-white/20 italic">{c.type}</p>
                    </div>
                  ))}
                </div>
              )
          }
        </div>
      )}

      {/* ── Course Modal ──────────────────────────────────────── */}
      {courseModal && (
        <div className={modalOverlay} onClick={e => e.target === e.currentTarget && setCourseModal(null)}>
          <div className={modalBox}>
            <h3 className="text-base font-bold text-white/90">
              {courseModal.mode === 'add' ? '+ New Course' : 'Edit Course'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={label}>Course Name *</label>
                <input className={inp} value={courseModal.data.name}
                  onChange={e => setCourseModal({ ...courseModal, data: { ...courseModal.data, name: e.target.value } })} />
              </div>
              <div>
                <label className={label}>Code</label>
                <input className={inp} value={courseModal.data.code}
                  onChange={e => setCourseModal({ ...courseModal, data: { ...courseModal.data, code: e.target.value } })} />
              </div>
              <div>
                <label className={label}>STCW Reference</label>
                <input className={inp} value={courseModal.data.stcw_ref}
                  onChange={e => setCourseModal({ ...courseModal, data: { ...courseModal.data, stcw_ref: e.target.value } })} />
              </div>
              <div>
                <label className={label}>Duration</label>
                <input className={inp} placeholder="e.g. 2 days" value={courseModal.data.duration}
                  onChange={e => setCourseModal({ ...courseModal, data: { ...courseModal.data, duration: e.target.value } })} />
              </div>
              <div>
                <label className={label}>Validity</label>
                <input className={inp} placeholder="e.g. 5 years" value={courseModal.data.validity}
                  onChange={e => setCourseModal({ ...courseModal, data: { ...courseModal.data, validity: e.target.value } })} />
              </div>
              <div className="col-span-2">
                <label className={label}>Level</label>
                <div className="flex gap-1.5 flex-wrap">
                  {LEVELS.map(lvl => {
                    const active = courseModal.data.level === lvl
                    const col = LEVEL_COLORS[lvl]
                    return (
                      <button key={lvl} type="button"
                        onClick={() => setCourseModal({ ...courseModal, data: { ...courseModal.data, level: lvl } })}
                        className="px-3 py-1 rounded-lg text-xs font-semibold border transition-colors"
                        style={active
                          ? { background: col + '22', color: col, borderColor: col + '55' }
                          : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.1)' }
                        }
                      >{lvl}</button>
                    )
                  })}
                </div>
              </div>
              <div className="col-span-2">
                <label className={label}>Departments</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DEPTS.map(d => {
                    const active = courseModal.data.departments.includes(d)
                    return (
                      <button key={d} type="button" onClick={() => toggleCourseDept(d)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${active ? 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30' : 'bg-white/[0.03] text-white/30 border-white/10'}`}>
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="col-span-2">
                <label className={label}>Description</label>
                <textarea className={textArea} value={courseModal.data.description}
                  onChange={e => setCourseModal({ ...courseModal, data: { ...courseModal.data, description: e.target.value } })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.07]">
              <button className={cancelBtn} onClick={() => setCourseModal(null)}>Cancel</button>
              <button className={saveBtn(courseSaving)} disabled={courseSaving} onClick={saveCourse}>
                {courseSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Center Modal ──────────────────────────────────────── */}
      {centerModal && (
        <div className={modalOverlay} onClick={e => e.target === e.currentTarget && setCenterModal(null)}>
          <div className={modalBox}>
            <h3 className="text-base font-bold text-white/90">
              {centerModal.mode === 'add' ? '+ New Training Center' : 'Edit Training Center'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={label}>Full Name *</label>
                <input className={inp} value={centerModal.data.name}
                  onChange={e => setCenterModal({ ...centerModal, data: { ...centerModal.data, name: e.target.value } })} />
              </div>
              <div>
                <label className={label}>Abbreviation</label>
                <input className={inp} value={centerModal.data.abbreviation}
                  onChange={e => setCenterModal({ ...centerModal, data: { ...centerModal.data, abbreviation: e.target.value } })} />
              </div>
              <div>
                <label className={label}>Type</label>
                <input className={inp} placeholder="e.g. Centro Privado" value={centerModal.data.type}
                  onChange={e => setCenterModal({ ...centerModal, data: { ...centerModal.data, type: e.target.value } })} />
              </div>
              <div>
                <label className={label}>City</label>
                <input className={inp} value={centerModal.data.city}
                  onChange={e => setCenterModal({ ...centerModal, data: { ...centerModal.data, city: e.target.value } })} />
              </div>
              <div>
                <label className={label}>District</label>
                <input className={inp} value={centerModal.data.district}
                  onChange={e => setCenterModal({ ...centerModal, data: { ...centerModal.data, district: e.target.value } })} />
              </div>
              <div>
                <label className={label}>AMP Resolution</label>
                <input className={inp} value={centerModal.data.resolution}
                  onChange={e => setCenterModal({ ...centerModal, data: { ...centerModal.data, resolution: e.target.value } })} />
              </div>
              <div>
                <label className={label}>Courses Count</label>
                <input type="number" className={inp} value={centerModal.data.courses_count}
                  onChange={e => setCenterModal({ ...centerModal, data: { ...centerModal.data, courses_count: e.target.value } })} />
              </div>
              <div className="col-span-2">
                <label className={label}>Website</label>
                <input className={inp} placeholder="https://…" value={centerModal.data.website}
                  onChange={e => setCenterModal({ ...centerModal, data: { ...centerModal.data, website: e.target.value } })} />
              </div>
              <div className="col-span-2">
                <label className={label}>Specialties (one per line)</label>
                <textarea className={textArea} placeholder="BST&#10;GMDSS&#10;Tanquero…" value={centerModal.data.specialties}
                  onChange={e => setCenterModal({ ...centerModal, data: { ...centerModal.data, specialties: e.target.value } })} />
              </div>
              <div className="col-span-2">
                <label className={label}>Notes</label>
                <textarea className={`${inp} min-h-[60px] resize-y`} value={centerModal.data.notes}
                  onChange={e => setCenterModal({ ...centerModal, data: { ...centerModal.data, notes: e.target.value } })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.07]">
              <button className={cancelBtn} onClick={() => setCenterModal(null)}>Cancel</button>
              <button className={saveBtn(centerSaving)} disabled={centerSaving} onClick={saveCenter}>
                {centerSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
