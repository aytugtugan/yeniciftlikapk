/**
 * Simple event emitter for auth events (token expiry, forced logout).
 * API layers call onTokenExpired() on 401; App.js listens and resets state.
 */

let _listener = null;

export function setTokenExpiredListener(fn) {
  _listener = fn;
}

export function onTokenExpired() {
  if (_listener) _listener();
}
