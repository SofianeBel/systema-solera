import { NextResponse } from "next/server";
import { getSoleraLivePublicConfig } from "@/lib/solera-live/config";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getSoleraLivePublicConfig());
}
