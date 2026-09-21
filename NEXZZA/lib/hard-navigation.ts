/**
 * Navigate with a full document request while vinext's client router is
 * incompatible with the deployed RSC runtime.
 */
export function hardNavigate(href: string) {
  window.location.href = href;
}
