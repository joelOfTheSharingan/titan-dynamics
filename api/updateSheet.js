import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

// ── Supabase ─────────────────────────────────────────────────────

const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) throw new Error("No Supabase key found");

const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

// ── Google Sheets ────────────────────────────────────────────────

function getSheetsClient() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  console.log("RAW KEY LENGTH:", rawKey?.length);
  console.log("RAW KEY START:", rawKey?.slice(0, 30));
  console.log("RAW KEY END:", rawKey?.slice(-30));

  const privateKey = rawKey
    ?.replace(/\\n/g, "\n")
    ?.replace(/\r/g, "")
    ?.trim();

  console.log("FORMATTED START:", privateKey?.slice(0, 30));
  console.log("FORMATTED END:", privateKey?.slice(-30));

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

// ── Helpers ──────────────────────────────────────────────────────

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

// ── Handler ──────────────────────────────────────────────────────

export default async function handler(req, res) {
  
 if (req.method !== "POST") {
    console.log("❌ Wrong method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("---- NEW REQUEST ----");

  const auth = req.headers.authorization;

const token = auth?.split(" ")[1]; // extract token after "Bearer"

console.log("EXPECTED:", process.env.API_SECRET);
console.log("TOKEN:", token);

if (!token || token.trim() !== process.env.API_SECRET.trim()) {
  console.log("❌ AUTH FAILED");
  return res.status(401).json({ success: false, error: "Unauthorized" });
}

console.log("✅ AUTH PASSED");
  try {
    // 1. Fetch data
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
      console.log("❌ Supabase error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log("✅ Logs fetched:", logs.length);

    // 2. Format rows
    const header = [
      "Employee", "Email", "Date", "Project", "Clock In", "Clock Out", "Hours"
    ];

    const rows = logs.map((l) => [
      l.users?.full_name ?? "—",
      l.users?.email ?? "—",
      fmtDate(l.date),
      l.projects?.project_name ?? "—",
      fmt12(l.start_time),
      fmt12(l.end_time),
      l.total_hours ?? "—",
    ]);

    // 3. Update Google Sheet
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.SHEET_ID;

    console.log("📄 Writing to sheet:", spreadsheetId);

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "Sheet1",
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [header, ...rows],
      },
    });

    console.log("✅ Sheet updated:", rows.length);

    return res.json({ success: true, rowsWritten: rows.length });

  } catch (err) {
    console.log("❌ ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}