import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";

type Incident = {
  id: string;
  user_id: string;
  occurred_at: string;
  reported_at: string | null;
  ip_address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  platform: string | null;
  incident_status: "reported" | "investigating" | "resolved" | "false_positive";
  admin_notes: string | null;
  reviewed_at: string | null;
  admin_notified_at: string | null;
};

const statusLabels: Record<Incident["incident_status"], string> = {
  reported: "New report",
  investigating: "Investigating",
  resolved: "Resolved",
  false_positive: "False positive",
};

const LoginSecurityIncidents = () => {
  const { user } = useAuth();
  const { loading: roleLoading, isAdmin } = useAdminRole();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, Incident["incident_status"]>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadIncidents = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    const { data, error: queryError } = await (supabase as any)
      .from("login_security_events")
      .select("id,user_id,occurred_at,reported_at,ip_address,city,region,country,device_type,browser,platform,incident_status,admin_notes,reviewed_at,admin_notified_at")
      .not("reported_at", "is", null)
      .order("reported_at", { ascending: false })
      .limit(100);
    if (queryError) setError("Could not load security incidents. Check admin permissions and try again.");
    else {
      const rows = (data || []) as Incident[];
      setIncidents(rows);
      setNotes(Object.fromEntries(rows.map((row) => [row.id, row.admin_notes || ""])));
      setStatuses(Object.fromEntries(rows.map((row) => [row.id, row.incident_status || "reported"])));
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { void loadIncidents(); }, [loadIncidents]);

  const saveIncident = async (incident: Incident) => {
    if (!user || !isAdmin) return;
    setSavingId(incident.id);
    setError("");
    setNotice("");
    const status = statuses[incident.id] || "reported";
    const isClosed = status === "resolved" || status === "false_positive";
    const { error: saveError } = await (supabase as any)
      .from("login_security_events")
      .update({
        incident_status: status,
        admin_notes: (notes[incident.id] || "").trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        resolved_at: isClosed ? new Date().toISOString() : null,
      })
      .eq("id", incident.id);
    if (saveError) setError("Could not save this incident. Please try again.");
    else {
      setNotice("Incident updated.");
      await loadIncidents();
    }
    setSavingId(null);
  };

  if (roleLoading) return <div className="p-6">Checking administrator access…</div>;
  if (!isAdmin) return <div className="p-6"><h1 className="text-xl font-semibold">Administrator access required</h1><p className="mt-2 text-muted-foreground">Only full MALPINOHDISTRO administrators can review security incidents.</p></div>;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Security centre</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Login security incidents</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Review logins that account owners reported as unrecognized. Verify the details and document the action taken. A report alone is not proof of compromise.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["reported", "investigating", "resolved", "false_positive"] as const).map((status) => (
          <div key={status} className="rounded-xl border bg-card p-4">
            <div className="text-2xl font-semibold">{incidents.filter((item) => item.incident_status === status).length}</div>
            <div className="text-sm text-muted-foreground">{statusLabels[status]}</div>
          </div>
        ))}
      </div>
      {error && <div role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-lg border p-3 text-sm">{notice}</div>}
      {loading ? <div className="rounded-xl border p-6">Loading reported logins…</div> :
        incidents.length === 0 ? <div className="rounded-xl border p-8 text-center"><h2 className="font-semibold">No reported incidents</h2><p className="mt-2 text-sm text-muted-foreground">New “This wasn’t me” reports will appear here.</p></div> :
        <div className="space-y-4">
          {incidents.map((incident) => (
            <article key={incident.id} className="space-y-4 rounded-xl border bg-card p-4 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Reported login</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Incident ID: {incident.id}</p>
                </div>
                <span className="rounded-full border px-3 py-1 text-xs font-medium">{statusLabels[statuses[incident.id] || incident.incident_status]}</span>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div><dt className="text-muted-foreground">Account user ID</dt><dd className="break-all font-medium">{incident.user_id}</dd></div>
                <div><dt className="text-muted-foreground">Login time (UTC)</dt><dd>{new Date(incident.occurred_at).toLocaleString()}</dd></div>
                <div><dt className="text-muted-foreground">Report received</dt><dd>{incident.reported_at ? new Date(incident.reported_at).toLocaleString() : "—"}</dd></div>
                <div><dt className="text-muted-foreground">Platform / device</dt><dd>{incident.platform || "Unknown"} · {incident.device_type || "Unknown"}</dd></div>
                <div><dt className="text-muted-foreground">Browser</dt><dd>{incident.browser || "Unknown"}</dd></div>
                <div><dt className="text-muted-foreground">IP address</dt><dd>{incident.ip_address || "Unavailable"}</dd></div>
                <div className="sm:col-span-2 lg:col-span-3"><dt className="text-muted-foreground">Estimated location</dt><dd>{[incident.city, incident.region, incident.country].filter(Boolean).join(", ") || "Unavailable"}</dd></div>
                <div><dt className="text-muted-foreground">Admin email notification</dt><dd>{incident.admin_notified_at ? "Sent" : "Not confirmed"}</dd></div>
              </dl>
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <label className="space-y-2 text-sm font-medium">Incident status
                  <select className="w-full rounded-md border bg-background px-3 py-2" value={statuses[incident.id] || incident.incident_status} onChange={(e) => setStatuses((prev) => ({ ...prev, [incident.id]: e.target.value as Incident["incident_status"] }))}>
                    {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">Investigation notes
                  <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 font-normal" value={notes[incident.id] || ""} onChange={(e) => setNotes((prev) => ({ ...prev, [incident.id]: e.target.value }))} placeholder="Record what was checked and what action was taken…" />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-xs text-muted-foreground">Recommended: verify with the account owner, advise a password reset, review sessions, and only revoke sessions or restrict access when justified.</p>
                <button type="button" disabled={savingId === incident.id} onClick={() => void saveIncident(incident)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{savingId === incident.id ? "Saving…" : "Save investigation"}</button>
              </div>
            </article>
          ))}
        </div>
      }
      <div className="flex justify-end"><button type="button" onClick={() => void loadIncidents()} className="rounded-md border px-4 py-2 text-sm">Refresh incidents</button></div>
    </main>
  );
};

export default LoginSecurityIncidents;
