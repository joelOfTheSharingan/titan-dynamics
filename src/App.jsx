import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase.js';

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500&family=Barlow:wght@300;400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .td-root {
    background: #0a0a12;
    min-height: 100vh;
    font-family: 'Barlow', sans-serif;
    color: #e8e4d8;
    position: relative;
    overflow: hidden;
  }
  .td-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(212,175,55,0.015) 3px, rgba(212,175,55,0.015) 4px);
    pointer-events: none;
    z-index: 0;
  }
  .td-header {
    position: relative; z-index: 1;
    border-bottom: 1px solid #D4AF37;
    padding: 28px 36px 20px;
    display: flex; align-items: flex-end; justify-content: space-between;
  }
  .td-wordmark {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 42px; letter-spacing: 0.08em; color: #D4AF37; line-height: 1;
  }
  .td-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; letter-spacing: 0.25em; color: #7a7460; text-transform: uppercase; margin-top: 4px;
  }
  .td-badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; letter-spacing: 0.2em; color: #7a7460;
    border: 1px solid #2a2820; padding: 6px 14px; text-transform: uppercase;
  }
  .td-body {
    position: relative; z-index: 1;
    display: grid; grid-template-columns: 340px 1fr;
    min-height: calc(100vh - 100px);
  }
  .td-panel-left { border-right: 1px solid #1e1c15; padding: 32px 28px; }
  .td-panel-right { padding: 32px 28px; }
  .td-section-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; letter-spacing: 0.3em; color: #D4AF37;
    text-transform: uppercase; margin-bottom: 20px;
    display: flex; align-items: center; gap: 10px;
  }
  .td-section-label::after {
    content: ''; flex: 1; height: 1px;
    background: linear-gradient(90deg, #2a2820, transparent);
  }
  .td-field { margin-bottom: 16px; }
  .td-field label {
    display: block; font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; letter-spacing: 0.22em; color: #5a5648;
    text-transform: uppercase; margin-bottom: 6px;
  }
  .td-field input {
    width: 100%; background: #0f0e16;
    border: 1px solid #1e1c15; border-bottom: 1px solid #2e2c20;
    color: #e8e4d8; font-family: 'IBM Plex Mono', monospace;
    font-size: 14px; padding: 10px 12px; outline: none;
    transition: border-color 0.15s; color-scheme: dark;
  }
  .td-field input:focus { border-color: #D4AF37; background: #12111a; }
  .td-field input::placeholder { color: #3a3830; }
  .td-time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .td-submit {
    width: 100%; margin-top: 24px;
    background: #D4AF37; color: #0a0a12;
    border: none; font-family: 'Bebas Neue', sans-serif;
    font-size: 18px; letter-spacing: 0.12em; padding: 14px;
    cursor: pointer; transition: background 0.15s, transform 0.1s;
  }
  .td-submit:hover { background: #e8c84a; }
  .td-submit:active { transform: scaleY(0.97); }
  .td-divider { border: none; border-top: 1px solid #1e1c15; margin: 28px 0; }
  .td-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #1e1c15; margin-bottom: 28px; }
  .td-stat { background: #0a0a12; padding: 16px 14px; }
  .td-stat-val { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: #D4AF37; letter-spacing: 0.04em; line-height: 1; }
  .td-stat-lbl { font-family: 'IBM Plex Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: #5a5648; text-transform: uppercase; margin-top: 4px; }
  .td-table-wrap { overflow-x: auto; }
  .td-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .td-table thead tr { border-bottom: 1px solid #D4AF37; }
  .td-table th {
    font-family: 'IBM Plex Mono', monospace; font-size: 8px;
    letter-spacing: 0.28em; color: #D4AF37; text-transform: uppercase;
    padding: 0 12px 12px 0; text-align: left; font-weight: 400;
  }
  .td-table td {
    padding: 13px 12px 13px 0; border-bottom: 1px solid #131210;
    font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #c8c4b4;
  }
  .td-table tbody tr:hover td { background: #0f0e18; color: #e8e4d8; }
  .td-table td.td-name { font-family: 'Barlow', sans-serif; font-size: 13px; font-weight: 500; color: #e8e4d8; }
  .td-table td.td-hours { color: #D4AF37; font-weight: 500; }
  .td-empty {
    text-align: center; padding: 48px 0;
    font-family: 'IBM Plex Mono', monospace; font-size: 11px;
    letter-spacing: 0.15em; color: #3a3830; text-transform: uppercase;
  }
  .td-flash {
    font-family: 'IBM Plex Mono', monospace; font-size: 10px;
    letter-spacing: 0.2em; text-transform: uppercase;
    text-align: center; padding: 10px;
    border: 1px solid #2a2820; margin-top: 12px;
  }
  @media (max-width: 700px) {
    .td-body { grid-template-columns: 1fr; }
    .td-panel-left { border-right: none; border-bottom: 1px solid #1e1c15; }
    .td-header { padding: 20px 20px 16px; }
    .td-panel-left, .td-panel-right { padding: 24px 20px; }
    .td-wordmark { font-size: 32px; }
  }
`;

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
  return ((e - s) / 3600000).toFixed(2);
}

export default function App() {
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ name: '', date: new Date().toISOString().split('T')[0], start_time: '', end_time: '' });
  const [clock, setClock] = useState('');
  const [flash, setFlash] = useState(null); // { msg, color }

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = globalStyles;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setClock(`${h} : ${m} : ${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase.from('work_logs').select('*').order('date', { ascending: false });
    if (error) console.error(error);
    else setLogs(data);
  };

  useEffect(() => { fetchLogs(); }, []);

  const showFlash = (msg, color = '#D4AF37') => {
    setFlash({ msg, color });
    setTimeout(() => setFlash(null), 2500);
  };

  const handleSubmit = async () => {
    const { name, date, start_time, end_time } = form;
    if (!name || !date || !start_time || !end_time) {
      showFlash('All fields required', '#e05a4e'); return;
    }
    if (end_time <= start_time) {
      showFlash('End time must follow start', '#e05a4e'); return;
    }
    const total_hours = calcHours(start_time, end_time);
    const { error } = await supabase.from('work_logs').insert([{ name, date, start_time, end_time, total_hours }]);
    if (error) { console.error(error); showFlash('Error saving entry', '#e05a4e'); return; }
    showFlash(`Entry recorded — ${total_hours} hrs`);
    setForm(f => ({ ...f, name: '', start_time: '', end_time: '' }));
    fetchLogs();
  };

  const today = new Date().toISOString().split('T')[0];
  const totalHours = logs.reduce((a, l) => a + parseFloat(l.total_hours || 0), 0);
  const todayCount = logs.filter(l => l.date === today).length;
  const uniqueDays = [...new Set(logs.map(l => l.date))].length;
  const avgHrs = uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : '—';

  return (
    <div className="td-root">
      <div className="td-header">
        <div>
          <div className="td-wordmark">Titan Dynamics</div>
          <div className="td-sub">Workforce Operations System</div>
        </div>
        <div className="td-badge">{clock}</div>
      </div>

      <div className="td-body">
        <div className="td-panel-left">
          <div className="td-section-label">Log Entry</div>

          <div className="td-field">
            <label>Employee Name</label>
            <input type="text" placeholder="Full name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="td-field">
            <label>Date</label>
            <input type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="td-time-row">
            <div className="td-field">
              <label>Clock In</label>
              <input type="time" value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="td-field">
              <label>Clock Out</label>
              <input type="time" value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>

          <button className="td-submit" onClick={handleSubmit}>Submit Entry</button>
          {flash && (
            <div className="td-flash" style={{ color: flash.color }}>{flash.msg}</div>
          )}

          <hr className="td-divider" />

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
              <div className="td-stat-lbl">Avg Hrs/Day</div>
            </div>
          </div>
        </div>

        <div className="td-panel-right">
          <div className="td-section-label">Work Log</div>
          <div className="td-table-wrap">
            <table className="td-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td className="td-name">{l.name}</td>
                    <td>{fmtDate(l.date)}</td>
                    <td>{fmt12(l.start_time)}</td>
                    <td>{fmt12(l.end_time)}</td>
                    <td className="td-hours">{l.total_hours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && <div className="td-empty">No entries logged</div>}
        </div>
      </div>
    </div>
  );
}