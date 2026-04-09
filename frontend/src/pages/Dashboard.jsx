import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTurnovers } from '../services/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

export default function Dashboard() {
  const [turnovers, setTurnovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTurnovers();
      setTurnovers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = turnovers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner message="Loading turnovers from Monday.com..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Turnover Projects</h2>
          <p className="page-subtitle">
            {turnovers.length} project{turnovers.length !== 1 ? 's' : ''} on the board
          </p>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search turnovers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No turnovers found{search ? ' matching your search' : ''}.</p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((turnover) => (
            <Link
              key={turnover.id}
              to={`/turnover/${turnover.id}`}
              className="turnover-card"
            >
              <div className="turnover-card-header">
                <h3 className="turnover-name">{turnover.name}</h3>
                {turnover.status && (
                  <span className="status-badge">{turnover.status}</span>
                )}
              </div>
              <div className="turnover-card-body">
                <div className="turnover-stat">
                  <span className="stat-value">{turnover.subitemCount}</span>
                  <span className="stat-label">subitems</span>
                </div>
              </div>
              <div className="turnover-card-footer">
                <span className="card-link-text">View Materials &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
