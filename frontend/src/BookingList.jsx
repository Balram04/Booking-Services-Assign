import { useEffect, useMemo, useState } from "react";

const STATUSES = [
  "",
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", { 
    month: "short", 
    day: "numeric", 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

function getStatusColor(status) {
  const colors = {
    PENDING: "#FFA500",
    ASSIGNED: "#1E90FF",
    IN_PROGRESS: "#9370DB",
    COMPLETED: "#32CD32",
    CANCELLED: "#DC143C",
    FAILED: "#FF4500",
  };
  return colors[status] || "#888";
}

export default function BookingList({ api }) {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);

  const query = useMemo(
    () => ({ status: status || undefined }),
    [status]
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listBookings(query);
      setData(res?.data || []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function runAction(name, fn) {
    if (!window.confirm(`Are you sure you want to ${name} this booking?`)) return;
    try {
      setLoading(true);
      setError(null);
      await fn();
      await refresh();
    } catch (err) {
      err.action = name;
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  function canCancel(booking) {
    return ["PENDING", "ASSIGNED"].includes(booking.status);
  }

  function canComplete(booking) {
    return booking.status === "IN_PROGRESS";
  }

  function canFail(booking) {
    return !["COMPLETED", "CANCELLED", "FAILED"].includes(booking.status);
  }

  return (
    <div className="content">
      <div className="card">
        <div className="cardHeader">
          <h2>All Bookings</h2>
          <button onClick={refresh} disabled={loading} className="btnRefresh">
            {loading ? "⏳ Loading..." : "🔄 Refresh"}
          </button>
        </div>

        <div className="filterRow">
          <div className="field">
            <label className="label">Filter by Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s || "all"} value={s}>
                  {s || "All Statuses"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="errorBox">
            <strong>❌ Error{error.action ? ` (${error.action})` : ""}</strong>
            <div className="errorMessage">{error.payload?.message || error.message}</div>
          </div>
        )}

        <div className="tableWrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Service</th>
                <th>Status</th>
                <th>Provider ID</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="emptyState">
                    {loading ? "⏳ Loading bookings..." : "📭 No bookings found"}
                  </td>
                </tr>
              ) : (
                data.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <code className="customerId">{b.customerId}</code>
                    </td>
                    <td>
                      <span className="serviceType">{b.serviceType}</span>
                    </td>
                    <td>
                      <span 
                        className="statusBadge" 
                        style={{ backgroundColor: getStatusColor(b.status) }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="muted">
                      {b.providerId ? <code>{String(b.providerId).slice(-8)}</code> : "-"}
                    </td>
                    <td className="muted">{formatDate(b.createdAt)}</td>
                    <td>
                      <div className="actionBtns">
                        {canComplete(b) && (
                          <button
                            onClick={() => runAction("complete", () => api.complete(b._id))}
                            disabled={loading}
                            className="btnSuccess"
                            title="Mark as completed"
                          >
                            ✓ Complete
                          </button>
                        )}

                        {canCancel(b) && (
                          <button
                            onClick={() =>
                              runAction("cancel", async () => {
                                const reason = window.prompt("Cancel reason (optional):") || "User cancelled";
                                await api.cancel(b._id, { reason });
                              })
                            }
                            disabled={loading}
                            className="btnWarning"
                            title="Cancel booking"
                          >
                            ✕ Cancel
                          </button>
                        )}

                        {canFail(b) && (
                          <button
                            onClick={() =>
                              runAction("fail", async () => {
                                const reason = window.prompt("Fail reason (optional):") || "Booking failed";
                                await api.fail(b._id, { reason });
                              })
                            }
                            disabled={loading}
                            className="btnDanger"
                            title="Mark as failed"
                          >
                            ⚠ Fail
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bookingCount">
          Showing {data.length} booking{data.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
