// Minimal stubs to replace Firebase functionality after removal.
// These functions intentionally throw or return neutral values so the
// rest of the app can run without Firebase. Adjust to your preferred
// authentication or API backend.

export const loginUser = async () => {
  return Promise.reject(new Error('Firebase removed: login not available'));
};

export const registerUser = async () => {
  return Promise.reject(new Error('Firebase removed: register not available'));
};

export const resetPassword = async () => {
  return Promise.reject(new Error('Firebase removed: reset not available'));
};

export const signInWithGoogle = async () => {
  return Promise.reject(new Error('Firebase removed: Google signin not available'));
};

export const sendVerificationEmail = async () => {
  return Promise.reject(new Error('Firebase removed: send verification not available'));
};

export const signOut = async () => {
  // no-op sign out
  return Promise.resolve();
};

export const subscribeToAuthChanges = (cb) => {
  // Immediately call back with null (no user). Return unsubscribe.
  if (typeof cb === 'function') cb(null);
  return () => {};
};

export default {};
