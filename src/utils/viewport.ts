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
