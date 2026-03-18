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
    const res = await fetch('http://localhost:3000/api/updateSheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer supersecret123'
      }
    });

    const data = await res.json();

    if (data.success) {
      showFlash('Sheet updated successfully');
    } else {
      showFlash('Update failed', '#e05a4e');
    }
  } catch (err) {
    console.error(err);
    showFlash('Server error', '#e05a4e');
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
  Update in Sheets
</button>
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