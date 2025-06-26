import { apiRequest } from "./queryClient";

export async function uploadPhoto(projectId: number, file: File, description?: string) {
  const formData = new FormData();
  formData.append('photo', file);
  if (description) {
    formData.append('description', description);
  }

  const response = await fetch(`/api/projects/${projectId}/photos`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to upload photo');
  }

  return response.json();
}

export async function uploadReceipt(projectId: number, data: {
  vendor: string;
  amount: number;
  description?: string;
  date: Date;
  file?: File;
}) {
  const formData = new FormData();
  formData.append('vendor', data.vendor);
  formData.append('amount', data.amount.toString());
  formData.append('date', data.date.toISOString());
  if (data.description) {
    formData.append('description', data.description);
  }
  if (data.file) {
    formData.append('receipt', data.file);
  }

  const response = await fetch(`/api/projects/${projectId}/receipts`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to upload receipt');
  }

  return response.json();
}
