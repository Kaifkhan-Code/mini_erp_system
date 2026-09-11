import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Login() {
  const [email, setEmail] = useState("admin@erp.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { token, user } = await api.login(email, password);
      login(token, user);
      navigate("/inventory");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-box">
      <h1>Mini Ops ERP — Login</h1>
      <form onSubmit={handleSubmit} style={{ flexDirection: "column", alignItems: "stretch" }}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <button type="submit">Log in</button>
        {error && <div className="error">{error}</div>}
      </form>
      <p style={{ fontSize: 12, color: "#666", marginTop: 12 }}>
        Seeded accounts: admin@erp.com / ops@erp.com / sales@erp.com (password: password123)
      </p>
    </div>
  );
}
