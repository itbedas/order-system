import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type OrderItemInput = {
  product_id: number;
  quantity: number;
  color?: string | null;
  note?: string | null;
};

type CreateOrderBody = {
  company_name?: string;
  taken_by?: string;
  end_customer_name?: string;
  contact_email?: string;
  image_url?: string;
  items?: OrderItemInput[];
};

export async function POST(req: Request) {
  try {
    const body: CreateOrderBody = await req.json();
    const {
      company_name,
      taken_by,
      end_customer_name,
      contact_email,
      image_url,
      items,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "En az bir ürün kalemi gerekli." },
        { status: 400 }
      );
    }

    const productIds = [...new Set(items.map((item) => item.product_id))];

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, price, name")
      .in("id", productIds);

    if (productsError) {
      return NextResponse.json(
        { error: productsError.message },
        { status: 500 }
      );
    }

    const priceMap = new Map<number, { price: number; name: string }>();
    products?.forEach((product) => {
      priceMap.set(product.id, {
        price: Number(product.price),
        name: product.name,
      });
    });

    let total = 0;
    const orderItems = items.map((item) => {
      const product = priceMap.get(item.product_id);

      if (!product) {
        throw new Error(`Ürün bulunamadı: ${item.product_id}`);
      }

      const unitPrice = product.price;
      const lineTotal = unitPrice * Number(item.quantity);

      total += lineTotal;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        color: item.color ?? null,
        note: item.note ?? null,
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

    const itemsWithOrderId = orderItems.map((orderItem) => ({
      ...orderItem,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(itemsWithOrderId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      total_excl: total_excl,
      total_incl: total_incl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Beklenmeyen hata";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
