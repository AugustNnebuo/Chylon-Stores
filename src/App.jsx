import React, { useState, useEffect, useCallback } from "react";
import { Plus, Minus, Trash2, ShoppingBag, Package, Receipt, X, Check, Loader2, Download } from "lucide-react";
import { supabase } from "./supabaseClient";

const COLORS = {
  green: "#123524",
  greenLight: "#1D5138",
  amber: "#E7A33E",
  amberDark: "#C4841F",
  cream: "#F7F4ED",
  ink: "#1A1A16",
  line: "#E4DFD0",
};

const money = (n) =>
  "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

const todayISO = () => new Date().toISOString().slice(0, 10);

const rowToProduct = (r) => ({ id: r.id, name: r.name, costPrice: r.cost_price, sellingPrice: r.selling_price });
const rowToSale = (r) => ({
  id: r.id,
  productId: r.product_id,
  productName: r.product_name,
  costPrice: r.cost_price,
  sellingPrice: r.selling_price,
  qty: r.qty,
  profit: r.profit,
  date: r.sale_date,
  timestamp: new Date(r.created_at).getTime(),
});

function useStore() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const [{ data: p, error: pErr }, { data: s, error: sErr }] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("sales").select("*").order("created_at", { ascending: false }),
      ]);
      if (pErr || sErr) {
        setError("Could not connect to the database. Check your Supabase setup.");
      } else {
        setProducts((p || []).map(rowToProduct));
        setSales((s || []).map(rowToSale));
      }
      setReady(true);
    })();
  }, []);

  const addProduct = useCallback(async (p) => {
    const { data, error } = await supabase
      .from("products")
      .insert({ name: p.name, cost_price: p.costPrice, selling_price: p.sellingPrice })
      .select()
      .single();
    if (error) return setError("Could not save product.");
    setProducts((prev) => [rowToProduct(data), ...prev]);
  }, []);

  const updateProduct = useCallback(async (id, p) => {
    const { data, error } = await supabase
      .from("products")
      .update({ name: p.name, cost_price: p.costPrice, selling_price: p.sellingPrice })
      .eq("id", id)
      .select()
      .single();
    if (error) return setError("Could not update product.");
    setProducts((prev) => prev.map((x) => (x.id === id ? rowToProduct(data) : x)));
  }, []);

  const deleteProduct = useCallback(async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return setError("Could not delete product.");
    setProducts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addSale = useCallback(async (s) => {
    const { data, error } = await supabase
      .from("sales")
      .insert({
        product_id: s.productId,
        product_name: s.productName,
        cost_price: s.costPrice,
        selling_price: s.sellingPrice,
        qty: s.qty,
        profit: s.profit,
        sale_date: s.date,
      })
      .select()
      .single();
    if (error) return setError("Could not log sale.");
    setSales((prev) => [rowToSale(data), ...prev]);
  }, []);

  const deleteSale = useCallback(async (id) => {
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) return setError("Could not delete sale.");
    setSales((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { products, sales, ready, error, setError, addProduct, updateProduct, deleteProduct, addSale, deleteSale };
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
      style={{ background: COLORS.green, color: COLORS.cream }}
    >
      <Check size={16} style={{ color: COLORS.amber }} />
      {message}
    </div>
  );
}

function SellTab({ products, sales, addSale, notify }) {
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);

  const todaySales = sales.filter((s) => s.date === todayISO());
  const todayRevenue = todaySales.reduce((a, s) => a + s.sellingPrice * s.qty, 0);
  const todayProfit = todaySales.reduce((a, s) => a + s.profit, 0);

  const logSale = async () => {
    if (!selected || qty < 1) return;
    await addSale({
      productId: selected.id,
      productName: selected.name,
      costPrice: selected.costPrice,
      sellingPrice: selected.sellingPrice,
      qty,
      profit: (selected.sellingPrice - selected.costPrice) * qty,
      date: todayISO(),
    });
    notify(`Logged ${qty} × ${selected.name}`);
    setSelected(null);
    setQty(1);
  };

  if (products.length === 0) {
    return (
      <div className="px-5 pt-10 text-center">
        <Package size={40} style={{ color: COLORS.amber }} className="mx-auto mb-3" />
        <p className="font-semibold" style={{ color: COLORS.ink }}>No products yet</p>
        <p className="text-sm mt-1 opacity-70">Add your first product in the Stock tab to start logging sales.</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div
        className="mx-4 mt-4 rounded-2xl p-4 flex justify-between items-center"
        style={{ background: COLORS.green, color: COLORS.cream }}
      >
        <div>
          <p className="text-xs uppercase tracking-wide opacity-70">Today's revenue</p>
          <p className="text-xl font-bold">{money(todayRevenue)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide opacity-70">Today's profit</p>
          <p className="text-xl font-bold" style={{ color: COLORS.amber }}>{money(todayProfit)}</p>
        </div>
      </div>

      <div className="px-4 mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.greenLight }}>
          Pick a product
        </p>
        <div className="grid grid-cols-2 gap-2">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelected(p); setQty(1); }}
              className="text-left rounded-xl px-3 py-3 border transition-colors"
              style={{
                borderColor: selected?.id === p.id ? COLORS.amber : COLORS.line,
                background: selected?.id === p.id ? "#FCEFD8" : "white",
              }}
            >
              <p className="font-semibold text-sm leading-tight" style={{ color: COLORS.ink }}>{p.name}</p>
              <p className="text-xs opacity-60 mt-0.5">{money(p.sellingPrice)} / unit</p>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-x-0 z-50 rounded-t-3xl shadow-2xl px-5 pt-5" style={{ background: "white", borderTop: `1px solid ${COLORS.line}`, bottom: "78px", paddingBottom: "1.5rem" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-lg" style={{ color: COLORS.ink }}>{selected.name}</p>
              <p className="text-xs opacity-60">{money(selected.sellingPrice)} each · cost {money(selected.costPrice)}</p>
            </div>
            <button onClick={() => setSelected(null)} className="p-2 rounded-full" style={{ background: COLORS.cream }}>
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 mb-5">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: COLORS.cream, color: COLORS.green }}
            >
              <Minus size={20} />
            </button>
            <span className="text-3xl font-bold w-16 text-center" style={{ color: COLORS.ink }}>{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: COLORS.green, color: COLORS.cream }}
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="flex justify-between text-sm mb-4 px-1">
            <span className="opacity-60">Sale total</span>
            <span className="font-semibold">{money(selected.sellingPrice * qty)}</span>
          </div>
          <div className="flex justify-between text-sm mb-5 px-1">
            <span className="opacity-60">Profit</span>
            <span className="font-semibold" style={{ color: COLORS.amberDark }}>
              {money((selected.sellingPrice - selected.costPrice) * qty)}
            </span>
          </div>

          <button
            onClick={logSale}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
            style={{ background: COLORS.amber, color: COLORS.green }}
          >
            <Receipt size={18} /> Log this sale
          </button>
        </div>
      )}
    </div>
  );
}

