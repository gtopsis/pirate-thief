/**
 * Pluralizes `word` based on `count` using the common English "+s" rule.
 * Good enough for the app's simple domain words (job/jobs); swap for a
 * proper i18n pluralization library if more complex rules are ever needed.
 */
export const pluralize = (count: number, word: string): string => (count === 1 ? word : `${word}s`)

/**
 * Builds the single, canonical "how many jobs am I looking at" label --
 * shared by every place that needs to communicate this (the mobile
 * bottom sheet's persistent handle and the desktop sidebar), so there's
 * exactly one such message on screen, worded one way, instead of
 * multiple similar-but-not-quite-identical ones.
 *
 * A plain total of everything matching the current search/filters --
 * deliberately not narrowed by the map's viewport/focus, and deliberately
 * not split into a "shown vs. total" ratio: the remote and
 * couldn't-be-placed subsets are called out as their own separate,
 * plainly-worded lines right below this one (see RemoteJobsNotice/
 * UnmappedLocationsNotice), so every number involved is stated outright
 * instead of one being implied by a comparison.
 */
export const formatJobCountText = (count: number): string => `${count} ${pluralize(count, 'job')}`
