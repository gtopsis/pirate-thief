export const jobsListUrl =
  'https://docs.google.com/spreadsheets/d/1s8XLKx-D23jEBM-LifstRFWX2Zj6Lv98twNxObHeXjQ/edit?gid=2008238165#gid=2008238165'

// Shared so the branding (AppHero) and the "Fetched X ago" freshness
// indicator (useLastUpdatedText) both credit the same source name
// consistently. The actual fetch/parsing for this source lives in
// src/sources/googleSheets -- this is just the display name.
export const jobsSourceName = 'Startup Pirate'
