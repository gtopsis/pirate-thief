/**
 * Pluralizes `word` based on `count` using the common English "+s" rule.
 * Good enough for the app's simple domain words (job/jobs); swap for a
 * proper i18n pluralization library if more complex rules are ever needed.
 */
export const pluralize = (count: number, word: string): string => (count === 1 ? word : `${word}s`)

/**
 * The single, canonical "how many jobs am I looking at" label -- a plain
 * total of everything matching the current search/filters, deliberately
 * not narrowed by the map's viewport/focus and not split into a "shown
 * vs. total" ratio (the remote/unmappable subsets are called out
 * separately, see JobCountNotice usages in JobPanel.vue).
 */
export const formatJobCountText = (count: number): string => `${count} ${pluralize(count, 'job')}`
