import nodemailer from "nodemailer"
import dotenv from 'dotenv';
import { MailtrapTransport } from "mailtrap";

dotenv.config();

export const generateOTP = (): string => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

export const sendOTP = async (email: string, otp: string): Promise<void> => {
  console.log(`📧 OTP for ${email}: ${otp}`);

  try {
    const transporter = nodemailer.createTransport(
      MailtrapTransport({
        token: process.env.MAILTRAP_TOKEN || "",
      })
    );

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: [email],
      subject: "Your OTP Code - Nifes Unity Flow",
      text: `Your OTP code is: ${otp}. Valid for 10 minutes.`,
      html: `<div style = "font-family: Arial, sans-serif; background:#f4f6f8; padding:40px 0;">
              <div style = "max-width:500px; margin:auto; background:white; border-radius:8px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);" >
              <h2 style="margin-bottom:10px; color:#333;" > Verify Your Account </h2>
              <p style = "color:#555; font-size:15px;" >
              Use the verification code below to continue.
              </p>
                <div style = "
                  margin: 25px 0;
                  font - size: 28px;
                  letter - spacing: 6px;
                  font - weight: bold;
                  background: #f1f5f9;
                  padding: 15px;
                  border - radius: 6px;
                  color:#111;
                  ">
                  ${otp}
                </div>
                <p style = "color:#666; font-size:14px;" >
                  This code will expire in <b>10 minutes </b>.
                </p>
                <p style = "color:#999; font-size:13px; margin-top:25px;" >
                  If you didn’t request this code, you can safely ignore this email.
                </p>
              </div>
                <p style = "text-align:center; font-size:12px; color:#999; margin-top:20px;" >
                   © 2026 Nifes Unity Flow
                </p>
            </div>`,
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.error("Email send failed:", error);
  }
};
