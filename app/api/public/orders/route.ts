import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type IncomingItem = {
  product_id: number;
  quantity: number;
  color?: string | null;
  note?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { company_name, taken_by, end_customer_name, contact_email, image_url, items } = body ?? {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "En az bir ürün kalemi gerekli." }, { status: 400 });
    }

    const castedItems = items as IncomingItem[];
    const ids = [...new Set(castedItems.map((item) => item.product_id))];

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id,price,name")
      .in("id", ids);

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    const priceMap = new Map<number, { price: number; name: string }>();
    products?.forEach((product: any) => {
      priceMap.set(product.id, { price: Number(product.price), name: product.name });
    });

    let total = 0;
    const orderItems = castedItems.map((incoming) => {
      const product = priceMap.get(incoming.product_id);
      if (!product) {
        throw new Error("Ürün bulunamadı: " + incoming.product_id);
      }

      const unitPrice = product.price;
      const lineTotal = unitPrice * Number(incoming.quantity);
      total += lineTotal;

      return {
        product_id: incoming.product_id,
        quantity: incoming.quantity,
        color: incoming.color || null,
        note: incoming.note || null,
        unit_price: unitPrice,
      };
    });

    const total_excl = Number(total.toFixed(2));
    const total_incl = Number((total * 1.1).toFixed(2));

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        company_name,
        taken_by,
        end_customer_name,
        contact_email,
        image_url,
        total_excl_vat: total_excl,
        total_incl_vat: total_incl,
      })
      .select("id")
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const withOrderId = orderItems.map((item) => ({ ...item, order_id: order.id }));
    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(withOrderId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, order_id: order.id, total_excl: total_excl, total_incl: total_incl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Beklenmeyen hata" }, { status: 500 });
  }
}
