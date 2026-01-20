import { useEffect, useMemo, useState } from "react";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function ProviderJobs({ api }) {
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jobs, setJobs] = useState([]);

  const selectedProvider = useMemo(
    () => providers.find((p) => p._id === providerId) || null,
    [providers, providerId]
  );

  async function loadProviders() {
    const res = await api.listProviders();
    const list = res?.data || [];
    setProviders(list);
    if (!providerId && list.length > 0) setProviderId(list[0]._id);
  }

  async function loadJobs() {
    if (!providerId) return;
    const res = await api.listProviderBookings(providerId, { status: "ASSIGNED" });
    setJobs(res?.data || []);
  }

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      await loadProviders();
      await loadJobs();
    } catch (err) {
      setError(err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadJobs();
      } catch (err) {
        setError(err);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  async function runAction(name, fn) {
    try {
      setLoading(true);
      setError(null);
      await fn();
      await loadJobs();
    } catch (err) {
      err.action = name;
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content">
      <div className="card">
        <h2>My Assigned Jobs</h2>

        <div className="grid2">
          <div className="field">
            <div className="labelRow">
              <div className="label">Provider</div>
              <div className="hint">Pick who is logged in</div>
            </div>
            <select value={providerId} onChange={(e) => setProviderId(e.target.value)}>
              {providers.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.serviceType}) {p.isAvailable ? "• available" : "• busy"}
                </option>
              ))}
            </select>
          </div>

          <div className="actions">
            <button onClick={refreshAll} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="jsonBox">
            <div className="jsonTitle">Error{error.action ? ` (${error.action})` : ""}</div>
            <pre className="jsonPre">{JSON.stringify(error.payload || { message: error.message }, null, 2)}</pre>
          </div>
        ) : null}

        <hr className="sep" />

        {jobs.length === 0 ? (
          <div className="muted">{loading ? "Loading..." : "No assigned jobs"}</div>
        ) : (
          <div className="cards">
            {jobs.map((b) => (
              <div key={b._id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div>
                      <strong>Service:</strong> {b.serviceType}
                    </div>
                    <div>
                      <strong>Customer:</strong> {b.customerId}
                    </div>
                    <div>
                      <strong>Status:</strong> {b.status}
                    </div>
                    <div className="muted">Created: {formatDate(b.createdAt)}</div>
                  </div>

                  <div className="actions">
                    <button
                      onClick={() =>
                        runAction("accept", async () => {
                          await api.respond(b._id, { accept: true, providerId });
                        })
                      }
                      disabled={loading || !selectedProvider}
                    >
                      ✅ Accept
                    </button>

                    <button
                      onClick={() =>
                        runAction("reject", async () => {
                          await api.respond(b._id, { accept: false, providerId });
                        })
                      }
                      disabled={loading || !selectedProvider}
                    >
                      ❌ Reject
                    </button>

                    <button
                      onClick={() => {
                        window.alert(JSON.stringify(b, null, 2));
                      }}
                      disabled={loading}
                    >
                      👀 View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
