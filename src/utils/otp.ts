require("dotenv").config();

import { randomInt } from "crypto";
import { MailtrapTransport } from "mailtrap";
import nodemailer from "nodemailer";

const transport = nodemailer.createTransport(
  MailtrapTransport({
    token: process.env.MAILTRAP_TOKEN!,
  })
);

export const generateOTP = (): string => {
  return randomInt(100_000, 1_000_000).toString();
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

export const sendMentorOnboardingReminder = async (name: string, email: string) => {
  const greeting = name.trim() || 'there';
  await transport.sendMail({
    from: {
      address: process.env.EMAIL_FROM!,
      name: 'Nifes Unity Flow',
    },
    to: [email],
    subject: 'Complete your NIFES UnityFlow mentor verification',
    text: `Hi ${greeting},\n\nPlease sign in to UnityFlow and complete the verification step of your mentor application. Add your NIFES fellowship position and campus, then upload an ID or leadership confirmation document.\n\nIf you have already submitted these details, you can ignore this reminder.\n\nNIFES UnityFlow Team`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f4f6f8;padding:32px 16px;color:#333;">
        <div style="max-width:560px;margin:auto;background:#fff;border-radius:8px;padding:28px;">
          <h2 style="margin-top:0;">Complete your mentor verification</h2>
          <p>Hi ${escapeHtml(greeting)},</p>
          <p>Please sign in to UnityFlow and complete the verification step of your mentor application:</p>
          <ul>
            <li>Add your NIFES fellowship position and campus.</li>
            <li>Upload an ID or leadership confirmation document.</li>
          </ul>
          <p>If you have already submitted these details, you can ignore this reminder.</p>
          <p>NIFES UnityFlow Team</p>
        </div>
      </div>
    `,
    category: 'Mentor onboarding',
  });
};

export const sendWelcomeEmail = async (name: string, email: string) => {
  const greeting = name.trim() || 'there';
  try {
    await transport.sendMail({
      from: {
        address: process.env.EMAIL_FROM!,
        name: 'Nifes Unity Flow',
      },
      to: [email],
      subject: 'Welcome to NIFES UnityFlow',
      text: `Hi ${greeting},\n\nWelcome to NIFES UnityFlow! Your account is ready. Sign in to connect with the NIFES community and explore the platform.\n\nNIFES UnityFlow Team`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#f4f6f8;padding:32px 16px;color:#333;">
          <div style="max-width:560px;margin:auto;background:#fff;border-radius:8px;padding:28px;">
            <h2 style="margin-top:0;">Welcome to NIFES UnityFlow!</h2>
            <p>Hi ${escapeHtml(greeting)},</p>
            <p>Your account is ready. Sign in to connect with the NIFES community and explore the platform.</p>
            <p>NIFES UnityFlow Team</p>
          </div>
        </div>
      `,
      category: 'Welcome',
    });
  } catch (error) {
    // A delivery issue should not prevent a user from completing registration.
    console.error('Welcome email failed:', error);
  }
};

export const sendOTP = async (
  email: string,
  otp: string,
  purpose: "verification" | "password_reset" = "verification",
) => {
  const isPasswordReset = purpose === "password_reset";

  try {
    const info = await transport.sendMail({
      from: {
        address: process.env.EMAIL_FROM!,
        name: "Nifes Unity Flow",
      },
      to: [email],
      subject: isPasswordReset
        ? "Reset your NIFES Unity Flow password"
        : "Your OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px 0;">
          <div style="max-width:500px; margin:auto; background:white; border-radius:8px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
            <h2 style="margin-bottom:10px; color:#333;">${isPasswordReset ? "Reset Your Password" : "Verify Your Account"}</h2>
            <p style="color:#555; font-size:15px;">Use the ${isPasswordReset ? "password reset" : "verification"} code below to continue.</p>

            <div style="margin:25px 0; font-size:28px; letter-spacing:6px; font-weight:bold; background:#f1f5f9; padding:15px; border-radius:6px; color:#111;">
              ${otp}
            </div>

            <p style="color:#666; font-size:14px;">
              This code will expire in <b>10 minutes</b>.
            </p>

            <p style="color:#999; font-size:13px; margin-top:25px;">
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>

          <p style="text-align:center; font-size:12px; color:#999; margin-top:20px;">
            © 2026 Nifes Unity Flow
          </p>
        </div>
      `,
      category: "OTP",
    });

    console.log("✅ Email sent:", info);
  } catch (error) {
    console.error("❌ Email failed:", error);
    throw error;
  }
};
