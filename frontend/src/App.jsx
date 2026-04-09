import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ShoppingList from './pages/ShoppingList';
import PriceComparison from './pages/PriceComparison';

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/turnover/:id" element={<ShoppingList />} />
          <Route path="/turnover/:id/compare" element={<PriceComparison />} />
        </Routes>
      </main>
    </div>
  );
}
