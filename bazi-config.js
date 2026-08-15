// Safe public runtime defaults. Local development mode is used until Supabase values are configured.
// IMPORTANT: only place a browser-safe publishable/anon key here. Never use a service_role key client-side.
window.BAZI_CONFIG = window.BAZI_CONFIG || {
  supabaseUrl: '',
  supabaseAnonKey: '',
  organizationId: '',
  mode: 'local'
};
