import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMaterials } from '../services/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

export default function PriceComparison() {
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
          bestStore = 'menards';
          bestPrice = mp;
          savings = hp - mp;
          menardsWins++;
        } else if (hp < mp) {
          bestStore = 'homedepot';
          bestPrice = hp;
          savings = mp - hp;
          hdWins++;
        } else {
          bestStore = 'tie';
          bestPrice = mp;
          ties++;
        }
        bestMixTotal += bestPrice;
      } else if (hasM) {
        bestStore = 'menards';
        bestPrice = mp;
        bestMixTotal += mp;
      } else if (hasH) {
        bestStore = 'homedepot';
        bestPrice = hp;
        bestMixTotal += hp;
      } else {
        unpriced++;
      }

      return {
        ...m,
        menardsPrice: hasM ? mp : null,
        hdPrice: hasH ? hp : null,
        bestStore,
        bestPrice,
        savings,
      };
    });

    return {
      items,
      menardsTotal,
      hdTotal,
      bestMixTotal,
      menardsWins,
      hdWins,
      ties,
      unpriced,
      bestMixSavingsVsMenards: menardsTotal - bestMixTotal,
      bestMixSavingsVsHD: hdTotal - bestMixTotal,
    };
  }, [materials]);

  const handlePrint = () => window.print();

  if (loading) return <Spinner message="Building comparison..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

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
                  {item.menardsPrice !== null ? `$${item.menardsPrice.toFixed(2)}` : '--'}
                </td>
                <td className={item.bestStore === 'homedepot' ? 'best-price' : ''}>
                  {item.hdPrice !== null ? `$${item.hdPrice.toFixed(2)}` : '--'}
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
          <h3 className="menards-color">Buy from Menards</h3>
          <ul>
            {analysis.items
              .filter((i) => i.bestStore === 'menards' || i.bestStore === 'tie')
              .map((i) => (
                <li key={i.id}>
                  {i.name} &mdash; ${i.bestPrice.toFixed(2)}
                </li>
              ))}
          </ul>
        </div>
        <div className="purchase-list">
          <h3 className="hd-color">Buy from Home Depot</h3>
          <ul>
            {analysis.items
              .filter((i) => i.bestStore === 'homedepot')
              .map((i) => (
                <li key={i.id}>
                  {i.name} &mdash; ${i.bestPrice.toFixed(2)}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
