/** Dispatched after login/logout so client nav can refresh auth state. */
export const AUTH_CHANGED_EVENT = "perfecto-auth-changed";

export function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}