function StockTab({ products, addProduct, updateProduct, deleteProduct, notify }) {
  const [form, setForm] = useState({ name: "", costPrice: "", sellingPrice: "" });
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const reset = () => { setForm({ name: "", costPrice: "", sellingPrice: "" }); setEditingId(null); };

  const submit = async () => {
    if (!form.name.trim() || form.costPrice === "" || form.sellingPrice === "") return;
    const payload = { name: form.name.trim(), costPrice: parseFloat(form.costPrice), sellingPrice: parseFloat(form.sellingPrice) };
    if (editingId) {
      await updateProduct(editingId, payload);
      notify("Product updated");
    } else {
      await addProduct(payload);
      notify("Product added");
    }
    reset();
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name, costPrice: String(p.costPrice), sellingPrice: String(p.sellingPrice) });
  };

  const doDelete = async (id) => {
    await deleteProduct(id);
    setConfirmDelete(null);
    notify("Product removed");
  };

  return (
    <div className="px-4 pt-4 pb-10">
      <div className="rounded-2xl p-4 mb-5" style={{ background: "white", border: `1px solid ${COLORS.line}` }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COLORS.greenLight }}>
          {editingId ? "Edit product" : "Add a product"}
        </p>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Product name (e.g. Milo 400g)"
          className="w-full mb-2 px-3 py-3 rounded-xl text-sm outline-none"
          style={{ background: COLORS.cream, color: COLORS.ink }}
        />
        <div className="flex gap-2 mb-3">
          <input
            value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            placeholder="Cost price"
            inputMode="decimal"
            className="w-1/2 px-3 py-3 rounded-xl text-sm outline-none"
            style={{ background: COLORS.cream, color: COLORS.ink }}
          />
          <input
            value={form.sellingPrice}
            onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
            placeholder="Selling price"
            inputMode="decimal"
            className="w-1/2 px-3 py-3 rounded-xl text-sm outline-none"
            style={{ background: COLORS.cream, color: COLORS.ink }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={submit}
            className="flex-1 py-3 rounded-xl font-semibold text-sm"
            style={{ background: COLORS.green, color: COLORS.cream }}
          >
            {editingId ? "Save changes" : "Add product"}
          </button>
          {editingId && (
            <button onClick={reset} className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: COLORS.cream }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: COLORS.greenLight }}>
        Your products ({products.length})
      </p>
      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "white", border: `1px solid ${COLORS.line}` }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: COLORS.ink }}>{p.name}</p>
              <p className="text-xs opacity-60 mt-0.5">
                Cost {money(p.costPrice)} · Sell {money(p.sellingPrice)} · Margin {money(p.sellingPrice - p.costPrice)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => startEdit(p)} className="text-xs font-semibold px-2 py-1.5 rounded-lg" style={{ color: COLORS.greenLight }}>
                Edit
              </button>
              {confirmDelete === p.id ? (
                <button onClick={() => doDelete(p.id)} className="text-xs font-semibold px-2 py-1.5 rounded-lg" style={{ color: "white", background: "#B4453A" }}>
                  Confirm
                </button>
              ) : (
                <button onClick={() => setConfirmDelete(p.id)} className="p-1.5 rounded-lg" style={{ color: "#B4453A" }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-sm opacity-50 text-center py-6">No products yet — add one above.</p>
        )}
      </div>
    </div>
  );
}

