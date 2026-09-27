import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Authentication required. Please log in.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    let errorMessage = `API error: ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData?.detail) {
        errorMessage = errorData.detail;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }
  // 204 No Content means successful deletion but no body to parse.
  if (res.status === 204) {
    return;
  }
  return res.json();
}

export async function apiGet(path: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, { headers });
  return handleResponse(res);
}

export async function apiPatch(path: string, body: unknown) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiDelete(path: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers,
  });
  return handleResponse(res);
}

export async function apiPost(path: string, body: unknown) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}