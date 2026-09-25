import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Login from "./pages/Login";
import Inventory from "./pages/Inventory";
import WorkOrders from "./pages/WorkOrders";
import Transfers from "./pages/Transfers";
import Orders from "./pages/Orders";
import Dashboard from "./pages/Dashboard";

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <nav className="main-nav">
      <div className="nav-links">
        <NavLink to="/dashboard">Overview</NavLink>
        <NavLink to="/inventory">Inventory</NavLink>
        <NavLink to="/workorders">Work orders</NavLink>
        <NavLink to="/transfers">Transfers</NavLink>
        <NavLink to="/orders">Orders</NavLink>
      </div>
      <span className="account-chip">
        <span className="account-avatar">{user.email[0].toUpperCase()}</span>
        <span className="account-copy">
          <strong>{user.email.split("@")[0]}</strong>
          <small>{user.role.toLowerCase()}</small>
          <small className="account-id">ID: {user.id}</small>
        </span>
      </span>
      <button className="logout-button" onClick={logout}>Sign out</button>
    </nav>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-title">Mini Ops ERP</div>
            <div className="brand-subtitle">Small team operations</div>
          </div>
        </div>
        <Nav />
      </header>
      <main className="content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/inventory" element={<Protected><Inventory /></Protected>} />
          <Route path="/workorders" element={<Protected><WorkOrders /></Protected>} />
          <Route path="/transfers" element={<Protected><Transfers /></Protected>} />
          <Route path="/orders" element={<Protected><Orders /></Protected>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
