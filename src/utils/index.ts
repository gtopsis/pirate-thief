const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID
const apiKey = import.meta.env.VITE_GOOGLE_SPREADSHEET_API_KEY
const range = import.meta.env.VITE_GOOGLE_SPREADSHEET_API_RANGE

export const jobsListSourceUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`
