export const jobsListUrl =
  'https://docs.google.com/spreadsheets/d/1s8XLKx-D23jEBM-LifstRFWX2Zj6Lv98twNxObHeXjQ/edit?gid=2008238165#gid=2008238165'

// The public job list this app aggregates its data from -- shared so the
// branding (AppHero) and the "Fetched X ago" freshness indicator
// (useLastUpdatedText) both credit the same source name consistently.
// (The actual fetch endpoint/parsing for this source lives in
// src/sources/googleSheets, not here -- this is just the human-facing
// "view the source" link and its display name.)
export const jobsSourceName = 'Startup Pirate'
