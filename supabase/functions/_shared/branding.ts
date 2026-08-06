export const BRAND = {
  name: "MALPINOHDISTRO",
  bg: "#0B0B12",
  card: "#15121F",
  border: "#2A2340",
  purple: "#8B5CF6",
  purpleDark: "#6D28D9",
  text: "#F5F3FF",
  muted: "#A79FC0",
  dashboardUrl: "https://artist-hub-symphony.lovable.app/dashboard",
};

interface ShellOptions {
  preheader?: string;
  heading: string;
  subheading?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export function brandedEmail({
  preheader = "",
  heading,
  subheading,
  bodyHtml,
  ctaLabel = "Open your dashboard",
  ctaUrl = BRAND.dashboardUrl,
}: ShellOptions): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:${BRAND.bg};">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:18px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND.purpleDark},${BRAND.purple});padding:22px 26px;">
            <div style="color:#fff;font-size:17px;font-weight:800;letter-spacing:1.5px;">${BRAND.name}</div>
            <div style="color:rgba(255,255,255,.82);font-size:11px;letter-spacing:2px;">ARTIST PORTAL</div>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 26px 8px;">
            <h1 style="margin:0 0 6px;color:${BRAND.text};font-size:23px;line-height:1.3;">${heading}</h1>
            ${subheading ? `<p style="margin:0;color:${BRAND.muted};font-size:14px;">${subheading}</p>` : ""}
          </td>
        </tr>
        <tr><td style="padding:16px 26px 4px;color:${BRAND.text};font-size:14px;line-height:1.65;">${bodyHtml}</td></tr>
        <tr>
          <td align="center" style="padding:26px;">
            <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND.purpleDark},${BRAND.purple});color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:999px;">${ctaLabel}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 26px 26px;border-top:1px solid ${BRAND.border};color:${BRAND.muted};font-size:11px;line-height:1.6;">
            You are receiving this email because you have a ${BRAND.name} artist account.<br />
            &copy; ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendBrandedEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) throw new Error("BREVO_API_KEY is not configured");
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: BRAND.name, email: "no-reply@malpinohdistro.com.ng" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`Brevo failed [${res.status}]: ${body}`);
    throw new Error(`Brevo failed [${res.status}]: ${body}`);
  }
  return body;
}
