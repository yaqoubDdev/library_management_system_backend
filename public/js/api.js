const BASE_URL = "/api";

function bookCover(title, author) {
  const t = (title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const a = (author || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
    <rect width="300" height="400" fill="#f5f0eb" rx="8"/>
    <rect x="12" y="12" width="276" height="376" fill="none" stroke="#e0d5c5" stroke-width="2" rx="6"/>
    <text x="150" y="170" text-anchor="middle" fill="#4a3728" font-size="20" font-weight="bold" font-family="Georgia, serif">${t}</text>
    <text x="150" y="210" text-anchor="middle" fill="#8b7355" font-size="14" font-family="Georgia, serif">${a}</text>
  </svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }
  return data;
}
