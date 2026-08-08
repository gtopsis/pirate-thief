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
 * exactly one such message on screen at a time instead of two
 * differently-worded ones saying almost the same thing.
 *
 * Only spells out "N of M" when the list is actually narrower than the
 * total matches (i.e. the current map focus/search/filters are hiding
 * some of them) -- when they're equal, "N jobs" adds nothing over that.
 */
export const formatJobCountText = (shown: number, total: number): string =>
  shown === total ? `${shown} ${pluralize(shown, 'job')}` : `Showing ${shown} of ${total} jobs`
