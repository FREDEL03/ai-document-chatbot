import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        { success: false, message: "Database query failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supabase database connected successfully!",
      test: "documents table is accessible",
      recordsFound: data.length,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json(
      { success: false, message: "Database connection failed." },
      { status: 500 }
    );
  }
}