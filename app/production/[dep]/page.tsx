"use client";

import { useEffect, useMemo, useState } from "react";

type ProductionField = "produced" | "packaged" | "shipped";

type ProductionItem = {
  id: number;
  quantity: number;
  color: string | null;
  note: string | null;
  produced: boolean;
  packaged: boolean;
  shipped: boolean;
  produced_at: string | null;
  packaged_at: string | null;
  shipped_at: string | null;
  products?: { name: string | null };
  orders?: { company_name: string | null; delivery_date: string | null };
};

type GroupedCompany = {
  company: string;
  items: ProductionItem[];
  producedToday: number;
  packagedToday: number;
  shippedToday: number;
  totalQuantity: number;
};

function isSameDay(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    return date.toLocaleDateString();
  } catch (err) {
    return value;
  }
}

export default function ProductionPage({ params }: { params: { dep: string } }) {
  const dep = params.dep.toLowerCase();
  const [key, setKey] = useState("");
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const isTerzi = dep === "terzi";

  const load = async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/production/items?key=${encodeURIComponent(key)}&dep=${encodeURIComponent(dep)}`
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || "Veriler alınamadı");
      }
      setItems(json.items || []);
    } catch (err: any) {
      setError(err.message || "Beklenmeyen hata");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (key) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, dep]);

  const toggle = async (item: ProductionItem, field: ProductionField, value: boolean) => {
    setPendingId(item.id);
    setError(null);
    try {
      const response = await fetch(`/api/production/items?key=${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, [field]: value }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || "Güncelleme başarısız");
      }

      setItems((current) =>
        current.map((row) => {
          if (row.id !== item.id) return row;
          const next: ProductionItem = {
            ...row,
            [field]: value,
            [`${field}_at`]: value ? new Date().toISOString() : null,
          } as ProductionItem;

          if (field === "produced" && !value) {
            next.packaged = false;
            next.packaged_at = null;
            next.shipped = false;
            next.shipped_at = null;
          }

          if (field === "packaged" && !value) {
            next.shipped = false;
            next.shipped_at = null;
          }

          return next;
        })
      );
    } catch (err: any) {
      setError(err.message || "Beklenmeyen hata");
    } finally {
      setPendingId(null);
    }
  };

  const grouped = useMemo<GroupedCompany[]>(() => {
    const map = new Map<string, ProductionItem[]>();
    for (const item of items) {
      const company = item.orders?.company_name?.trim() || "Firma Belirsiz";
      if (!map.has(company)) {
        map.set(company, []);
      }
      map.get(company)!.push(item);
    }

    return Array.from(map.entries()).map(([company, companyItems]) => {
      const producedToday = companyItems.reduce(
        (acc, current) => acc + (current.produced && isSameDay(current.produced_at) ? current.quantity : 0),
        0
      );
      const packagedToday = companyItems.reduce(
        (acc, current) => acc + (current.packaged && isSameDay(current.packaged_at) ? current.quantity : 0),
        0
      );
      const shippedToday = companyItems.reduce(
        (acc, current) => acc + (current.shipped && isSameDay(current.shipped_at) ? current.quantity : 0),
        0
      );
      const totalQuantity = companyItems.reduce((acc, current) => acc + current.quantity, 0);

      return { company, items: companyItems, producedToday, packagedToday, shippedToday, totalQuantity };
    });
  }, [items]);

  const dailyTotals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (item.produced && isSameDay(item.produced_at)) {
          acc.producedToday += item.quantity;
        }
        if (item.packaged && isSameDay(item.packaged_at)) {
          acc.packagedToday += item.quantity;
        }
        if (item.shipped && isSameDay(item.shipped_at)) {
          acc.shippedToday += item.quantity;
        }
        return acc;
      },
      { producedToday: 0, packagedToday: 0, shippedToday: 0 }
    );
  }, [items]);

  return (
    <div style={{ padding: 16 }}>
      <h1>Üretim: {dep.toUpperCase()}</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Anahtar:
          <input
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="PRODUCTION_SECRET"
            style={{ marginLeft: 8 }}
          />
        </label>
        <button onClick={load} disabled={!key || loading}>
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>

      {error && (
        <div style={{ color: "#b91c1c", marginTop: 12 }}>Hata: {error}</div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ border: "1px solid #e5e7eb", padding: 12, borderRadius: 8 }}>
          <strong>Bugün Üretildi:</strong> {dailyTotals.producedToday}
        </div>
        {!isTerzi && (
          <>
            <div style={{ border: "1px solid #e5e7eb", padding: 12, borderRadius: 8 }}>
              <strong>Bugün Paketlendi:</strong> {dailyTotals.packagedToday}
            </div>
            <div style={{ border: "1px solid #e5e7eb", padding: 12, borderRadius: 8 }}>
              <strong>Bugün Sevk:</strong> {dailyTotals.shippedToday}
            </div>
          </>
        )}
      </div>

      {grouped.length === 0 && !loading ? (
        <p style={{ marginTop: 24 }}>Listelenecek sipariş bulunamadı.</p>
      ) : (
        grouped.map((group) => (
          <div
            key={group.company}
            style={{ border: "1px solid #d1d5db", borderRadius: 12, padding: 16, marginTop: 24 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <strong>{group.company}</strong>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Toplam Adet: {group.totalQuantity} • Bugün Üretildi: {group.producedToday}
                  {!isTerzi && (
                    <>
                      {" "}• Paket: {group.packagedToday} • Sevk: {group.shippedToday}
                    </>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#4b5563" }}>
                Sevk Tarihi: {formatDate(group.items[0]?.orders?.delivery_date)}
              </div>
            </div>

            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Ürün</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Renk</th>
                    <th style={{ textAlign: "center", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Adet</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Not</th>
                    <th style={{ textAlign: "center", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Üretildi</th>
                    {!isTerzi && (
                      <>
                        <th style={{ textAlign: "center", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Paket</th>
                        <th style={{ textAlign: "center", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>Sevk</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 12px" }}>{row.products?.name || "-"}</td>
                      <td style={{ padding: "8px 12px" }}>{row.color || "-"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>{row.quantity}</td>
                      <td style={{ padding: "8px 12px" }}>{row.note || "-"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!row.produced}
                          disabled={pendingId === row.id}
                          onChange={(event) => toggle(row, "produced", event.target.checked)}
                        />
                      </td>
                      {!isTerzi && (
                        <>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={!!row.packaged}
                              disabled={pendingId === row.id || (!row.produced && !row.packaged)}
                              onChange={(event) => toggle(row, "packaged", event.target.checked)}
                            />
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={!!row.shipped}
                              disabled={pendingId === row.id || (!row.packaged && !row.shipped)}
                              onChange={(event) => toggle(row, "shipped", event.target.checked)}
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
