/**
 * send-otp-email — Supabase Edge Function
 *
 * Sends OTP code to customer via Gmail SMTP (nodemailer).
 * The app calls the RPC first (status update + OTP generation),
 * then passes otp_plain and customer_email here for email delivery.
 *
 * Request body: { task_id, otp_plain, customer_email }
 *
 * Environment variables (set via `supabase secrets set`):
 *   GMAIL_USER, GMAIL_APP_PASSWORD
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body: { task_id?: string; otp_plain?: string; customer_email?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { otp_plain, customer_email } = body;

    if (!otp_plain || !customer_email) {
      return jsonResponse({ error: "otp_plain and customer_email are required" }, 400);
    }

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      console.warn("[send-otp-email] Gmail credentials not set");
      return jsonResponse({ success: false, error: "Gmail not configured" }, 500);
    }

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
          ">${otp_plain}</span>
        </div>

        <p style="color:#888;font-size:13px;line-height:1.5;">
          Энэ код 10 минут хүчинтэй.<br/>
          Хэрэв та захиалга хийгээгүй бол энэ имэйлийг үл тоомсорлоно уу.
        </p>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });

    await transporter.sendMail({
      from: `"Delivery App" <${gmailUser}>`,
      to: customer_email,
      subject: "Хүргэлтийн баталгаажуулах код (ePOD)",
      html,
    });

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[send-otp-email] Error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
