import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ShieldAlert, ArrowLeft, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

const LoginReported = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const reported = status === "success" || status === "already-reported";
  const expired = status === "invalid";

  const title = reported
    ? status === "already-reported" ? "Login already reported" : "Login reported successfully"
    : expired ? "This report link has expired" : "Unable to confirm report";
  const message = reported
    ? "Thank you for helping secure your MALPINOHDISTRO account. This sign-in has been flagged as unrecognized."
    : expired
      ? "This security report link is invalid or has expired. If you do not recognize a sign-in, reset your password and contact support."
      : "We couldn't confirm that the login was reported. Please try the link in your security alert email again. If you suspect unauthorized access, reset your password now.";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 px-4 py-12 flex items-center justify-center">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white p-7 sm:p-10 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">M</div>
          <div>
            <p className="font-display font-bold tracking-wide text-slate-900">MALPINOHDISTRO</p>
            <p className="text-xs text-slate-500">Account security</p>
          </div>
        </div>
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-5 ${reported ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {reported ? <CheckCircle2 className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-950">{title}</h1>
        <p className="mt-3 text-slate-600 leading-7">{message}</p>
        {reported && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <LockKeyhole className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-950">
                <p className="font-semibold">Secure your account now</p>
                <p className="mt-1 leading-6">Reset your password and review your active sessions. Sign out any sessions you don't recognize.</p>
              </div>
            </div>
          </div>
        )}
        <div className="mt-8 grid gap-3">
          <Button asChild className="w-full">
            <a href="https://www.malpinohdistro.com.ng/password-reset">Reset my password</a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Return to MALPINOHDISTRO</Link>
          </Button>
        </div>
        <p className="mt-7 text-center text-xs text-slate-400">If you need help, contact support@malpinohdistro.com.ng</p>
      </section>
    </main>
  );
};

export default LoginReported;
