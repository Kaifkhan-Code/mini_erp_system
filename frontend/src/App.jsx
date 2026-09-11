import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Login from "./pages/Login";
import Inventory from "./pages/Inventory";
import WorkOrders from "./pages/WorkOrders";
import Transfers from "./pages/Transfers";
import Orders from "./pages/Orders";

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <nav>
      <NavLink to="/inventory">Inventory</NavLink>
      <NavLink to="/workorders">Work Orders</NavLink>
      <NavLink to="/transfers">Transfers</NavLink>
      <NavLink to="/orders">Customer Orders</NavLink>
      <div className="spacer" />
      <span style={{ color: "#9ca3af", fontSize: 13 }}>{user.email} ({user.role})</span>
      <button className="secondary" onClick={logout}>Logout</button>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/inventory" element={<Protected><Inventory /></Protected>} />
          <Route path="/workorders" element={<Protected><WorkOrders /></Protected>} />
          <Route path="/transfers" element={<Protected><Transfers /></Protected>} />
          <Route path="/orders" element={<Protected><Orders /></Protected>} />
          <Route path="*" element={<Navigate to="/inventory" replace />} />
        </Routes>
      </main>
    </>
  );
}
