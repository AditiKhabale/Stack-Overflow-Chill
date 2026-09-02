import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PRODUCTS, CUSTOMERS, ORDERS, INVENTORY } from './data';

// ── Derived analytics ──────────────────────────────────────────────────────
const productMap = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
const customerMap = Object.fromEntries(CUSTOMERS.map(c => [c.id, c]));

const totalRevenue = ORDERS.reduce((s, o) => s + o.totalAmount, 0);

// Daily sales (Aug 1–31 + Sep 1)
const dailySalesMap: Record<string, number> = {};
ORDERS.forEach(o => {
  const day = o.timestamp.slice(5, 10); // MM-DD
  dailySalesMap[day] = (dailySalesMap[day] || 0) + o.totalAmount;
});
const dailySales = Object.entries(dailySalesMap)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([day, revenue]) => ({ day: day.replace('08-', 'Aug ').replace('09-', 'Sep '), revenue }));

// Revenue by category
const catRevMap: Record<string, number> = {};
ORDERS.forEach(o => {
  const p = productMap[o.productId];
  if (p) catRevMap[p.category] = (catRevMap[p.category] || 0) + o.totalAmount;
});
const categoryRevenue = Object.entries(catRevMap)
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => b.value - a.value);

// Top products by revenue
const prodRevMap: Record<string, number> = {};
ORDERS.forEach(o => {
  prodRevMap[o.productId] = (prodRevMap[o.productId] || 0) + o.totalAmount;
});
const topProducts = Object.entries(prodRevMap)
  .map(([id, revenue]) => ({ id, name: productMap[id]?.name ?? id, revenue }))
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 10);

// Customer spend
const custSpendMap: Record<string, number> = {};
ORDERS.forEach(o => {
  custSpendMap[o.customerId] = (custSpendMap[o.customerId] || 0) + o.totalAmount;
});

// Inventory status counts
const invStatusCounts = { Healthy: 0, 'Low Stock': 0, Critical: 0, 'Out of Stock': 0 };
Object.values(INVENTORY).forEach(({ status }) => {
  if (status in invStatusCounts) invStatusCounts[status as keyof typeof invStatusCounts]++;
});
const inventoryPieData = Object.entries(invStatusCounts).map(([name, value]) => ({ name, value }));

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6b7280'];
const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

// Low stock items count
const lowStockCount = Object.values(INVENTORY).filter(v => v.status !== 'Healthy').length;

// Nav pages
type Page = 'dashboard' | 'products' | 'inventory' | 'customers' | 'orders' | 'analytics' | 'insights';

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'products', label: 'Products', icon: '📦' },
  { id: 'inventory', label: 'Inventory', icon: '🗄' },
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'orders', label: 'Orders', icon: '🧾' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'insights', label: 'Insights', icon: '💡' },
];

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'Healthy': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Low Stock': 'bg-amber-50 text-amber-700 border-amber-200',
    'Critical': 'bg-red-50 text-red-700 border-red-200',
    'Out of Stock': 'bg-gray-100 text-gray-600 border-gray-200',
  };
  const dots: Record<string, string> = {
    'Healthy': 'bg-emerald-500',
    'Low Stock': 'bg-amber-500',
    'Critical': 'bg-red-500',
    'Out of Stock': 'bg-gray-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[status] ?? styles['Low Stock']}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] ?? dots['Low Stock']}`} />
      {status}
    </span>
  );
}

