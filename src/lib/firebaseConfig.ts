// Fallback Firebase Configuration for SYN-Tracker
export const defaultFirebaseConfig = {
  projectId: "gen-lang-client-0389642675",
  appId: "1:684802988305:web:d03f2c096d8c7722b2d4b0",
  apiKey: "AIzaSyB_-6nLBUXzCim5ukoPTL_wgmt5g4F2Yzs",
  authDomain: "gen-lang-client-0389642675.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-syntrackeronline-d2df4192-9183-490e-8f1d-023382f6c134",
  storageBucket: "gen-lang-client-0389642675.firebasestorage.app",
  messagingSenderId: "684802988305",
  measurementId: "",
  recaptchaSiteKey: ""
};

let resolvedConfig = defaultFirebaseConfig;

try {
  // In Vite / ES modules, we safely attempt to read or provide the config
  const globFn = (import.meta as any).glob;
  if (typeof globFn === 'function') {
    const raw = globFn('../../firebase-applet-config.json', { eager: true });
    const key = Object.keys(raw)[0];
    if (key && (raw[key] as any)?.default) {
      resolvedConfig = (raw[key] as any).default;
    }
  }
} catch {
  resolvedConfig = defaultFirebaseConfig;
}

export const firebaseConfig = resolvedConfig;
export default firebaseConfig;
