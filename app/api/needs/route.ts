import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type AccessKey = string | null;

function isAuthorized(key: AccessKey): boolean {
  return (
    key === process.env.PRODUCTION_SECRET ||
    key === process.env.ADMIN_SECRET
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!isAuthorized(key)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const department = searchParams.get("dep");
  const query = supabaseAdmin
    .from("needs")
    .select("*")
    .order("id", { ascending: true });

  const { data, error } = department
    ? await query.eq("department", department)
    : await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ needs: data });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!isAuthorized(key)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const { department, content } = body ?? {};

  if (!department || !content) {
    return NextResponse.json({ error: "Eksik" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("needs")
    .insert({ department, content });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!isAuthorized(key)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const { id, is_done } = body ?? {};

  if (!id || typeof is_done !== "boolean") {
    return NextResponse.json({ error: "Eksik" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("needs")
    .update({ is_done })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
