import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

export default async function handler(req, res) {
  try {
    // 🔐 Basic protection
    if (req.headers.authorization !== `Bearer ${process.env.SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // 📊 Fetch joined data
    const { data, error } = await supabase
      .from('work_logs')
      .select(`
        *,
        users(full_name, email),
        projects(project_name)
      `)
      .order('created_at', { ascending: true })

    if (error) throw error

    // 🧱 Build sheet rows
    const rows = [
      [
        "User ID",
        "Name",
        "Email",
        "Date",
        "Start Time",
        "End Time",
        "Total Hours",
        "Project",
        "Notes",
        "Created At"
      ],
      ...data.map(row => [
        row.user,
        row.users?.full_name || '',
        row.users?.email || '',
        row.date,
        row.start_time,
        row.end_time,
        row.total_hours,
        row.projects?.project_name || '',
        '', // Notes (you don’t have yet)
        row.created_at
      ])
    ]

    const sheets = google.sheets({
      version: 'v4',
      auth: await auth.getClient(),
    })

    // ✍️ Write to Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}