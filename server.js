import "dotenv/config";
import express from "express";
import cors from "cors";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

// ── clients ──────────────────────────────────────────────────────────────────

const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) throw new Error("No Supabase key found — add SUPABASE_ANON_KEY to .env");

const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// ── auth middleware ───────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${process.env.API_SECRET}`) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt12(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDate(d) {
  if (!d) return "—";
  const [y, mo, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(mo) - 1]} ${parseInt(day)}, ${y}`;
}

// ── POST /api/updateSheet ─────────────────────────────────────────────────────

app.post("/api/updateSheet", requireAuth, async (req, res) => {
  try {
    // 1. Fetch all work logs joined with user + project names
    const { data: logs, error } = await supabase
      .from("work_logs")
      .select(`
        id,
        date,
        start_time,
        end_time,
        total_hours,
        users ( full_name, email ),
        projects ( project_name )
      `)
      .order("date", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // 2. Build sheet rows
    const header = [
      "Employee", "Email", "Date", "Project", "Clock In", "Clock Out", "Hours"
    ];

    const rows = logs.map((l) => [
      l.users?.full_name   ?? "—",
      l.users?.email       ?? "—",
      fmtDate(l.date),
      l.projects?.project_name ?? "—",
      fmt12(l.start_time),
      fmt12(l.end_time),
      l.total_hours        ?? "—",
    ]);

    // 3. Write to sheet: clear first, then write header + rows
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.SHEET_ID;
    const range = "Sheet1!A1";

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "Sheet1",
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [header, ...rows],
      },
    });

    // 4. Bold the header row
    const { data: sheetMeta } = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = sheetMeta.sheets[0].properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.13, green: 0.13, blue: 0.13 },
                },
              },
              fields: "userEnteredFormat(textFormat,backgroundColor)",
            },
          },
        ],
      },
    });

    console.log(`✓ Sheet updated — ${rows.length} rows written`);
    return res.json({ success: true, rowsWritten: rows.length });

  } catch (err) {
    console.error("updateSheet error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));