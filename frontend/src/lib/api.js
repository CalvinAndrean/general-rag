/**
 * API client with auth token management.
 * All API calls auto-attach Bearer token and handle 401 redirects.
 */

const API_BASE_URL =
  import.meta.env.PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getToken() {
  return localStorage.getItem("rag_token");
}

function authHeaders(extra = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse(response) {
  if (response.status === 401) {
    localStorage.removeItem("rag_token");
    localStorage.removeItem("rag_refresh");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

// ── Documents ──

export async function fetchDocuments({ status, search, folderId } = {}) {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  if (folderId) params.set("folder_id", folderId);
  const qs = params.toString() ? `?${params}` : "";
  const res = await fetch(`${API_BASE_URL}/documents/${qs}`, {
    headers: authHeaders(),
  });
  const json = await handleResponse(res);
  return json.data.documents || [];
}

export async function uploadDocument(file, folderId, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);

    let url = `${API_BASE_URL}/documents/`;
    if (folderId) url += `?folder_id=${encodeURIComponent(folderId)}`;

    xhr.open("POST", url, true);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve(json.data);
        } catch (e) {
          reject(e);
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message || "Upload failed"));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network upload error"));
    xhr.send(formData);
  });
}

export async function toggleDocumentActive(docId, isActive) {
  const res = await fetch(`${API_BASE_URL}/documents/${docId}/active`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ is_active: isActive }),
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function deleteDocument(docId) {
  const res = await fetch(`${API_BASE_URL}/documents/${docId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse(res);
  return true;
}

// ── Folders ──

export async function fetchFolders() {
  const res = await fetch(`${API_BASE_URL}/documents/folders`, {
    headers: authHeaders(),
  });
  const json = await handleResponse(res);
  return json.data || [];
}

export async function createFolder(name) {
  const res = await fetch(`${API_BASE_URL}/documents/folders`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  const json = await handleResponse(res);
  return json.data;
}

// ── RAG Query (streaming) ──

export async function streamQuery({ question, topK = 4, onToken, onCitations, onError }) {
  try {
    const res = await fetch(`${API_BASE_URL}/query/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ question, top_k: topK, stream: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "RAG Query request failed");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";
      for (const block of lines) {
        for (const line of block.split("\n")) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") return;
            try {
              const payload = JSON.parse(dataStr);
              if (payload.type === "token" && payload.content) onToken(payload.content);
              else if (payload.type === "citations" && payload.sources) onCitations(payload.sources);
            } catch { /* ignore partial JSON */ }
          }
        }
      }
    }
  } catch (err) {
    if (onError) onError(err);
    else throw err;
  }
}

// ── Dashboard ──

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE_URL}/dashboard/stats`, { headers: authHeaders() });
  const json = await handleResponse(res);
  return json.data;
}

// ── Members ──

export async function fetchMembers() {
  const res = await fetch(`${API_BASE_URL}/members/`, { headers: authHeaders() });
  const json = await handleResponse(res);
  return json.data;
}

export async function updateMemberRole(userId, role) {
  const res = await fetch(`${API_BASE_URL}/members/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function removeMember(userId) {
  const res = await fetch(`${API_BASE_URL}/members/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse(res);
}

export async function regenerateTenantCode() {
  const res = await fetch(`${API_BASE_URL}/members/regenerate-code`, {
    method: "POST",
    headers: authHeaders(),
  });
  const json = await handleResponse(res);
  return json.data;
}

// ── Settings ──

export async function fetchSettings() {
  const res = await fetch(`${API_BASE_URL}/settings/`, { headers: authHeaders() });
  const json = await handleResponse(res);
  return json.data;
}

export async function updateSettings(data) {
  const res = await fetch(`${API_BASE_URL}/settings/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function fetchOpenRouterModels() {
  const res = await fetch(`${API_BASE_URL}/settings/models`, { headers: authHeaders() });
  const json = await handleResponse(res);
  return json.data;
}

// ── Usage ──

export async function fetchDailyUsage(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.set("start", startDate);
  if (endDate) params.set("end", endDate);
  const res = await fetch(`${API_BASE_URL}/usage/daily?${params}`, { headers: authHeaders() });
  const json = await handleResponse(res);
  return json.data;
}

export async function fetchMonthlyUsage() {
  const res = await fetch(`${API_BASE_URL}/usage/monthly`, { headers: authHeaders() });
  const json = await handleResponse(res);
  return json.data;
}

// ── Evaluation ──

export async function runEvaluation(queryLogId) {
  const res = await fetch(`${API_BASE_URL}/evaluations/run`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ query_log_id: queryLogId }),
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function fetchEvaluations() {
  const res = await fetch(`${API_BASE_URL}/evaluations/`, { headers: authHeaders() });
  const json = await handleResponse(res);
  return json.data;
}

export async function fetchEvaluationSummary() {
  const res = await fetch(`${API_BASE_URL}/evaluations/summary`, { headers: authHeaders() });
  const json = await handleResponse(res);
  return json.data;
}

// ── Analytics ──

export async function fetchTopQuestions() {
  const res = await fetch(`${API_BASE_URL}/analytics/top-questions`, { headers: authHeaders() });
  const json = await handleResponse(res);
  return json.data;
}

export async function fetchQueryTrends() {
  const res = await fetch(`${API_BASE_URL}/analytics/query-trends`, { headers: authHeaders() });
  const json = await handleResponse(res);
  return json.data;
}
