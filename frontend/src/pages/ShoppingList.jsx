import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMaterials } from '../services/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import ProductPicker from '../components/ProductPicker';

export default function ShoppingList() {
  const { id } = useParams();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMaterials(id);
      setMaterials(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleProductSaved = (materialId, savedData) => {
    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id !== materialId) return m;
        const priceKey = savedData.store === 'menards' ? 'menards_price' : 'hd_price';
        const urlKey = savedData.store === 'menards' ? 'menards_url' : 'hd_url';
        return {
          ...m,
          columnValues: {
            ...m.columnValues,
            [priceKey]: { text: savedData.price.toString(), type: 'numeric' },
            [urlKey]: { text: savedData.url || '', type: 'link' },
          },
          [`${savedData.store}_product`]: savedData,
        };
      })
    );
  };

  const totals = useMemo(() => {
    let menards = 0;
    let homedepot = 0;
    let menardsCount = 0;
    let hdCount = 0;
    materials.forEach((m) => {
      const mp = parseFloat(m.columnValues?.menards_price?.text);
      const hp = parseFloat(m.columnValues?.hd_price?.text);
      if (!isNaN(mp)) { menards += mp; menardsCount++; }
      if (!isNaN(hp)) { homedepot += hp; hdCount++; }
    });
    return { menards, homedepot, menardsCount, hdCount };
  }, [materials]);

  const progress = useMemo(() => {
    const total = materials.length;
    const priced = materials.filter((m) => {
      const mp = parseFloat(m.columnValues?.menards_price?.text);
      const hp = parseFloat(m.columnValues?.hd_price?.text);
      return !isNaN(mp) || !isNaN(hp);
    }).length;
    return { total, priced, pct: total > 0 ? Math.round((priced / total) * 100) : 0 };
  }, [materials]);

  if (loading) return <Spinner message="Loading materials..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  function buildCurrentProduct(mat, store) {
    const priceKey = store === 'menards' ? 'menards_price' : 'hd_price';
    const urlKey = store === 'menards' ? 'menards_url' : 'hd_url';
    const priceVal = mat.columnValues?.[priceKey]?.text;
    const urlText = mat.columnValues?.[urlKey]?.text;
    const saved = mat[`${store}_product`];

    let urlVal = null;
    if (saved?.url) {
      urlVal = saved.url;
    } else if (urlText) {
      try {
        const parsed = JSON.parse(mat.columnValues[urlKey].value);
        urlVal = parsed?.url || urlText;
      } catch {
        urlVal = urlText.startsWith('http') ? urlText : null;
      }
    }

    if (!priceVal && !urlVal) return null;
    return {
      price: priceVal,
      url: urlVal,
      name: saved?.name || null,
      sku: saved?.sku || null,
      image_url: saved?.image_url || null,
    };
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/" className="breadcrumb">&larr; All Turnovers</Link>
          <h2 className="page-title">Shopping List</h2>
          <p className="page-subtitle">
            {materials.length} material{materials.length !== 1 ? 's' : ''} to price
          </p>
        </div>
        <Link to={`/turnover/${id}/compare`} className="btn btn-primary">
          View Comparison
        </Link>
      </div>

      {materials.length === 0 ? (
        <div className="empty-state">
          <p>No material items found for this turnover.</p>
          <p className="muted">
            Make sure subitems have their ItemType set to "Material".
          </p>
        </div>
      ) : (
        <>
          <div className="totals-bar">
            <div className="total-item">
              <span className="total-label">Progress</span>
              <div className="progress-bar-wrap">
                <div className="progress-bar" style={{ width: `${progress.pct}%` }} />
              </div>
              <span className="total-count">
                {progress.priced} of {progress.total} priced ({progress.pct}%)
              </span>
            </div>
            <div className="total-item">
              <span className="total-label">Menards Total</span>
              <span className="total-value menards-color">
                ${totals.menards.toFixed(2)}
                <span className="total-count">({totals.menardsCount} priced)</span>
              </span>
            </div>
            <div className="total-item">
              <span className="total-label">Home Depot Total</span>
              <span className="total-value hd-color">
                ${totals.homedepot.toFixed(2)}
                <span className="total-count">({totals.hdCount} priced)</span>
              </span>
            </div>
          </div>

          <div className="materials-list">
            {materials.map((mat) => {
              const mp = parseFloat(mat.columnValues?.menards_price?.text);
              const hp = parseFloat(mat.columnValues?.hd_price?.text);
              const hasBoth = !isNaN(mp) && !isNaN(hp);
              let best = '';
              if (hasBoth) {
                best = mp < hp ? 'menards' : hp < mp ? 'homedepot' : 'tie';
              }

              return (
                <div key={mat.id} className="material-row">
                  <div className="material-header">
                    <h3 className="material-name">{mat.name}</h3>
                    {best && (
                      <span className={`badge badge-${best === 'menards' ? 'menards' : best === 'homedepot' ? 'hd' : 'tie'}`}>
                        {best === 'menards' ? 'Menards cheaper' : best === 'homedepot' ? 'Home Depot cheaper' : 'Same price'}
                      </span>
                    )}
                  </div>
                  <div className="material-stores">
                    <div className="store-column store-menards">
                      <div className="store-label menards-color">Menards</div>
                      <ProductPicker
                        materialId={mat.id}
                        materialName={mat.name}
                        store="menards"
                        searchUrl={mat.searchUrls.menards}
                        currentProduct={buildCurrentProduct(mat, 'menards')}
                        onSaved={(data) => handleProductSaved(mat.id, data)}
                      />
                    </div>
                    <div className="store-column store-hd">
                      <div className="store-label hd-color">Home Depot</div>
                      <ProductPicker
                        materialId={mat.id}
                        materialName={mat.name}
                        store="homedepot"
                        searchUrl={mat.searchUrls.homedepot}
                        currentProduct={buildCurrentProduct(mat, 'homedepot')}
                        onSaved={(data) => handleProductSaved(mat.id, data)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
