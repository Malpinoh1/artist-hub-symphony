import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Return the signed-in user's profile, role list, and linked artist record.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = sb(ctx);
    const uid = ctx.getUserId();
    const [{ data: profile }, { data: roles }, { data: artist }] = await Promise.all([
      client.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      client.from("user_roles").select("role").eq("user_id", uid),
      client.from("artists").select("id,name,email,account_name,status,available_balance,total_earnings").eq("id", uid).maybeSingle(),
    ]);
    const payload = { user_id: uid, email: ctx.getUserEmail(), profile, roles: (roles ?? []).map((r: any) => r.role), artist };
    return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
  },
});
