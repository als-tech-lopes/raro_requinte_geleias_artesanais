import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/produtos/:path*",
    "/ingredientes/:path*",
    "/receitas/:path*",
    "/producao/:path*",
    "/clientes/:path*",
    "/vendas/:path*",
    "/admin/:path*",
    "/midias/:path*",
    "/configuracoes/:path*",
  ],
};
