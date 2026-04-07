/**
 * send-otp-email — Supabase Edge Function
 *
 * Handles two actions via the `action` field in the request body:
 *   "mark_delivered"  — Transitions task to 'delivered', generates OTP hash,
 *                       sends the plain OTP to the merchant/customer by email.
 *   "resend_otp"      — Regenerates OTP for an already-delivered task whose
 *                       code has expired, then re-sends the email.
 *
 * Environment variables required:
 *   SUPABASE_URL        — set automatically by Supabase
 *   SUPABASE_ANON_KEY   — set automatically by Supabase
 *   RESEND_API_KEY      — your Resend.com API key
 *   EMAIL_FROM          — sender address, e.g. "Delivery <noreply@yourdomain.com>"
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendEmail(opts: {
  to: string;
  otpPlain: string;
  expiresAt: string;
  resendApiKey: string;
  fromAddress: string;
}): Promise<{ ok: boolean; error?: string }> {
  const expiryTime = new Date(opts.expiresAt).toLocaleTimeString("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
      <h2 style="color:#1a1a1a;margin-top:0;">Хүргэлтийн баталгаажуулах код</h2>
      <p style="color:#555;line-height:1.6;">
        Таны захиалга хүргэгдлээ. Доорх нэг удаагийн кодыг хүргэгчид өгч
        хүргэлтийг баталгаажуулна уу.
      </p>

      <div style="
        background:#f5f5f5;
        border-radius:12px;
        padding:28px 16px;
        text-align:center;
        margin:28px 0;
      ">
        <span style="
          font-size:48px;
          font-weight:700;
          letter-spacing:10px;
          color:#1a1a1a;
          font-family:monospace;
        ">${opts.otpPlain}</span>
      </div>

      <p style="color:#888;font-size:13px;line-height:1.5;">
        Энэ код <strong>${expiryTime}</strong> хүртэл хүчинтэй (10 минут).<br/>
        Хэрэв та захиалга хийгээгүй бол энэ имэйлийг үл тоомсорлоно уу.
      </p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.fromAddress,
      to: [opts.to],
      subject: "Хүргэлтийн баталгаажуулах код (ePOD)",
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: errText };
  }
  return { ok: true };
}

// ─── main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization header missing" }, 401);
    }

    // Build a Supabase client scoped to the caller's JWT so RLS is enforced
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: { task_id?: string; action?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { task_id, action = "mark_delivered" } = body;

    if (!task_id) {
      return jsonResponse({ error: "task_id is required" }, 400);
    }

    // ── Choose RPC ────────────────────────────────────────────────────────────
    const rpcName =
      action === "resend_otp" ? "resend_epod_otp" : "generate_epod_otp";

    const rpcArgs =
      action === "resend_otp"
        ? { p_task_id: task_id }
        : { p_task_id: task_id };

    const { data, error: rpcError } = await supabase.rpc(rpcName, rpcArgs);

    if (rpcError) {
      console.error(`[send-otp-email] RPC ${rpcName} error:`, rpcError);
      return jsonResponse({ error: rpcError.message }, 500);
    }

    if (!data?.success) {
      return jsonResponse({ error: data?.message ?? "RPC failed" }, 400);
    }

    const { otp_plain, customer_email, expires_at } = data as {
      otp_plain: string;
      customer_email: string;
      expires_at: string;
    };

    // ── Send email ────────────────────────────────────────────────────────────
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromAddress =
      Deno.env.get("EMAIL_FROM") ?? "Delivery <noreply@example.com>";

    if (!resendApiKey) {
      // OTP was generated; warn but don't break the delivery flow in dev
      console.warn("[send-otp-email] RESEND_API_KEY not set — skipping email");
      return jsonResponse({
        success: true,
        warning: "OTP generated but email skipped (RESEND_API_KEY not configured)",
      });
    }

    const emailResult = await sendEmail({
      to: customer_email,
      otpPlain: otp_plain,
      expiresAt: expires_at,
      resendApiKey,
      fromAddress,
    });

    if (!emailResult.ok) {
      console.error("[send-otp-email] Email send failed:", emailResult.error);
      // OTP is already stored — courier can ask the customer to check their inbox
      // once infra is fixed.  Return success so the app flow is not blocked.
      return jsonResponse({
        success: true,
        warning: "OTP generated but email delivery failed",
      });
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[send-otp-email] Unhandled error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
