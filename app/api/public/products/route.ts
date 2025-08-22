import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export async function GET(){ const {data,error}=await supabaseAdmin.from("products").select("id,name,price").order("name"); if(error) return NextResponse.json({error:error.message},{status:500}); return NextResponse.json({products:data}); }