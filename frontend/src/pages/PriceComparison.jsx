import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMaterials } from '../services/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

function getProductUrl(mat, store) {
  const urlKey = store === 'menards' ? 'menards_url' : 'hd_url';
  const colVal = mat.columnValues?.[urlKey];
  if (!colVal) return null;
  try {
    const parsed = JSON.parse(colVal.value);
    return parsed?.url || null;
  } catch {
    const text = colVal.text || '';
    return text.startsWith('http') ? text : null;
  }
}

export default function PriceComparison() {
  const { id } = useParams();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);

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

  const analysis = useMemo(() => {
    let menardsTotal = 0;
    let hdTotal = 0;
    let bestMixTotal = 0;
    let menardsWins = 0;
    let hdWins = 0;
    let ties = 0;
    let unpriced = 0;

    const items = materials.map((m) => {
      const mp = parseFloat(m.columnValues?.menards_price?.text);
      const hp = parseFloat(m.columnValues?.hd_price?.text);
      const hasM = !isNaN(mp);
      const hasH = !isNaN(hp);

      let bestStore = null;
      let bestPrice = null;
      let savings = 0;

      if (hasM) menardsTotal += mp;
      if (hasH) hdTotal += hp;

      if (hasM && hasH) {
        if (mp < hp) {
          bestStore = 'menards'; bestPrice = mp; savings = hp - mp; menardsWins++;
        } else if (hp < mp) {
          bestStore = 'homedepot'; bestPrice = hp; savings = mp - hp; hdWins++;
        } else {
          bestStore = 'tie'; bestPrice = mp; ties++;
        }
        bestMixTotal += bestPrice;
      } else if (hasM) {
        bestStore = 'menards'; bestPrice = mp; bestMixTotal += mp;
      } else if (hasH) {
        bestStore = 'homedepot'; bestPrice = hp; bestMixTotal += hp;
      } else {
        unpriced++;
      }

      return {
        ...m,
        menardsPrice: hasM ? mp : null,
        hdPrice: hasH ? hp : null,
        menardsUrl: getProductUrl(m, 'menards'),
        hdUrl: getProductUrl(m, 'homedepot'),
        bestStore,
        bestPrice,
        savings,
      };
    });

    return {
      items,
      menardsTotal, hdTotal, bestMixTotal,
      menardsWins, hdWins, ties, unpriced,
      bestMixSavingsVsMenards: menardsTotal - bestMixTotal,
      bestMixSavingsVsHD: hdTotal - bestMixTotal,
    };
  }, [materials]);

  const copyList = (store) => {
    const storeLabel = store === 'menards' ? 'Menards' : 'Home Depot';
    const items = analysis.items.filter(
      (i) => i.bestStore === store || (store === 'menards' && i.bestStore === 'tie')
    );
    const lines = items.map(
      (i) => `${i.name} - $${i.bestPrice.toFixed(2)}${i[`${store === 'menards' ? 'menards' : 'hd'}Url`] ? '\n  ' + i[`${store === 'menards' ? 'menards' : 'hd'}Url`] : ''}`
    );
    const text = `${storeLabel} Purchase List\n${'='.repeat(30)}\n${lines.join('\n')}\n\nTotal: $${items.reduce((s, i) => s + i.bestPrice, 0).toFixed(2)}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(store);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  };

  const handlePrint = () => window.print();

  if (loading) return <Spinner message="Building comparison..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  const menardsItems = analysis.items.filter(
    (i) => i.bestStore === 'menards' || i.bestStore === 'tie'
  );
  const hdItems = analysis.items.filter((i) => i.bestStore === 'homedepot');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to={`/turnover/${id}`} className="breadcrumb">&larr; Shopping List</Link>
          <h2 className="page-title">Price Comparison</h2>
          <p className="page-subtitle">{materials.length} materials analyzed</p>
        </div>
        <button className="btn btn-secondary" onClick={handlePrint}>
          Print / Export
        </button>
      </div>

      <div className="comparison-summary">
        <div className="summary-card">
          <h3>Menards Only</h3>
          <p className="summary-total menards-color">${analysis.menardsTotal.toFixed(2)}</p>
          <p className="summary-detail">{analysis.menardsWins} items cheapest</p>
        </div>
        <div className="summary-card">
          <h3>Home Depot Only</h3>
          <p className="summary-total hd-color">${analysis.hdTotal.toFixed(2)}</p>
          <p className="summary-detail">{analysis.hdWins} items cheapest</p>
        </div>
        <div className="summary-card summary-card-best">
          <h3>Best Mix</h3>
          <p className="summary-total">${analysis.bestMixTotal.toFixed(2)}</p>
          <p className="summary-detail">
            Saves ${analysis.bestMixSavingsVsMenards.toFixed(2)} vs all-Menards
          </p>
          <p className="summary-detail">
            Saves ${analysis.bestMixSavingsVsHD.toFixed(2)} vs all-Home Depot
          </p>
        </div>
      </div>

      {analysis.unpriced > 0 && (
        <div className="warning-box">
          {analysis.unpriced} item{analysis.unpriced !== 1 ? 's' : ''} still need pricing.{' '}
          <Link to={`/turnover/${id}`}>Go back to enter prices</Link>.
        </div>
      )}

      <div className="comparison-table-wrap">
        <table className="materials-table comparison-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Menards</th>
              <th>Home Depot</th>
              <th>Best Price</th>
              <th>Savings</th>
              <th>Buy From</th>
            </tr>
          </thead>
          <tbody>
            {analysis.items.map((item) => (
              <tr key={item.id}>
                <td className="mat-name">{item.name}</td>
                <td className={item.bestStore === 'menards' ? 'best-price' : ''}>
                  {item.menardsPrice !== null ? (
                    item.menardsUrl ? (
                      <a href={item.menardsUrl} target="_blank" rel="noopener noreferrer" className="price-link">
                        ${item.menardsPrice.toFixed(2)}
                      </a>
                    ) : `$${item.menardsPrice.toFixed(2)}`
                  ) : '--'}
                </td>
                <td className={item.bestStore === 'homedepot' ? 'best-price' : ''}>
                  {item.hdPrice !== null ? (
                    item.hdUrl ? (
                      <a href={item.hdUrl} target="_blank" rel="noopener noreferrer" className="price-link">
                        ${item.hdPrice.toFixed(2)}
                      </a>
                    ) : `$${item.hdPrice.toFixed(2)}`
                  ) : '--'}
                </td>
                <td className="best-price-cell">
                  {item.bestPrice !== null ? `$${item.bestPrice.toFixed(2)}` : '--'}
                </td>
                <td className="savings-cell">
                  {item.savings > 0 ? `$${item.savings.toFixed(2)}` : '--'}
                </td>
                <td>
                  {item.bestStore === 'menards' && <span className="badge badge-menards">Menards</span>}
                  {item.bestStore === 'homedepot' && <span className="badge badge-hd">Home Depot</span>}
                  {item.bestStore === 'tie' && <span className="badge badge-tie">Either</span>}
                  {!item.bestStore && <span className="muted">Needs pricing</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td><strong>TOTALS</strong></td>
              <td><strong>${analysis.menardsTotal.toFixed(2)}</strong></td>
              <td><strong>${analysis.hdTotal.toFixed(2)}</strong></td>
              <td><strong>${analysis.bestMixTotal.toFixed(2)}</strong></td>
              <td><strong>
                ${Math.max(analysis.bestMixSavingsVsMenards, analysis.bestMixSavingsVsHD).toFixed(2)}
              </strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="purchase-lists">
        <div className="purchase-list">
          <div className="purchase-list-header">
            <h3 className="menards-color">Buy from Menards ({menardsItems.length})</h3>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => copyList('menards')}
            >
              {copyFeedback === 'menards' ? 'Copied!' : 'Copy List'}
            </button>
          </div>
          {menardsItems.length === 0 ? (
            <p className="muted">No items assigned to Menards</p>
          ) : (
            <div className="purchase-items">
              {menardsItems.map((item) => (
                <div key={item.id} className="purchase-item">
                  <div className="purchase-item-info">
                    <span className="purchase-item-name">{item.name}</span>
                    <span className="purchase-item-price">${item.bestPrice.toFixed(2)}</span>
                  </div>
                  {item.menardsUrl && (
                    <a
                      href={item.menardsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="purchase-item-link"
                    >
                      Open on Menards &rarr;
                    </a>
                  )}
                </div>
              ))}
              <div className="purchase-list-total">
                <strong>Total: ${menardsItems.reduce((s, i) => s + i.bestPrice, 0).toFixed(2)}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="purchase-list">
          <div className="purchase-list-header">
            <h3 className="hd-color">Buy from Home Depot ({hdItems.length})</h3>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => copyList('homedepot')}
            >
              {copyFeedback === 'homedepot' ? 'Copied!' : 'Copy List'}
            </button>
          </div>
          {hdItems.length === 0 ? (
            <p className="muted">No items assigned to Home Depot</p>
          ) : (
            <div className="purchase-items">
              {hdItems.map((item) => (
                <div key={item.id} className="purchase-item">
                  <div className="purchase-item-info">
                    <span className="purchase-item-name">{item.name}</span>
                    <span className="purchase-item-price">${item.bestPrice.toFixed(2)}</span>
                  </div>
                  {item.hdUrl && (
                    <a
                      href={item.hdUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="purchase-item-link"
                    >
                      Open on Home Depot &rarr;
                    </a>
                  )}
                </div>
              ))}
              <div className="purchase-list-total">
                <strong>Total: ${hdItems.reduce((s, i) => s + i.bestPrice, 0).toFixed(2)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
