import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ProductionKey = string | null;

function isProductionKey(key: ProductionKey): boolean {
  return key === process.env.PRODUCTION_SECRET;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const department = (searchParams.get("dep") ?? "").toLowerCase();

  if (!isProductionKey(key)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select("*, products:product_id(name), orders:order_id(company_name,delivery_date)")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtered = (data ?? []).filter((row: any) => {
    const name = (row.products?.name ?? "").toLowerCase();

    if (department === "terzi") return true;
    if (department === "baza") return name.includes("baza");
    if (department === "baslik" || department === "başlık") {
      return name.includes("başlık") || name.includes("baslik");
    }
    if (department === "yatak") return name.includes("yatak");

    return true;
  });

  return NextResponse.json({ items: filtered });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!isProductionKey(key)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const { id, produced, packaged, shipped } = body ?? {};

  if (!id) {
    return NextResponse.json({ error: "Eksik" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("order_items")
    .update({ produced, packaged, shipped })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
