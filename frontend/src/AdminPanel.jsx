import { useState } from "react";

const STATUSES = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];

export default function AdminPanel({ api }) {
  const [bookingId, setBookingId] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [providerId, setProviderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.adminOverride(bookingId, {
        status,
        providerId: providerId === "" ? undefined : providerId,
      });
      setResult(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content">
      <div className="card">
        <h2>Admin Panel</h2>
        <div className="muted">Uses: POST /admin/bookings/:id/override</div>

        <form onSubmit={onSubmit} className="grid2" style={{ marginTop: 12 }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <div className="label">Booking Id</div>
            <input
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="booking _id"
              required
            />
          </div>

          <div className="field">
            <div className="label">Force Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <div className="label">Provider Id (optional)</div>
            <input
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              placeholder="leave empty to keep as-is"
            />
          </div>

          <div className="actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Override"}
            </button>
          </div>
        </form>

        {error ? (
          <div className="jsonBox">
            <div className="jsonTitle">Error</div>
            <pre className="jsonPre">{JSON.stringify(error.payload || { message: error.message }, null, 2)}</pre>
          </div>
        ) : null}

        {result ? (
          <div className="jsonBox">
            <div className="jsonTitle">Response</div>
            <pre className="jsonPre">{JSON.stringify(result, null, 2)}</pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
