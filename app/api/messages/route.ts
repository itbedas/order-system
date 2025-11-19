import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type AccessKey = string | null;

function isAuthorized(key: AccessKey): boolean {
  return (
    key === process.env.ADMIN_SECRET ||
    key === process.env.PRODUCTION_SECRET
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const orderId = Number(searchParams.get("order_id") ?? 0);

  if (!orderId) {
    return NextResponse.json({ error: "order_id gerekli" }, { status: 400 });
  }

  if (!isAuthorized(key)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("order_id", orderId)
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!isAuthorized(key)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const { order_id: orderId, sender, content } = body ?? {};

  if (!orderId || !sender || !content) {
    return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("messages")
    .insert({ order_id: orderId, sender, content });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
