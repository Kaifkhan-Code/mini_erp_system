import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function WorkOrders() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [stockCheck, setStockCheck] = useState(null);
  const [form, setForm] = useState({ location: "", itemId: "", requiredQty: "", assignedUserId: "" });

  async function load() {
    try {
      setRows(await api.getWorkOrders());
      setItems(await api.getItems());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setStockCheck(null);
    try {
      const result = await api.createWorkOrder({
        ...form,
        itemId: Number(form.itemId),
        requiredQty: Number(form.requiredQty),
        assignedUserId: Number(form.assignedUserId),
      });
      setStockCheck(result.stockCheck);
      setForm({ location: "", itemId: "", requiredQty: "", assignedUserId: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function advance(id, status) {
    try {
      await api.updateWorkOrderStatus(id, status);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Work Orders</h1>
      <table>
        <thead>
          <tr><th>ID</th><th>Location</th><th>Item</th><th>Required</th><th>Assigned</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td><td>{r.location}</td><td>{r.item?.name}</td>
              <td>{r.requiredQty}</td><td>{r.assignedUser?.email}</td><td>{r.status}</td>
              <td>
                {r.status === "ASSIGNED" && <button onClick={() => advance(r.id, "IN_PROGRESS")}>Start</button>}
                {r.status === "IN_PROGRESS" && <button onClick={() => advance(r.id, "COMPLETED")}>Complete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {user.role === "ADMIN" && (
        <form onSubmit={handleSubmit}>
          <label>Location<input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
          <label>
            Item
            <select required value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
              <option value="">Select</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
          <label>Required qty<input required type="number" min="1" value={form.requiredQty} onChange={(e) => setForm({ ...form, requiredQty: e.target.value })} /></label>
          <label>Assigned user ID<input required type="number" value={form.assignedUserId} onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })} /></label>
          <button type="submit">Create Work Order</button>
        </form>
      )}
      {stockCheck && (
        <p style={{ marginTop: 8, fontSize: 13 }}>
          Stock check — required: {stockCheck.requiredQty}, available at location: {stockCheck.availableAtLocation}, shortage: {stockCheck.shortage}
          {stockCheck.needsTransfer && " → consider an Internal Transfer."}
        </p>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
