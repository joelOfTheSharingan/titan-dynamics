import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useNavigate } from 'react-router-dom';
import './App.css';

/* ── helpers ── */
function fmt12(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(d) {
  if (!d) return '—';
  const [y, mo, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(mo) - 1]} ${parseInt(day)}, ${y}`;
}

function calcHours(start, end) {
  const s = new Date(`1970-01-01T${start}:00`);
  const e = new Date(`1970-01-01T${end}:00`);
  return ((e.getTime() - s.getTime()) / 3600000).toFixed(2);
}

export default function App() {
  const [userRow, setUserRow] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isUpdated, setIsUpdated] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    project: '',
  });
  const [clock, setClock] = useState('');
  const [flash, setFlash] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [needsName, setNeedsName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const navigate = useNavigate();
  const SHEET_URL = "https://docs.google.com/spreadsheets/d/1eed1RKE1K3zhI-2CIX62QdV-gGqv0wL4jPG9Ihq5ZMc";
  /* ── clock tick ── */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      setClock(`${pad(now.getHours())} : ${pad(now.getMinutes())} : ${pad(now.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── auth + load user row ── */
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/'); return; }

      const u = session.user;
      setAuthUser(u);

      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', u.id)
        .single();

      if (!user) {
        setNeedsName(true);
      } else {
        console.log('User data from users table:', user);
        setUserRow(user);
      }

      setLoadingUser(false);
    };
    init();
  }, []);

  /* ── fetch projects ── */
  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name', { ascending: true });
      if (error) console.error('fetchProjects error:', error);
      else setProjects(data ?? []);
    };
    fetchProjects();
  }, []);

  /* ── create user after name entry ── */
  const createUser = async () => {
    if (!nameInput.trim()) return;

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email,
        full_name: nameInput.trim(),
      })
      .select()
      .single();

    if (error) { console.error('Error creating user:', error); return; }

    console.log('New user created:', data);
    setUserRow(data);
    setNeedsName(false);
  };

  /* ── fetch logs ── */
  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('work_logs')
      .select('*, projects(project_name)')
      .eq('user', authUser.id)
      .order('date', { ascending: false });
    if (error) console.error('fetchLogs error:', error);
    else setLogs(data ?? []);
  };

  useEffect(() => {
    if (!loadingUser && !needsName) fetchLogs();
  }, [loadingUser, needsName]);

  /* ── flash helper ── */
  const showFlash = (msg, color = '#D4AF37') => {
    setFlash({ msg, color });
    setTimeout(() => setFlash(null), 2500);
  };
