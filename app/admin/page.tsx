"use client";

import { useState } from "react";

type Order = {
  id: number;
  company_name: string | null;
  taken_by: string | null;
  end_customer_name: string | null;
  contact_email: string | null;
  image_url?: string | null;
  total_excl_vat: number;
  total_incl_vat: number;
  delivery_date?: string | null;
};

type OrderItem = {
  id: number;
  order_id: number;
  quantity: number;
  color: string | null;
  note: string | null;
  produced: boolean;
  packaged: boolean;
  shipped: boolean;
  products?: { name: string | null };
  produced_at?: string | null;
  packaged_at?: string | null;
  shipped_at?: string | null;
};

type SummaryRow = {
  category: string;
  label: string;
  producedToday: number;
  packagedToday: number;
  shippedToday: number;
  producedTotal: number;
  packagedTotal: number;
  shippedTotal: number;
};

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "₺0,00";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch (error) {
    return value;
  }
}

function isSameDay(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, summaryRes] = await Promise.all([
        fetch(`/api/admin/orders?key=${encodeURIComponent(key)}`),
        fetch(`/api/production/summary?key=${encodeURIComponent(key)}`),
      ]);

      const ordersJson = await ordersRes.json();
      if (!ordersRes.ok) {
        throw new Error(ordersJson?.error || "Siparişler alınamadı");
      }

      const summaryJson = await summaryRes.json();
      if (!summaryRes.ok) {
        throw new Error(summaryJson?.error || "Günlük özet alınamadı");
      }

      setOrders(ordersJson.orders || []);
      setItems(ordersJson.items || []);
      setSummary(summaryJson.summary || []);
    } catch (err: any) {
      setError(err.message || "Beklenmeyen hata");
    } finally {
      setLoading(false);
    }
  };

  const itemsByOrder = (orderId: number) => items.filter((item) => item.order_id === orderId);

  const exportToCsv = () => {
    if (!summary.length) return;
    const headers = [
      "Kategori",
      "Bugün Üretildi",
      "Bugün Paketlendi",
      "Bugün Sevk",
      "Toplam Üretildi",
      "Toplam Paketlendi",
      "Toplam Sevk",
    ];

    const rows = summary.map((row) => [
      row.label,
      row.producedToday,
      row.packagedToday,
      row.shippedToday,
      row.producedTotal,
      row.packagedTotal,
      row.shippedTotal,
    ]);

    const csv = [headers, ...rows]
      .map((cols) => cols.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gunluk-uretim-ozet-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Yönetim Portalı</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <label>
          Anahtar:
          <input
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="ADMIN_SECRET"
            style={{ marginLeft: 8 }}
          />
        </label>
        <button onClick={loadData} disabled={!key || loading}>
          {loading ? "Yükleniyor…" : "Verileri Yükle"}
        </button>
      </div>

      {error && (
        <div style={{ color: "#b91c1c", marginTop: 12 }}>Hata: {error}</div>
      )}

      {summary.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Günlük Üretim Özeti</h2>
            <button onClick={exportToCsv}>Excel'e Aktar</button>
          </header>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Kategori</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Bugün Üretildi</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Bugün Paketlendi</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Bugün Sevk</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Toplam Üretildi</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Toplam Paketlendi</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Toplam Sevk</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.category} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 12px" }}>{row.label}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{row.producedToday}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{row.packagedToday}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{row.shippedToday}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{row.producedTotal}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{row.packagedTotal}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{row.shippedTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section style={{ marginTop: 32 }}>
        <h2>Siparişler</h2>
        {orders.length === 0 && !loading ? (
          <p>Henüz sipariş yok.</p>
        ) : (
          orders.map((order) => {
            const relatedItems = itemsByOrder(order.id);
            const producedToday = relatedItems.reduce(
              (acc, item) => acc + (item.produced && isSameDay(item.produced_at) ? item.quantity : 0),
              0
            );
            const remainingCount = relatedItems.reduce(
              (acc, item) => acc + (!item.produced ? item.quantity : 0),
              0
            );

            return (
              <article
                key={order.id}
                style={{ border: "1px solid #d1d5db", borderRadius: 12, padding: 16, marginTop: 16 }}
              >
                <header style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
                  <div>
                    <strong>#{order.id}</strong> — {order.company_name || "Firma Belirsiz"}
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Çeken: {order.taken_by || "-"} • Müşteri: {order.end_customer_name || "-"}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Mail: {order.contact_email || "-"} • Sevk Tarihi: {formatDate(order.delivery_date)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>{formatCurrency(order.total_excl_vat)} (KDV Hariç)</div>
                    <div>{formatCurrency(order.total_incl_vat)} (KDV Dahil)</div>
                  </div>
                </header>

                {order.image_url && (
                  <div style={{ marginTop: 12 }}>
                    <a href={order.image_url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                      Sipariş Görselini Aç
                    </a>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <strong>Kalemler</strong>
                  <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                    {relatedItems.map((item) => (
                      <li key={item.id} style={{ marginBottom: 4 }}>
                        {item.products?.name || "Ürün"} • Adet: {item.quantity} • Renk: {item.color || "-"} • Üretildi:
                        {item.produced ? " ✔" : " ✗"} • Paket:{item.packaged ? " ✔" : " ✗"} • Sevk:{item.shipped ? " ✔" : " ✗"}
                        {item.note ? ` • Not: ${item.note}` : ""}
                      </li>
                    ))}
                  </ul>
                  <div style={{ fontSize: 12, color: "#4b5563" }}>
                    Bugün üretildi (adet): {producedToday} • Kalan: {remainingCount}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
