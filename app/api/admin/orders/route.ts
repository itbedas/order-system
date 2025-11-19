import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (key !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const {
    data: orders,
    error: ordersError,
  } = await supabaseAdmin.from("orders").select("*").order("id", {
    ascending: false,
  });

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }

  const {
    data: items,
    error: itemsError,
  } = await supabaseAdmin
    .from("order_items")
    .select("*, products:product_id(name)")
    .order("id", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ orders, items });
}
