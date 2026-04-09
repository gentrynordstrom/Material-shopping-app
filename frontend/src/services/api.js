const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function fetchTurnovers() {
  return request('/api/turnovers');
}

export function fetchMaterials(turnoverId) {
  return request(`/api/turnovers/${turnoverId}/materials`);
}

export function savePrice(materialId, store, price, productUrl) {
  return request(`/api/materials/${materialId}/price`, {
    method: 'PUT',
    body: JSON.stringify({ store, price, productUrl }),
  });
}

export function fetchStores() {
  return request('/api/stores');
}

export function fetchBoardColumns() {
  return request('/api/board/columns');
}

export function setupPriceColumns() {
  return request('/api/board/setup-price-columns', { method: 'POST' });
}

export function scrapeProduct(url) {
  return request('/api/products/scrape', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export function saveProduct(materialId, product) {
  return request(`/api/products/${materialId}/product`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
}

export function searchCatalog(query, store) {
  const params = new URLSearchParams({ q: query });
  if (store) params.set('store', store);
  return request(`/api/products/catalog/search?${params}`);
}

export function getCatalogSuggestions(materialName) {
  return request(`/api/products/catalog/suggestions?material=${encodeURIComponent(materialName)}`);
}
