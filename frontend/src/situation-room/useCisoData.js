/**
 * useCisoData — binds the CISO seat to the real backend, conservatively.
 *
 * Fetches GET /api/ciso/dashboard?role=CISO (the canonical source the legacy
 * CisoSecurityPostureDashboard already uses) and exposes ONLY the fields whose
 * shape is verified against that existing consumer — so we bind real data without
 * fabricating field paths. Everything else stays as the seat's marked-sample copy
 * until the backend exposes a matching shape (see the mismatch notes in chat).
 *
 * Resilient: on any failure/offline it returns null and the seat renders its
 * sample content unchanged. Auth/orgId/api resolved the same way as the rest of app.
 */
import { useEffect, useState } from 'react';

export function apiCtx(props = {}) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export function useCisoData(props = {}) {
  const { token, orgId, api } = apiCtx(props);
  const [d, setD] = useState(null);

  useEffect(() => {
    let alive = true;
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    fetch(`${api}/api/ciso/dashboard?role=CISO&org_id=${encodeURIComponent(orgId)}`, { headers: h })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j) setD(j); })
      .catch(() => { /* offline → sample content */ });
    return () => { alive = false; };
  }, [api, orgId, token]);

  if (!d) return null;
  // Verified-shape fields only (see CisoSecurityPostureDashboard.jsx):
  //   d.generatedAt : ISO string · d.overallPosture : { current, delta, trend, ... }
  return {
    live: d.generatedAt ? new Date(d.generatedAt) : null,
    posture: d.overallPosture && typeof d.overallPosture.current !== 'undefined'
      ? { current: d.overallPosture.current }
      : null,
  };
}
