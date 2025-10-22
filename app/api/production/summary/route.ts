import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ProductCategory, categorizeProductName } from "@/lib/productCategories";

type Counters = {
  producedToday: number;
  packagedToday: number;
  shippedToday: number;
  producedTotal: number;
  packagedTotal: number;
  shippedTotal: number;
};

const CATEGORY_ORDER: ProductCategory[] = [
  "baza",
  "baslik",
  "yatak",
  "komodin",
  "sifonyer",
  "bench",
  "puf",
  "other",
];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  baza: "Baza",
  baslik: "Başlık",
  yatak: "Yatak",
  komodin: "Komodin",
  sifonyer: "Şifonyer",
  bench: "Bench",
  puf: "Puf",
  other: "Diğer",
};

function createCounters(): Counters {
  return {
    producedToday: 0,
    packagedToday: 0,
    shippedToday: 0,
    producedTotal: 0,
    packagedTotal: 0,
    shippedTotal: 0,
  };
}

function isSameDay(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  const allowed = key === process.env.PRODUCTION_SECRET || key === process.env.ADMIN_SECRET;
  if (!allowed) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select("quantity, produced, packaged, shipped, produced_at, packaged_at, shipped_at, products:product_id(name)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = new Map<ProductCategory, Counters>();
  CATEGORY_ORDER.forEach((category) => summary.set(category, createCounters()));

  for (const item of data || []) {
    const category = categorizeProductName(item?.products?.name);
    const counters = summary.get(category) ?? summary.get("other")!;
    const quantity = Number(item?.quantity) || 0;

    if (item?.produced) {
      counters.producedTotal += quantity;
      if (isSameDay(item?.produced_at, startOfDay, endOfDay)) {
        counters.producedToday += quantity;
      }
    }

    if (item?.packaged) {
      counters.packagedTotal += quantity;
      if (isSameDay(item?.packaged_at, startOfDay, endOfDay)) {
        counters.packagedToday += quantity;
      }
    }

    if (item?.shipped) {
      counters.shippedTotal += quantity;
      if (isSameDay(item?.shipped_at, startOfDay, endOfDay)) {
        counters.shippedToday += quantity;
      }
    }
  }

  const ordered = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    ...summary.get(category)!,
  }));

  return NextResponse.json({ summary: ordered });
}
