import { useState, useEffect, useCallback } from 'react';
import { scrapeProduct, saveProduct, getCatalogSuggestions } from '../services/api';
import StoreSearchButton from './StoreSearchButton';

export default function ProductPicker({
  materialId,
  materialName,
  store,
  searchUrl,
  currentProduct,
  onSaved,
}) {
  const [mode, setMode] = useState('display');
  const [url, setUrl] = useState('');
  const [productData, setProductData] = useState(null);
  const [price, setPrice] = useState('');
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hasProduct = currentProduct?.url || currentProduct?.price;

  useEffect(() => {
    if (!materialName) return;
    let cancelled = false;
    getCatalogSuggestions(materialName)
      .then((data) => {
        if (!cancelled) setSuggestions(data.filter((s) => s.store === store));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [materialName, store]);

  const handlePaste = useCallback(async (pastedUrl) => {
    const trimmed = pastedUrl.trim();
    if (!trimmed.startsWith('http')) return;
    setUrl(trimmed);
    setLoading(true);
    setError(null);
    try {
      const data = await scrapeProduct(trimmed);
      setProductData(data);
      setProductName(data.name || '');
      setSku(data.sku || '');
      if (data.price) setPrice(data.price.toString());
      setMode('confirm');
    } catch (err) {
      setError('Could not parse product URL');
      setMode('manual');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUrlInputPaste = (e) => {
    const text = e.clipboardData.getData('text');
    if (text.startsWith('http')) {
      e.preventDefault();
      handlePaste(text);
    }
  };

  const handleSave = async () => {
    if (!price || isNaN(parseFloat(price))) return;
    setLoading(true);
    setError(null);
    try {
      await saveProduct(materialId, {
        store,
        name: productName || materialName,
        sku: sku || null,
        price: parseFloat(price),
        url: url || null,
        image_url: productData?.image_url || null,
      });
      onSaved({
        store,
        price: parseFloat(price),
        url: url || null,
        name: productName || materialName,
        sku,
        image_url: productData?.image_url || null,
      });
      setMode('display');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (product) => {
    setUrl(product.url || '');
    setProductName(product.name || '');
    setSku(product.sku || '');
    setPrice(product.price?.toString() || '');
    setProductData(product);
    setShowSuggestions(false);
    setMode('confirm');
  };

  const storeLabel = store === 'menards' ? 'Menards' : 'Home Depot';

  // Compact display when a product is already saved
  if (mode === 'display' && hasProduct) {
    return (
      <div className="product-card-saved" onClick={() => setMode('edit')}>
        {currentProduct.image_url && (
          <img src={currentProduct.image_url} alt="" className="product-thumb" />
        )}
        <div className="product-card-info">
          <span className="product-card-price">
            ${parseFloat(currentProduct.price).toFixed(2)}
          </span>
          {currentProduct.name && (
            <span className="product-card-name" title={currentProduct.name}>
              {currentProduct.name.length > 40
                ? currentProduct.name.slice(0, 40) + '...'
                : currentProduct.name}
            </span>
          )}
          {currentProduct.url && (
            <a
              href={currentProduct.url}
              target="_blank"
              rel="noopener noreferrer"
              className="product-card-link"
              onClick={(e) => e.stopPropagation()}
            >
              View on {storeLabel}
            </a>
          )}
        </div>
      </div>
    );
  }

  // Empty state -- show search button + paste URL field
  if (mode === 'display') {
    return (
      <div className="product-picker-empty">
        <div className="product-picker-actions">
          <StoreSearchButton store={store} url={searchUrl} />
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setMode('edit')}
          >
            Add Product
          </button>
        </div>
        {suggestions.length > 0 && (
          <button
            className="suggestion-hint"
            onClick={() => { setShowSuggestions(true); setMode('edit'); }}
          >
            {suggestions.length} previous match{suggestions.length !== 1 ? 'es' : ''}
          </button>
        )}
      </div>
    );
  }

  // Edit/confirm mode
  return (
    <div className="product-picker-form">
      {error && <div className="picker-error">{error}</div>}

      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-panel">
          <div className="suggestions-header">
            <span>Previously Used</span>
            <button className="btn-close" onClick={() => setShowSuggestions(false)}>&times;</button>
          </div>
          {suggestions.map((s) => (
            <button
              key={s.id}
              className="suggestion-item"
              onClick={() => applySuggestion(s)}
            >
              <div className="suggestion-name">{s.name}</div>
              <div className="suggestion-meta">
                ${parseFloat(s.price).toFixed(2)}
                {s.times_used > 1 && (
                  <span className="suggestion-badge">Used {s.times_used}x</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="picker-url-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={handleUrlInputPaste}
          placeholder={`Paste ${storeLabel} product URL...`}
          className="picker-url-input"
          autoFocus={mode === 'edit'}
        />
        {url && !productData && !loading && (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => handlePaste(url)}
          >
            Fetch
          </button>
        )}
      </div>

      {loading && <div className="picker-loading">Fetching product info...</div>}

      {productData?.image_url && (
        <img src={productData.image_url} alt="" className="picker-preview-img" />
      )}

      <div className="picker-fields">
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Product name"
          className="picker-name-input"
        />
        <div className="picker-price-row">
          <span className="price-dollar">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="price-field"
          />
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU / Model #"
            className="picker-sku-input"
          />
        </div>
      </div>

      <div className="picker-buttons">
        <button
          className="btn btn-sm btn-primary"
          onClick={handleSave}
          disabled={loading || !price}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => { setMode('display'); setError(null); }}
        >
          Cancel
        </button>
        {suggestions.length > 0 && !showSuggestions && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setShowSuggestions(true)}
          >
            Suggestions ({suggestions.length})
          </button>
        )}
      </div>
    </div>
  );
}
