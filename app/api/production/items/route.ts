import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { belongsToBaslikDepartment, categorizeProductName } from "@/lib/productCategories";

function matchesDepartment(name: string, dep: string) {
  if (dep === "terzi" || !dep) return true;
  const category = categorizeProductName(name);

  if (dep === "baza") {
    return category === "baza";
  }

  if (dep === "yatak") {
    return category === "yatak";
  }

  if (dep === "baslik" || dep === "başlık") {
    return belongsToBaslikDepartment(category);
  }

  return true;
}

function nowIso() {
  return new Date().toISOString();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const dep = (searchParams.get("dep") || "").toLowerCase();

  if (key !== process.env.PRODUCTION_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select(
      "*, products:product_id(name), orders:order_id(company_name,delivery_date)"
    )
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtered = (data || []).filter((row: any) => {
    const name = row.products?.name || "";
    return matchesDepartment(name, dep);
  });

  return NextResponse.json({ items: filtered });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (key !== process.env.PRODUCTION_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const { id, produced, packaged, shipped } = body ?? {};

  if (!id) {
    return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  }

  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("order_items")
    .select("produced, packaged, shipped")
    .eq("id", id)
    .single();

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  const updateData: Record<string, unknown> = {};
  const currentProduced = typeof existing?.produced === "boolean" ? existing.produced : false;
  const currentPackaged = typeof existing?.packaged === "boolean" ? existing.packaged : false;

  if (typeof produced === "boolean") {
    updateData.produced = produced;
    updateData.produced_at = produced ? nowIso() : null;

    if (!produced) {
      updateData.packaged = false;
      updateData.packaged_at = null;
      updateData.shipped = false;
      updateData.shipped_at = null;
    }
  }

  const effectiveProduced =
    typeof updateData.produced === "boolean" ? (updateData.produced as boolean) : currentProduced;

  if (typeof packaged === "boolean") {
    if (packaged && !effectiveProduced) {
      return NextResponse.json({ error: "Ürün üretilmeden paketlenemez" }, { status: 400 });
    }

    updateData.packaged = packaged;
    updateData.packaged_at = packaged ? nowIso() : null;

    if (!packaged) {
      updateData.shipped = false;
      updateData.shipped_at = null;
    }
  }

  const effectivePackaged =
    typeof updateData.packaged === "boolean" ? (updateData.packaged as boolean) : currentPackaged;

  if (typeof shipped === "boolean") {
    if (shipped && !effectivePackaged) {
      return NextResponse.json({ error: "Ürün paketlenmeden sevk edilemez" }, { status: 400 });
    }

    updateData.shipped = shipped;
    updateData.shipped_at = shipped ? nowIso() : null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("order_items").update(updateData).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
