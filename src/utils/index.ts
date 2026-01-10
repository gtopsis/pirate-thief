const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID
const apiKey = import.meta.env.VITE_GOOGLE_SPREADSHEET_API_KEY
const range = import.meta.env.VITE_GOOGLE_SPREADSHEET_API_RANGE

export const jobsListUrl = 'https://docs.google.com/spreadsheets/d/1s8XLKx-D23jEBM-LifstRFWX2Zj6Lv98twNxObHeXjQ/edit?gid=2008238165#gid=2008238165'

export const jobsListApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`
