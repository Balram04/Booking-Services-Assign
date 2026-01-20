import { useState } from "react";

const SERVICE_ICONS = {
  CLEANING: "🧹",
  PLUMBING: "🔧",
  ELECTRICIAN: "⚡",
};

export default function CreateBooking({ api }) {
  const [serviceType, setServiceType] = useState("CLEANING");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.createBooking({ serviceType });
      setResult(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setResult(null);
    setError(null);
  }

  return (
    <div className="content">
      <div className="card">
        <h2>📝 Create New Booking</h2>
        <p className="subtitle">Book a service and get automatically matched with an available provider</p>

        <form onSubmit={onSubmit} className="bookingForm">
          <div className="field">
            <label className="label">Select Service Type</label>
            <div className="serviceOptions">
              {Object.entries(SERVICE_ICONS).map(([type, icon]) => (
                <label key={type} className={`serviceOption ${serviceType === type ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="serviceType"
                    value={type}
                    checked={serviceType === type}
                    onChange={(e) => setServiceType(e.target.value)}
                  />
                  <span className="serviceIcon">{icon}</span>
                  <span className="serviceName">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="formActions">
            <button type="submit" disabled={loading} className="btnPrimary">
              {loading ? "⏳ Creating Booking..." : "🚀 Book Service"}
            </button>
          </div>
        </form>

        {error && (
          <div className="errorBox">
            <strong>❌ Booking Failed</strong>
            <div className="errorMessage">{error.payload?.message || error.message}</div>
          </div>
        )}

        {result && (
          <div className="successBox">
            <div className="successHeader">
              <strong>✅ Booking Created Successfully!</strong>
              <button onClick={resetForm} className="btnLink">✕</button>
            </div>
            <div className="successDetails">
              <div className="detailRow">
                <span className="detailLabel">Customer ID:</span>
                <code className="detailValue">{result.data?.customerId}</code>
              </div>
              <div className="detailRow">
                <span className="detailLabel">Service:</span>
                <span className="detailValue">{SERVICE_ICONS[result.data?.serviceType]} {result.data?.serviceType}</span>
              </div>
              <div className="detailRow">
                <span className="detailLabel">Status:</span>
                <span className="statusBadge" style={{ backgroundColor: "#FFA500" }}>
                  {result.data?.status}
                </span>
              </div>
            </div>
            <p className="successNote">💡 Your booking is being processed. A provider will be assigned shortly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
