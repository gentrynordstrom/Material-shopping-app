import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMaterials, savePrice } from '../services/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import StoreSearchButton from '../components/StoreSearchButton';
import PriceInput from '../components/PriceInput';

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

  const handleSavePrice = async (materialId, store, price, productUrl) => {
    await savePrice(materialId, store, price, productUrl);
    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id !== materialId) return m;
        const priceKey = store === 'menards' ? 'menards_price' : 'hd_price';
        return {
          ...m,
          columnValues: {
            ...m.columnValues,
            [priceKey]: { text: price.toString(), value: price.toString(), type: 'numeric' },
          },
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

  if (loading) return <Spinner message="Loading materials..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

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

          <div className="materials-table-wrap">
            <table className="materials-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Search</th>
                  <th>Menards Price</th>
                  <th>Home Depot Price</th>
                  <th>Best</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((mat) => {
                  const mp = parseFloat(mat.columnValues?.menards_price?.text);
                  const hp = parseFloat(mat.columnValues?.hd_price?.text);
                  const hasBoth = !isNaN(mp) && !isNaN(hp);
                  let best = '';
                  if (hasBoth) {
                    best = mp < hp ? 'menards' : hp < mp ? 'homedepot' : 'tie';
                  }

                  return (
                    <tr key={mat.id}>
                      <td className="mat-name">{mat.name}</td>
                      <td className="mat-search">
                        <div className="search-btns">
                          <StoreSearchButton store="menards" url={mat.searchUrls.menards} />
                          <StoreSearchButton store="homedepot" url={mat.searchUrls.homedepot} />
                        </div>
                      </td>
                      <td className={`mat-price ${best === 'menards' ? 'best-price' : ''}`}>
                        <PriceInput
                          materialId={mat.id}
                          store="menards"
                          currentPrice={mat.columnValues?.menards_price?.text}
                          onSave={handleSavePrice}
                        />
                      </td>
                      <td className={`mat-price ${best === 'homedepot' ? 'best-price' : ''}`}>
                        <PriceInput
                          materialId={mat.id}
                          store="homedepot"
                          currentPrice={mat.columnValues?.hd_price?.text}
                          onSave={handleSavePrice}
                        />
                      </td>
                      <td className="mat-best">
                        {best === 'menards' && <span className="badge badge-menards">Menards</span>}
                        {best === 'homedepot' && <span className="badge badge-hd">Home Depot</span>}
                        {best === 'tie' && <span className="badge badge-tie">Tie</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
