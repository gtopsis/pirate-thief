import { onMounted, onUnmounted } from 'vue'

export interface KeyboardShortcut {
  /** Lowercase key, matched against `event.key.toLowerCase()` (e.g. 'r', 'escape'). */
  key: string
  /**
   * Whether Alt must (`true`) or must not (`false`) be held for this
   * shortcut to fire. Left `undefined` to ignore Alt's state entirely
   * (e.g. a named key like Escape -- see the WCAG note below).
   */
  altKey?: boolean
  /** Skips this shortcut (without matching a later one with the same key) when it returns false. */
  isEnabled?: () => boolean
  handler: () => void
}

/**
 * Registers global keydown shortcuts for the lifetime of the calling
 * component, ignoring keystrokes while typing in an input/textarea.
 * Letter-key shortcuts (e.g. 'r', 'h') should require Alt so they're
 * exempt from WCAG 2.1.4 (Character Key Shortcuts), which applies only to
 * shortcuts using nothing but a bare letter/punctuation/number/symbol
 * key -- named keys like Escape aren't covered and can be left bare.
 */
export const useKeyboardShortcuts = (shortcuts: readonly KeyboardShortcut[]): void => {
  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return
    }

    const key = event.key.toLowerCase()

    for (const shortcut of shortcuts) {
      if (shortcut.key !== key) continue
      if (shortcut.altKey !== undefined && shortcut.altKey !== event.altKey) continue
      if (shortcut.isEnabled && !shortcut.isEnabled()) continue

      shortcut.handler()
      break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
