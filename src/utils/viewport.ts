// Matches Tailwind's default `md` breakpoint, used throughout the app's
// templates (e.g. `md:hidden`, `hidden md:flex`) to switch between the
// mobile bottom-sheet layout and the desktop sidebar layout.
const MOBILE_MEDIA_QUERY = '(max-width: 767px)'

/**
 * Whether the viewport currently matches the app's mobile layout (below
 * the `md` breakpoint) -- i.e. the bottom-sheet UI is in use instead of
 * the desktop sidebar.
 */
export const isMobileViewport = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
    : false

/**
 * Calls `onChange` whenever the viewport crosses the mobile/desktop
 * breakpoint (not on every resize -- only when the match actually
 * flips), so callers can keep a reactive "is this mobile right now"
 * value in sync. Returns an unsubscribe function; a no-op subscription
 * (never calls back) in environments without `matchMedia`.
 */
export const watchMobileViewport = (onChange: (isMobile: boolean) => void): (() => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {
      // No-op: nothing was subscribed, so there's nothing to unsubscribe.
    }
  }

  const query = window.matchMedia(MOBILE_MEDIA_QUERY)
  const handleChange = (event: MediaQueryListEvent): void => {
    onChange(event.matches)
  }

  query.addEventListener('change', handleChange)
  return () => {
    query.removeEventListener('change', handleChange)
  }
}
