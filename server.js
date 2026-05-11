import "dotenv/config";
import express from "express";
import cors from "cors";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// ─────────────────────────────────────────────────────────────
// Supabase
// ─────────────────────────────────────────────────────────────

const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  throw new Error(
    "No Supabase key found — add SUPABASE_ANON_KEY to .env"
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  supabaseKey
);

// ─────────────────────────────────────────────────────────────
// Google Sheets
// ─────────────────────────────────────────────────────────────

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
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
// Auth Middleware
// ─────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || auth !== `Bearer ${process.env.API_SECRET}`) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  next();
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
// POST /api/updateSheet
// ─────────────────────────────────────────────────────────────

app.post("/api/updateSheet", requireAuth, async (req, res) => {
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
      console.error("Supabase logs error:", error);

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    // ─────────────────────────────────────────────────────────
    // 2. Fetch Users
    // ─────────────────────────────────────────────────────────

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select(`
        id,
        username,
        email
      `);

    if (usersError) {
      console.error("Supabase users error:", usersError);

      return res.status(500).json({
        success: false,
        error: usersError.message,
      });
    }

    // ─────────────────────────────────────────────────────────
    // 3. Fetch Projects
    // ─────────────────────────────────────────────────────────

    const { data: projects, error: projectsError } = await supabase
      .schema("titan_dynamics")
      .from("projects")
      .select(`
        id,
        project_name
      `);

    if (projectsError) {
      console.error("Supabase projects error:", projectsError);

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
    // 5. Build Sheet Rows
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

    // Clear old sheet
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

    // ─────────────────────────────────────────────────────────
    // 7. Header Styling
    // ─────────────────────────────────────────────────────────

    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetId =
      sheetMeta.data.sheets[0].properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },

              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                  },

                  backgroundColor: {
                    red: 0.13,
                    green: 0.13,
                    blue: 0.13,
                  },
                },
              },

              fields:
                "userEnteredFormat(textFormat,backgroundColor)",
            },
          },
        ],
      },
    });

    console.log(
      `✓ Sheet updated — ${rows.length} rows written`
    );

    return res.json({
      success: true,
      rowsWritten: rows.length,
    });
  } catch (err) {
    console.error("updateSheet error:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});