/**
 * Pluralizes `word` based on `count` using the common English "+s" rule.
 * Good enough for the app's simple domain words (job/jobs); swap for a
 * proper i18n pluralization library if more complex rules are ever needed.
 */
export const pluralize = (count: number, word: string): string => (count === 1 ? word : `${word}s`)
