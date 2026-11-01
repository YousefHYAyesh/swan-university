import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | null | undefined;

function getTransport() {
  if (transport !== undefined) return transport;
  const url = process.env.SMTP_URL;
  transport = url ? nodemailer.createTransport(url) : null;
  return transport;
}

/** Sends through SMTP_URL when configured; otherwise logs in development and does nothing. */
export async function sendEmail(msg: { to: string; subject: string; text: string }) {
  const t = getTransport();
  if (!t) {
    if (process.env.NODE_ENV === "development") console.info(`[email skipped] ${msg.to}: ${msg.subject}`);
    return;
  }
  await t.sendMail({ from: process.env.MAIL_FROM ?? "Swan University <no-reply@swan.edu>", ...msg });
}
