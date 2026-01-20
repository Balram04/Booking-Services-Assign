import { useState } from "react";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function BookingHistory({ api }) {
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);

  async function fetchHistory(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEvents([]);

    try {
      const res = await api.history(bookingId);
      setEvents(res?.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content">
      <div className="card">
        <h2>Booking History</h2>
        <div className="muted">Uses: GET /bookings/:id/history</div>

        <form onSubmit={fetchHistory} className="grid2" style={{ marginTop: 12 }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <div className="label">Booking Id</div>
            <input
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="booking _id"
              required
            />
          </div>

          <div className="actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Fetch history"}
            </button>
          </div>
        </form>

        {error ? (
          <div className="jsonBox">
            <div className="jsonTitle">Error</div>
            <pre className="jsonPre">{JSON.stringify(error.payload || { message: error.message }, null, 2)}</pre>
          </div>
        ) : null}

        <hr className="sep" />

        <div className="history">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Old</th>
                <th>New</th>
                <th>By</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    {loading ? "Loading..." : "No events"}
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev._id || ev.timestamp}>
                    <td className="muted">{formatDate(ev.timestamp)}</td>
                    <td>{ev.oldStatus}</td>
                    <td>
                      <strong>{ev.newStatus}</strong>
                    </td>
                    <td>{ev.changedBy}</td>
                    <td className="muted">{ev.note || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
