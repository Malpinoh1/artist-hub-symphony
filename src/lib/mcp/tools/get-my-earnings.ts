import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_earnings",
  title: "Get my earnings summary",
  description: "Return the signed-in artist's wallet balance, total earnings, available balance and recent monthly earnings.",
  inputSchema: {
    months: z.number().int().min(1).max(36).optional().describe("How many recent months to include (default 12)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ months }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = sb(ctx);
    const uid = ctx.getUserId();
    const { data: artist, error: aErr } = await client.from("artists").select("id,name,account_name,available_balance,total_earnings,wallet_balance,credit_balance").eq("id", uid).maybeSingle();
    if (aErr) return { content: [{ type: "text", text: aErr.message }], isError: true };
    const { data: monthly } = await client.from("monthly_artist_earnings").select("period_year,period_month,total_streams,total_earnings,currency").eq("artist_id", uid).order("period_year", { ascending: false }).order("period_month", { ascending: false }).limit(months ?? 12);
    const { data: summary } = await client.rpc("get_artist_stream_summary", { p_artist_id: uid });
    const payload = { artist, monthly: monthly ?? [], stream_summary: summary };
    return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
  },
});
