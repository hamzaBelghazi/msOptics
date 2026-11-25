// One tiny store shared by the axios interceptors and the admin loading bar.
// Every admin request (and every admin route change) bumps the counter while
// it is in flight; the bar stays up until the counter is back to zero.

const SHOW_DELAY = 120; // ms to wait before showing, so quick calls don't flash

let pending = 0;
let showTimer = null;
let visible = false;
const listeners = new Set();

const publish = () => {
  listeners.forEach((listener) => listener(visible));
};

export const subscribeAdminLoading = (listener) => {
  listeners.add(listener);
  listener(visible); // keep late subscribers (mount after the change) in sync
  return () => {
    listeners.delete(listener);
  };
};

export const startAdminLoading = () => {
  pending += 1;
  if (pending !== 1 || visible || showTimer) return;
  showTimer = setTimeout(() => {
    showTimer = null;
    visible = true;
    publish();
  }, SHOW_DELAY);
};

export const stopAdminLoading = () => {
  pending = Math.max(0, pending - 1);
  if (pending > 0) return;
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (!visible) return;
  visible = false;
  publish();
};

// Used when leaving the admin area so a dropped request can never pin the bar.
export const resetAdminLoading = () => {
  pending = 0;
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (!visible) return;
  visible = false;
  publish();
};
