import { supabaseConfigured } from '../lib/supabase'

// Honest, unmissable demo banner. Shown app-wide whenever no Supabase backend is
// wired (`supabaseConfigured === false`) — i.e. the whole app is running on
// sample data: file uploads are recorded by name only (no cloud storage) and
// connectors are simulated (no live API calls). It disappears automatically the
// moment a backend is connected.
export default function DemoBanner() {
  if (supabaseConfigured) return null
  return (
    <div className="demobar" role="status">
      <span className="demobar-tag">DEMO</span>
      <span className="demobar-msg">
        No backend connected — running on <b>sample data</b>. File uploads aren’t stored and connectors don’t call live APIs.
        Connect a Supabase backend to go live (uploads → cloud storage, connectors → real vendor APIs). See <code>docs/PRODUCTION_SETUP.md</code>.
      </span>
    </div>
  )
}
