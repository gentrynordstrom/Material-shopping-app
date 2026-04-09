import { useState } from 'react';

export default function PriceInput({ materialId, store, currentPrice, onSave }) {
  const [price, setPrice] = useState(currentPrice || '');
  const [productUrl, setProductUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSave = async () => {
    if (!price || isNaN(parseFloat(price))) return;
    setSaving(true);
    try {
      await onSave(materialId, store, parseFloat(price), productUrl || undefined);
      setExpanded(false);
    } catch (err) {
      console.error('Failed to save price:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!expanded) {
    return (
      <button
        className="price-display"
        onClick={() => setExpanded(true)}
        title="Click to edit"
      >
        {currentPrice ? `$${parseFloat(currentPrice).toFixed(2)}` : '-- enter --'}
      </button>
    );
  }

  return (
    <div className="price-input-group">
      <div className="price-input-row">
        <span className="price-dollar">$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          className="price-field"
          autoFocus
        />
      </div>
      <input
        type="url"
        value={productUrl}
        onChange={(e) => setProductUrl(e.target.value)}
        placeholder="Product URL (optional)"
        className="url-field"
      />
      <div className="price-actions">
        <button
          className="btn btn-sm btn-primary"
          onClick={handleSave}
          disabled={saving || !price}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setExpanded(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
