import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
// Supabase
// ─────────────────────────────────────────────────────────────

const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  throw new Error("No Supabase key found");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  supabaseKey
);

// ─────────────────────────────────────────────────────────────
// Google Sheets
// ─────────────────────────────────────────────────────────────

function getSheetsClient() {
  console.log(
    "CREDS EXISTS:",
    !!process.env.GOOGLE_CREDENTIALS
  );

  const credentials = JSON.parse(
    process.env.GOOGLE_CREDENTIALS
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

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

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${months[parseInt(mo) - 1]} ${parseInt(day)}, ${y}`;
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  // OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  console.log("---- NEW REQUEST ----");

  // ───────────────────────────────────────────────────────────
  // Auth
  // ───────────────────────────────────────────────────────────

  const auth = req.headers.authorization;

  const token = auth?.split(" ")[1];

  console.log("EXPECTED:", process.env.API_SECRET);
  console.log("TOKEN:", token);

  if (
    !token ||
    token.trim() !== process.env.API_SECRET.trim()
  ) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  console.log("✅ AUTH PASSED");

  try {
    // ─────────────────────────────────────────────────────────
    // 1. Fetch Work Logs
    // ─────────────────────────────────────────────────────────

    const { data: logs, error } = await supabase
      .schema("titan_dynamics")
      .from("work_logs")
      .select(`
        id,
        date,
        start_time,
        end_time,
        total_hours,
        user_id,
        project
      `)
      .order("date", {
        ascending: false,
      });

    if (error) {
      console.log("❌ Logs error:", error);

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    console.log("✅ Logs fetched:", logs.length);

    // ─────────────────────────────────────────────────────────
    // 2. Fetch Users
    // ─────────────────────────────────────────────────────────

    const {
      data: users,
      error: usersError,
    } = await supabase
      .from("users")
      .select(`
        id,
        username,
        email
      `);

    if (usersError) {
      console.log("❌ Users error:", usersError);

      return res.status(500).json({
        success: false,
        error: usersError.message,
      });
    }

    // ─────────────────────────────────────────────────────────
    // 3. Fetch Projects
    // ─────────────────────────────────────────────────────────

    const {
      data: projects,
      error: projectsError,
    } = await supabase
      .schema("titan_dynamics")
      .from("projects")
      .select(`
        id,
        project_name
      `);

    if (projectsError) {
      console.log("❌ Projects error:", projectsError);

      return res.status(500).json({
        success: false,
        error: projectsError.message,
      });
    }

    // ─────────────────────────────────────────────────────────
    // 4. Create Lookup Maps
    // ─────────────────────────────────────────────────────────

    const userMap = Object.fromEntries(
      (users || []).map((u) => [u.id, u])
    );

    const projectMap = Object.fromEntries(
      (projects || []).map((p) => [p.id, p])
    );

    // ─────────────────────────────────────────────────────────
    // 5. Build Rows
    // ─────────────────────────────────────────────────────────

    const header = [
      "Employee",
      "Email",
      "Date",
      "Project",
      "Clock In",
      "Clock Out",
      "Hours",
    ];

    const rows = logs.map((l) => {
      const user = userMap[l.user_id];
      const project = projectMap[l.project];

      return [
        user?.username ?? "—",
        user?.email ?? "—",
        fmtDate(l.date),
        project?.project_name ?? "—",
        fmt12(l.start_time),
        fmt12(l.end_time),
        l.total_hours ?? "—",
      ];
    });

    // ─────────────────────────────────────────────────────────
    // 6. Google Sheets
    // ─────────────────────────────────────────────────────────

    const sheets = getSheetsClient();

    const spreadsheetId = process.env.SHEET_ID;

    console.log(
      "📄 Writing to sheet:",
      spreadsheetId
    );

    // Clear old data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "Sheet1",
    });

    // Write new data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [header, ...rows],
      },
    });

    console.log(
      "✅ Sheet updated:",
      rows.length
    );

    return res.json({
      success: true,
      rowsWritten: rows.length,
    });

  } catch (err) {
    console.log("❌ ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}