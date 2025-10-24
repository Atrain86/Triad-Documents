const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:5001";

export async function apiRequest(
  method: string,
  endpoint: string,
  data?: any
): Promise<any> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function uploadPhoto(file?: File) {
  if (!file) return null;
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/photos`, {
    method: "POST",
    body: formData,
  });
  return res.ok ? res.json() : null;
}

export async function uploadReceipt(file?: File) {
  if (!file) return null;
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/receipts`, {
    method: "POST",
    body: formData,
  });
  return res.ok ? res.json() : null;
}
