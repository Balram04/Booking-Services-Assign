import { NavLink, Route, Routes } from "react-router-dom";
import { useMemo, useState } from "react";
import "./App.css";
import { createApiClient, DEFAULT_API_BASE_URL, normalizeBaseUrl } from "./apiClient";

import CreateBooking from "./CreateBooking";
import BookingList from "./BookingList";
import AdminPanel from "./AdminPanel";
import BookingHistory from "./BookingHistory";
import ProviderJobs from "./ProviderJobs";

const STORAGE_KEY = "bookingServices.apiBaseUrl";

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeBaseUrl(saved || DEFAULT_API_BASE_URL);
  });

  const api = useMemo(() => createApiClient(apiBaseUrl), [apiBaseUrl]);

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="title">Booking Services</div>
        </div>

       
      </div>

      <div className="tabs">
        <NavLink className={({ isActive }) => `tab ${isActive ? "active" : ""}`} to="/">
          Create
        </NavLink>
         <NavLink className={({ isActive }) => `tab ${isActive ? "active" : ""}`} to="/bookings">
          Bookings
        </NavLink>
        <NavLink className={({ isActive }) => `tab ${isActive ? "active" : ""}`} to="/provider">
          Provider
        </NavLink>
       
        
        <NavLink className={({ isActive }) => `tab ${isActive ? "active" : ""}`} to="/admin">
          Admin
        </NavLink>
        <NavLink className={({ isActive }) => `tab ${isActive ? "active" : ""}`} to="/history">
          History
        </NavLink>
      </div>

      <Routes>
        <Route path="/" element={<CreateBooking api={api} />} />
        <Route path="/bookings" element={<BookingList api={api} />} />
        <Route path="/provider" element={<ProviderJobs api={api} />} />
        <Route path="/admin" element={<AdminPanel api={api} />} />
        <Route path="/history" element={<BookingHistory api={api} />} />
      </Routes>
    </div>
  );
}