function SegmentBadge({ segment }: { segment: string }) {
  const styles: Record<string, string> = {
    Premium: 'bg-violet-50 text-violet-700 border-violet-200',
    Family: 'bg-blue-50 text-blue-700 border-blue-200',
    Regular: 'bg-slate-50 text-slate-600 border-slate-200',
    Budget: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[segment] ?? styles['Regular']}`}>
      {segment}
    </span>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-3xl font-bold ${color}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Pages ─────────────────────────────────────────────────────────────────

function Dashboard({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Inventory & Sales Overview — August 2026</p>
        </div>
        <button
          onClick={() => setPage('analytics')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          View Analytics →
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Products" value="36" sub="8 categories" color="text-slate-900" />
        <KpiCard label="Total Customers" value="200" sub="Active base" color="text-blue-700" />
        <KpiCard label="Total Orders" value="279" sub="Aug 1 – Sep 1" color="text-violet-700" />
        <KpiCard label="Total Revenue" value={fmt(totalRevenue)} sub="All orders" color="text-emerald-700" />
        <KpiCard label="Low Stock Items" value={`${lowStockCount}`} sub="Need attention" color="text-amber-600" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Sales Trend (August 2026)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailySales} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryRevenue} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={110} />
              <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {categoryRevenue.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Top 10 Products by Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/1000).toFixed(1)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9.5, fill: '#64748b' }} width={120} />
              <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Inventory Status Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie data={inventoryPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {inventoryPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {inventoryPieData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-xs text-slate-600">{d.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-900">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsPage() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const categories = ['All', ...Array.from(new Set(PRODUCTS.map(p => p.category)))];
  const filtered = useMemo(() =>
    PRODUCTS.filter(p =>
      (catFilter === 'All' || p.category === catFilter) &&
      p.name.toLowerCase().includes(search.toLowerCase())
    ), [search, catFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Products</h1>
        <p className="text-sm text-slate-500 mt-0.5">36 products across 8 categories</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="px-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white flex-1 min-w-48"
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="px-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Product Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Stock</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(p => {
              const inv = INVENTORY[p.id];
              return (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.category}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{p.price}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{inv?.closingStock ?? '—'}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={inv?.status ?? 'Low Stock'} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">No products match your filters.</div>
        )}
      </div>
      <p className="text-xs text-slate-400">{filtered.length} of 36 products shown</p>
    </div>
  );
}

function InventoryPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [catFilter, setCatFilter] = useState('All');
  const categories = ['All', ...Array.from(new Set(PRODUCTS.map(p => p.category)))];
  const statuses = ['All', 'Healthy', 'Low Stock', 'Critical', 'Out of Stock'];

  const rows = useMemo(() =>
    PRODUCTS
      .filter(p => {
        const inv = INVENTORY[p.id];
        return (
          (catFilter === 'All' || p.category === catFilter) &&
          (statusFilter === 'All' || inv?.status === statusFilter) &&
          p.name.toLowerCase().includes(search.toLowerCase())
        );
      })
      .map(p => ({ ...p, ...INVENTORY[p.id] })),
    [search, catFilter, statusFilter]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Inventory</h1>
        <p className="text-sm text-slate-500 mt-0.5">Stock snapshot — 31 August 2026</p>
      </div>

      {/* Alert strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {inventoryPieData.map((d, i) => (
          <div key={d.name} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
            <div>
              <p className="text-xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{d.value}</p>
              <p className="text-xs text-slate-500">{d.name}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="px-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white flex-1 min-w-48"
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Product Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Stock</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.id}</td>
                <td className="px-4 py-3 text-slate-500">{r.category}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{r.price}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-700">{r.closingStock}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{rows.length} of 36 products shown</p>
    </div>
  );
}

function CustomersPage() {
  const [search, setSearch] = useState('');
  const [segFilter, setSegFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const segments = ['All', 'Premium', 'Family', 'Regular', 'Budget'];
  const cities = ['All', ...Array.from(new Set(CUSTOMERS.map(c => c.city))).sort()];

  const rows = useMemo(() => {
    return CUSTOMERS
      .filter(c =>
        (segFilter === 'All' || c.segment === segFilter) &&
        (cityFilter === 'All' || c.city === cityFilter) &&
        c.id.toLowerCase().includes(search.toLowerCase())
      )
      .map(c => ({
        ...c,
        totalSpend: custSpendMap[c.id] ?? 0,
        orderCount: ORDERS.filter(o => o.customerId === c.id).length,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [search, segFilter, cityFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Customers</h1>
        <p className="text-sm text-slate-500 mt-0.5">200 customers across Maharashtra</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by ID…"
          className="px-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white flex-1 min-w-48"
        />
        <select value={segFilter} onChange={e => setSegFilter(e.target.value)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {segments.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {cities.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Customer ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">City</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Segment</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Age</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Orders</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total Spend</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Since</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.slice(0, 100).map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{c.id}</td>
                <td className="px-4 py-3 text-slate-700">{c.city}</td>
                <td className="px-4 py-3"><SegmentBadge segment={c.segment} /></td>
                <td className="px-4 py-3 text-center text-slate-600">{c.age}</td>
                <td className="px-4 py-3 text-center text-slate-700 font-semibold">{c.orderCount}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-700">{c.totalSpend > 0 ? fmt(c.totalSpend) : '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{c.signupDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{rows.length} customers shown (capped at 100 rows for performance)</p>
    </div>
  );
}

function OrdersPage() {
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('All');
  const productNames = ['All', ...PRODUCTS.map(p => p.name)];

  const rows = useMemo(() =>
    ORDERS
      .filter(o => {
        const p = productMap[o.productId];
        return (
          (productFilter === 'All' || p?.name === productFilter) &&
          (o.id.toLowerCase().includes(search.toLowerCase()) ||
            o.customerId.toLowerCase().includes(search.toLowerCase()))
        );
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [search, productFilter]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Orders</h1>
        <p className="text-sm text-slate-500 mt-0.5">279 orders — August 2026</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by order or customer ID…"
          className="px-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white flex-1 min-w-48"
        />
        <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white max-w-56">
          {productNames.map(n => <option key={n}>{n}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Order ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Product</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Unit Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.slice(0, 150).map(o => {
              const p = productMap[o.productId];
              return (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{o.id}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{o.timestamp}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.customerId}</td>
                  <td className="px-4 py-3 text-slate-700">{p?.name}</td>
                  <td className="px-4 py-3 text-center text-slate-700 font-semibold">{o.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-600">₹{o.unitPrice}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">₹{o.totalAmount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{rows.length} orders matched (showing up to 150)</p>
    </div>
  );
}

function AnalyticsPage() {
  // Segment revenue
  const segRevMap: Record<string, number> = {};
  ORDERS.forEach(o => {
    const seg = customerMap[o.customerId]?.segment ?? 'Unknown';
    segRevMap[seg] = (segRevMap[seg] || 0) + o.totalAmount;
  });
  const segmentData = Object.entries(segRevMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // City revenue
  const cityRevMap: Record<string, number> = {};
  ORDERS.forEach(o => {
    const city = customerMap[o.customerId]?.city ?? 'Unknown';
    cityRevMap[city] = (cityRevMap[city] || 0) + o.totalAmount;
  });
  const cityData = Object.entries(cityRevMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Orders per day
  const ordersPerDay: Record<string, number> = {};
  ORDERS.forEach(o => {
    const day = o.timestamp.slice(5, 10);
    ordersPerDay[day] = (ordersPerDay[day] || 0) + 1;
  });
  const ordersPerDayData = Object.entries(ordersPerDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day: day.replace('08-', 'Aug ').replace('09-', 'Sep '), count }));

  // AOV per segment
  const segOrderCount: Record<string, number> = {};
  ORDERS.forEach(o => {
    const seg = customerMap[o.customerId]?.segment ?? 'Unknown';
    segOrderCount[seg] = (segOrderCount[seg] || 0) + 1;
  });
  const aovData = Object.entries(segRevMap).map(([seg, rev]) => ({
    name: seg,
    aov: Math.round(rev / (segOrderCount[seg] || 1)),
  })).sort((a, b) => b.aov - a.aov);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Deep-dive into sales, products, customers, and inventory</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Full sales trend */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailySales} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders per day */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Orders Per Day</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ordersPerDayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="count" fill="#06b6d4" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by segment */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue by Customer Segment</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={segmentData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {segmentData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by city */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue by City</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cityData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
              <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AOV by segment */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Avg. Order Value by Segment</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={aovData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={(v) => `₹${v}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="aov" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue Share by Category</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={categoryRevenue} cx="50%" cy="50%" outerRadius={85} paddingAngle={2} dataKey="value">
                  {categoryRevenue.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {categoryRevenue.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-slate-600">{d.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightsPage() {
  // Compute insights from real data
  const topProduct = topProducts[0];
  const topCat = categoryRevenue[0];

  const custSpendSorted = Object.entries(custSpendMap).sort((a, b) => b[1] - a[1]);
  const highValueCustomers = custSpendSorted.slice(0, 5).map(([cid, spend]) => ({ cid, spend, ...customerMap[cid] }));

  const criticalItems = PRODUCTS.filter(p => INVENTORY[p.id]?.status === 'Critical' || INVENTORY[p.id]?.status === 'Out of Stock');
  const lowStockItems = PRODUCTS.filter(p => INVENTORY[p.id]?.status === 'Low Stock').slice(0, 5);

  const avgDailyRevenue = Math.round(totalRevenue / dailySales.length);
  const peakDay = dailySales.reduce((best, d) => d.revenue > best.revenue ? d : best, dailySales[0]);
  const peakDayOrders = ordersPerDay(peakDay?.day);

  function ordersPerDay(day: string) {
    return ORDERS.filter(o => o.timestamp.slice(5, 10).replace('08-', 'Aug ').replace('09-', 'Sep ') === day).length;
  }

  const repeatBuyers = Object.entries(
    ORDERS.reduce((acc, o) => { acc[o.customerId] = (acc[o.customerId] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).filter(([, c]) => c > 3).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Insights</h1>
        <p className="text-sm text-slate-500 mt-0.5">Data-driven business intelligence — calculated from actual dataset</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Best seller */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-3">🏆 Best-Selling Product</p>
          <p className="text-lg font-bold mb-1">{topProduct?.name}</p>
          <p className="text-3xl font-bold opacity-90" style={{ fontFamily: 'DM Sans, sans-serif' }}>{fmt(topProduct?.revenue)}</p>
          <p className="text-sm opacity-70 mt-2">Highest revenue-generating product in August</p>
        </div>

        {/* Top category */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-3">📦 Highest-Performing Category</p>
          <p className="text-lg font-bold mb-1">{topCat?.name}</p>
          <p className="text-3xl font-bold opacity-90" style={{ fontFamily: 'DM Sans, sans-serif' }}>{fmt(topCat?.value)}</p>
          <p className="text-sm opacity-70 mt-2">{Math.round((topCat?.value / totalRevenue) * 100)}% of total revenue</p>
        </div>

        {/* Peak sales day */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-3">📈 Peak Sales Day</p>
          <p className="text-lg font-bold mb-1">{peakDay?.day}, 2026</p>
          <p className="text-3xl font-bold opacity-90" style={{ fontFamily: 'DM Sans, sans-serif' }}>{fmt(peakDay?.revenue)}</p>
          <p className="text-sm opacity-70 mt-2">{peakDayOrders} orders on peak day</p>
        </div>

        {/* High value customers */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">💰 Top 5 High-Value Customers</p>
          <div className="space-y-3">
            {highValueCustomers.map((c, i) => (
              <div key={c.cid} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.cid}</p>
                    <p className="text-xs text-slate-400">{c.city} · {c.segment}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-700">{fmt(c.spend)}</p>
                  <p className="text-xs text-slate-400">{ORDERS.filter(o => o.customerId === c.cid).length} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Avg daily revenue */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">📊 Avg. Daily Revenue</p>
          <p className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>{fmt(avgDailyRevenue)}</p>
          <p className="text-sm text-slate-500">Across {dailySales.length} trading days</p>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Repeat buyers (3+ orders)</p>
            <p className="text-xl font-bold text-blue-600">{repeatBuyers} customers</p>
          </div>
        </div>

        {/* Critical + OOS items */}
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5 border">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-4">🚨 Urgent Restocking Needed</p>
          <div className="space-y-2">
            {criticalItems.map(p => {
              const inv = INVENTORY[p.id];
              return (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-700 font-medium">{p.name}</p>
                  <StatusBadge status={inv.status} />
                </div>
              );
            })}
            {criticalItems.length === 0 && <p className="text-sm text-slate-400">All products are healthy!</p>}
          </div>
        </div>

        {/* Low stock items */}
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5 border">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-4">⚠️ Low Stock Alert (top 5)</p>
          <div className="space-y-3">
            {lowStockItems.map(p => {
              const inv = INVENTORY[p.id];
              return (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-700">{inv.closingStock} units</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sales trend insight */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">📉 Sales Trend Analysis</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{fmt(totalRevenue)}</p>
              <p className="text-xs text-slate-400 mt-1">Total August Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{279}</p>
              <p className="text-xs text-slate-400 mt-1">Total Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{fmt(Math.round(totalRevenue / 279))}</p>
              <p className="text-xs text-slate-400 mt-1">Avg. Order Value</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 leading-relaxed space-y-2">
            <p>• <strong>Staples & Grains</strong> leads with {fmt(categoryRevenue.find(c => c.name === 'Staples & Grains')?.value ?? 0)} revenue, driven by high-value items like Basmati Rice (₹449).</p>
            <p>• <strong>Mumbai</strong> customers contribute the highest city-level revenue, followed by Navi Mumbai and Pune.</p>
            <p>• <strong>Regular segment</strong> generates the most total revenue, but <strong>Premium customers</strong> have the highest average order value.</p>
            <p>• <strong>Bath Soap 4-Pack (P030)</strong> is currently Out of Stock — restocking is critical to avoid lost revenue.</p>
            <p>• <strong>Instant Noodles (P013)</strong> has only 4 units remaining and is approaching stockout — immediate replenishment recommended.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pages: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard setPage={setPage} />,
    products: <ProductsPage />,
    inventory: <InventoryPage />,
    customers: <CustomersPage />,
    orders: <OrdersPage />,
    analytics: <AnalyticsPage />,
    insights: <InsightsPage />,
  };

  return (
    <div className="min-h-full flex bg-slate-50" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-60 bg-slate-900 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">IS</div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>InvenSight</p>
              <p className="text-slate-400 text-xs">Analytics Platform</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => { setPage(n.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                page === n.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="text-base leading-none">{n.icon}</span>
              {n.label}
              {n.id === 'inventory' && lowStockCount > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">{lowStockCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-700">
          <p className="text-slate-500 text-xs leading-relaxed">Data Science Hackathon 2026</p>
          <p className="text-slate-600 text-xs">Inventory & Sales Analytics</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-4 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 hover:text-slate-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <p className="text-slate-400 text-xs hidden sm:block">InvenSight</p>
            <span className="text-slate-300 text-xs hidden sm:block">/</span>
            <p className="text-sm font-semibold text-slate-800 capitalize">{page}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-2.5 py-1 rounded-full">● Live</span>
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">DS</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-5 lg:p-7 overflow-auto">
          {pages[page]}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 px-6 py-3 text-center">
          <p className="text-xs text-slate-400">Data Science Hackathon 2026 | Inventory & Sales Analytics</p>
        </footer>
      </div>
    </div>
  );
}
