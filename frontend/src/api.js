const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  getItems: () => request("/items"),
  getInventory: () => request("/inventory"),
  addInventory: (payload) => request("/inventory", { method: "POST", body: payload }),
  getWorkOrders: () => request("/workorders"),
  createWorkOrder: (payload) => request("/workorders", { method: "POST", body: payload }),
  updateWorkOrderStatus: (id, status) =>
    request(`/workorders/${id}/status`, { method: "PATCH", body: { status } }),
  getTransfers: () => request("/transfers"),
  createTransfer: (payload) => request("/transfers", { method: "POST", body: payload }),
  dispatchTransfer: (id) => request(`/transfers/${id}/dispatch`, { method: "POST" }),
  receiveTransfer: (id) => request(`/transfers/${id}/receive`, { method: "POST" }),
  getOrders: () => request("/orders"),
  createOrder: (payload) => request("/orders", { method: "POST", body: payload }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: "POST" }),
};

export { getToken };