const updateSheet = async () => {
  try {
    setIsUpdating(true); // 👈 show "Updating..."

    const BASE_URL =
      window.location.hostname === "localhost"
        ? "http://localhost:3000"
        : "https://titan-dynamics.vercel.app";

    const res = await fetch(`${BASE_URL}/api/updateSheet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_API_KEY}`,
      },
    });

    if (res.ok) {
      showFlash("Sheet updated successfully");

      setIsUpdating(false);
      setIsUpdated(true); // 👈 show "Updated!"

      setTimeout(() => setIsUpdated(false), 2500);
    } else {
      setIsUpdating(false);
      showFlash("Update failed", "#e05a4e");
    }

  } catch (err) {
    setIsUpdating(false);
    console.error(err);
    showFlash("Server error", "#e05a4e");
  }
};
  /* ── submit ── */
  const handleSubmit = async () => {
    const { date, start_time, end_time, project } = form;
    if (!date || !start_time || !end_time) {
      showFlash('Date, clock-in and clock-out are required', '#e05a4e'); return;
    }
    if (end_time <= start_time) {
      showFlash('End time must follow start time', '#e05a4e'); return;
    }
    const total_hours = calcHours(start_time, end_time);
    const { error } = await supabase.from('work_logs').insert([{
      user: authUser.id,
      date,
      start_time,
      end_time,
      total_hours,
      ...(project ? { project: parseInt(project) } : {}),
    }]);
    if (error) { console.error(error); showFlash('Error saving entry', '#e05a4e'); return; }
    showFlash(`Entry recorded — ${total_hours} hrs`);
    setForm(f => ({ ...f, start_time: '', end_time: '', project: '' }));
    fetchLogs();
  };

  /* ── sign out ── */
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  /* ── stats ── */
  const today = new Date().toISOString().split('T')[0];
  const totalHours = logs.reduce((a, l) => a + parseFloat(l.total_hours || '0'), 0);
  const todayCount = logs.filter(l => l.date === today).length;
  const uniqueDays = [...new Set(logs.map(l => l.date))].length;
  const avgHrs = uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : '—';

  const displayName = userRow?.full_name ?? userRow?.name ?? '—';

  /* ── loading ── */
  if (loadingUser) {
    return (
      <div className="td-loading">
        <div className="td-spinner" />
      </div>
    );
  }

  /* ── name setup screen ── */
  if (needsName) {
    return (
      <div className="td-root">
        <div className="td-header">
          <div>
            <div className="td-wordmark">Titan Dynamics</div>
            <div className="td-sub">Workforce Operations System</div>
          </div>
        </div>
        <div className="td-name-screen">
          <div className="td-name-card">
            <div className="td-section-label">First Time Setup</div>
            <p className="td-name-intro">
              Welcome. Enter your full name to complete registration.
            </p>
            <div className="td-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createUser()}
                autoFocus
              />
            </div>
            <button className="td-submit" onClick={createUser}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── dashboard ── */
  return (
    <div className="td-root">
      {/* ── header ── */}
      <div className="td-header">
        <div>
          <div className="td-wordmark">Titan Dynamics</div>
          <div className="td-sub">Workforce Operations System</div>
        </div>
        <div className="td-header-right">
          <div className="td-badge">{clock}</div>
          {userRow && (
            <div className="td-user-info">
              <span className="td-user-name">{displayName}</span>
              <span className="td-user-email">{userRow.email}</span>
            </div>
          )}
          <button className="td-signout" onClick={handleSignOut}>Sign Out</button>
  <button className="td-update" onClick={updateSheet}>
  {isUpdating
    ? "Updating..."
    : isUpdated
      ? "Updated!"
      : "Update in Sheets"}
</button>
<div className="td-sheet-link" onClick={() => window.open(SHEET_URL, "_blank")}>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 242423 333333" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd"><defs><mask id="c"><linearGradient id="a" gradientUnits="userSpaceOnUse" x1="200294" y1="91174.8" x2="200294" y2="176113"><stop offset="0" stop-opacity=".02" stop-color="#fff"/><stop offset="1" stop-opacity=".2" stop-color="#fff"/></linearGradient><path fill="url(#a)" d="M158015 84111h84558v99065h-84558z"/></mask><mask id="e"><radialGradient id="b" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="0" fx="0" fy="0"><stop offset="0" stop-opacity="0" stop-color="#fff"/><stop offset="1" stop-opacity=".098" stop-color="#fff"/></radialGradient><path fill="url(#b)" d="M-150-150h242723v333633H-150z"/></mask><radialGradient id="f" gradientUnits="userSpaceOnUse" cx="9696.85" cy="10000.4" r="166667" fx="9696.85" fy="10000.4"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff"/></radialGradient><linearGradient id="d" gradientUnits="userSpaceOnUse" x1="200294" y1="95125.2" x2="200294" y2="172162"><stop offset="0" stop-color="#263138"/><stop offset="1" stop-color="#263138"/></linearGradient></defs><g fill-rule="nonzero"><path d="M151513 0H22729C10227 0 1 10227 1 22728v287877c0 12505 10227 22728 22728 22728h196966c12505 0 22728-10224 22728-22728V90911l-53028-37880L151513 0z" fill="#0f9c57"/><path d="M60606 162880v109853h121216V162880H60606zm53032 94698H75757v-18938h37881v18938zm0-30301H75757v-18946h37881v18946zm0-30310H75757v-18936h37881v18936zm53030 60611h-37884v-18938h37884v18938zm0-30301h-37884v-18946h37884v18946zm0-30310h-37884v-18936h37884v18936z" fill="#f0f0f0"/><path mask="url(#c)" fill="url(#d)" d="M158165 84261l84258 84245V90911z"/><path d="M151513 0v68184c0 12557 10173 22727 22727 22727h68183L151513 0z" fill="#87cdac"/><path d="M22728 0C10226 0 0 10227 0 22729v1893C0 12123 10227 1894 22728 1894h128784V1H22728z" fill="#fff" fill-opacity=".2"/><path d="M219694 331443H22728C10226 331443 0 321213 0 308715v1890c0 12505 10227 22728 22728 22728h196966c12505 0 22728-10224 22728-22728v-1890c0 12499-10224 22728-22728 22728z" fill="#263138" fill-opacity=".2"/><path d="M174239 90911c-12554 0-22727-10170-22727-22727v1893c0 12557 10173 22727 22727 22727h68183v-1893h-68183z" fill="#263138" fill-opacity=".102"/><path d="M151513 0H22729C10227 0 1 10227 1 22729v287876c0 12505 10227 22728 22728 22728h196966c12505 0 22728-10224 22728-22728V90911L151513 0z" mask="url(#e)" fill="url(#f)"/></g></svg>

  <span>VISIT</span>
</div>
        </div>
      </div>

      {/* ── body ── */}
      <div className="td-body">
        {/* ── left panel: form ── */}
        <div className="td-panel-left">
          <div className="td-section-label">Log Entry</div>

          <div className="td-field">
            <label>Employee</label>
            <div className="td-field-static">{displayName}</div>
          </div>

          <div className="td-field">
            <label>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className="td-time-row">
            <div className="td-field">
              <label>Clock In</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div className="td-field">
              <label>Clock Out</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="td-field">
            <label>Project <span className="td-optional">(optional)</span></label>
            <select
              className="td-select"
              value={form.project}
              onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
            >
              <option value="">— Select a project —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
          </div>

          {form.start_time && form.end_time && form.start_time < form.end_time && (
            <div className="td-preview">
              ⏱ {calcHours(form.start_time, form.end_time)} hrs
            </div>
          )}

          <button className="td-submit" onClick={handleSubmit}>Submit Entry</button>

          {flash && (
            <div className="td-flash" style={{ color: flash.color }}>{flash.msg}</div>
          )}

          <hr className="td-divider" />

          {/* ── stats ── */}
          <div className="td-section-label">Summary</div>
          <div className="td-stats">
            <div className="td-stat">
              <div className="td-stat-val">{logs.length}</div>
              <div className="td-stat-lbl">Entries</div>
            </div>
            <div className="td-stat">
              <div className="td-stat-val">{totalHours.toFixed(1)}</div>
              <div className="td-stat-lbl">Total Hrs</div>
            </div>
            <div className="td-stat">
              <div className="td-stat-val">{todayCount}</div>
              <div className="td-stat-lbl">Today</div>
            </div>
            <div className="td-stat">
              <div className="td-stat-val">{avgHrs}</div>
              <div className="td-stat-lbl">Avg / Day</div>
            </div>
          </div>
        </div>

        {/* ── right panel: table ── */}
        <div className="td-panel-right">
          <div className="td-section-label">Work Log</div>

          <div className="td-table-wrap">
            <table className="td-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td className="td-name">{displayName}</td>
                    <td>{fmtDate(l.date)}</td>
                    <td className="td-project">
                      {l.projects?.project_name
                        ? <span className="td-project-tag">{l.projects.project_name}</span>
                        : <span className="td-muted">—</span>
                      }
                    </td>
                    <td>{fmt12(l.start_time)}</td>
                    <td>{fmt12(l.end_time)}</td>
                    <td className="td-hours">{l.total_hours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className="td-empty">No entries logged</div>
          )}
        </div>
      </div>
    </div>
  );
}