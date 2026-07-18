import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyReleases from "./tools/list-my-releases";
import getRelease from "./tools/get-release";
import getMyEarnings from "./tools/get-my-earnings";
import listMyWithdrawals from "./tools/list-my-withdrawals";
import getMyProfile from "./tools/get-my-profile";
import listMyTransactions from "./tools/list-my-transactions";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "malpinohdistro-mcp",
  title: "MALPINOHDISTRO",
  version: "0.1.0",
  instructions:
    "Tools for the MALPINOHDISTRO music distribution platform. Use these to read the signed-in artist's releases, earnings, withdrawals, transactions, and profile. All calls act as the signed-in Supabase user under RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyReleases, getRelease, getMyEarnings, listMyWithdrawals, getMyProfile, listMyTransactions],
});