function downloadCSV(rows, rangeLabel) {
  const headers = ["Date", "Product", "Quantity", "Selling Price", "Cost Price", "Revenue", "Profit"];
  const csvRows = [headers.join(",")];
  rows
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((s) => {
      const revenue = s.sellingPrice * s.qty;
      const safeName = `"${s.productName.replace(/"/g, '""')}"`;
      csvRows.push([s.date, safeName, s.qty, s.sellingPrice, s.costPrice, revenue, s.profit].join(","));
    });
  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chylon-sales-${rangeLabel}-${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function SummaryTab({ sales, deleteSale }) {
  const [range, setRange] = useState("today");
  const now = new Date();

  const inRange = (s) => {
    const d = new Date(s.timestamp);
    if (range === "today") return s.date === todayISO();
    if (range === "week") return (now - d) / 86400000 <= 7;
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const filtered = sales.filter(inRange);
  const revenue = filtered.reduce((a, s) => a + s.sellingPrice * s.qty, 0);
  const cost = filtered.reduce((a, s) => a + s.costPrice * s.qty, 0);
  const profit = filtered.reduce((a, s) => a + s.profit, 0);

  const byProduct = {};
  filtered.forEach((s) => {
    byProduct[s.productName] = byProduct[s.productName] || { qty: 0, profit: 0 };
    byProduct[s.productName].qty += s.qty;
    byProduct[s.productName].profit += s.profit;
  });
  const top = Object.entries(byProduct).sort((a, b) => b[1].profit - a[1].profit).slice(0, 5);

  return (
    <div className="px-4 pt-4 pb-10">
      <div className="flex rounded-xl p-1 mb-4" style={{ background: COLORS.cream }}>
        {[["today", "Today"], ["week", "7 days"], ["month", "This month"]].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setRange(k)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold"
            style={range === k ? { background: COLORS.green, color: COLORS.cream } : { color: COLORS.ink, opacity: 0.6 }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-5 mb-5" style={{ background: "white", border: `1.5px dashed ${COLORS.line}` }}>
        <p className="text-center text-xs uppercase tracking-widest mb-3 opacity-50">Chylon Provision Store</p>
        <div className="flex justify-between text-sm py-1.5 border-t" style={{ borderColor: COLORS.line }}>
          <span className="opacity-70">Revenue</span>
          <span className="font-mono font-semibold">{money(revenue)}</span>
        </div>
        <div className="flex justify-between text-sm py-1.5 border-t" style={{ borderColor: COLORS.line }}>
          <span className="opacity-70">Cost of goods</span>
          <span className="font-mono font-semibold">{money(cost)}</span>
        </div>
        <div className="flex justify-between text-base py-2 border-t border-b mt-1" style={{ borderColor: COLORS.ink }}>
          <span className="font-bold">Profit</span>
          <span className="font-mono font-bold" style={{ color: COLORS.amberDark }}>{money(profit)}</span>
        </div>
        <p className="text-center text-xs mt-3 opacity-40">{filtered.length} sale{filtered.length !== 1 ? "s" : ""} logged</p>
      </div>

      <button
        onClick={() => downloadCSV(filtered, range)}
        disabled={filtered.length === 0}
        className="w-full mb-5 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ background: COLORS.green, color: COLORS.cream }}
      >
        <Download size={16} /> Download CSV ({range === "today" ? "today" : range === "week" ? "7 days" : "this month"})
      </button>

      {top.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: COLORS.greenLight }}>
            Top products
          </p>
          <div className="space-y-2 mb-5">
            {top.map(([name, d]) => (
              <div key={name} className="rounded-xl px-4 py-2.5 flex justify-between items-center" style={{ background: "white", border: `1px solid ${COLORS.line}` }}>
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs opacity-60">{d.qty} sold · {money(d.profit)} profit</span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: COLORS.greenLight }}>
        Sales log
      </p>
      <div className="space-y-2">
        {filtered
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((s) => (
            <div key={s.id} className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: "white", border: `1px solid ${COLORS.line}` }}>
              <div>
                <p className="text-sm font-medium">{s.qty} × {s.productName}</p>
                <p className="text-xs opacity-50">{new Date(s.timestamp).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: COLORS.amberDark }}>{money(s.profit)}</span>
                <button onClick={() => deleteSale(s.id)} className="p-1 opacity-40 hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        {filtered.length === 0 && <p className="text-sm opacity-50 text-center py-6">No sales in this period yet.</p>}
      </div>
    </div>
  );
}

export default function App() {
  const { products, sales, ready, error, setError, addProduct, updateProduct, deleteProduct, addSale, deleteSale } = useStore();
  const [tab, setTab] = useState("sell");
  const [toast, setToast] = useState(null);
  const notify = (msg) => setToast(msg);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.cream }}>
        <Loader2 className="animate-spin" style={{ color: COLORS.green }} size={28} />
      </div>
    );
  }

  const tabs = [
    { key: "sell", label: "Sell", icon: ShoppingBag },
    { key: "stock", label: "Stock", icon: Package },
    { key: "summary", label: "Summary", icon: Receipt },
  ];

  return (
    <div className="min-h-screen max-w-md mx-auto relative" style={{ background: COLORS.cream, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="px-5 pt-6 pb-3 sticky top-0 z-30" style={{ background: COLORS.cream }}>
        <p className="text-xs uppercase tracking-widest opacity-50">Welcome back</p>
        <h1 className="text-2xl font-bold" style={{ color: COLORS.green }}>Chylon Provision Store</h1>
      </div>

      {error && (
        <div className="mx-5 mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: "#FBE4E1", color: "#8A2E24" }}>
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-semibold underline">dismiss</button>
        </div>
      )}

      <div style={{ paddingBottom: "90px" }}>
        {tab === "sell" && <SellTab products={products} sales={sales} addSale={addSale} notify={notify} />}
        {tab === "stock" && <StockTab products={products} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} notify={notify} />}
        {tab === "summary" && <SummaryTab sales={sales} deleteSale={deleteSale} />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto flex z-30" style={{ background: "white", borderTop: `1px solid ${COLORS.line}` }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-3 flex flex-col items-center gap-1"
            style={{ color: tab === key ? COLORS.green : "#9B9686" }}
          >
            <Icon size={20} strokeWidth={tab === key ? 2.5 : 2} />
            <span className="text-xs font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
