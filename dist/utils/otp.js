"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTP = exports.generateOTP = void 0;
require("dotenv").config();
console.log("TOKEN:", process.env.MAILTRAP_TOKEN);
const mailtrap_1 = require("mailtrap");
const nodemailer_1 = __importDefault(require("nodemailer"));
const transport = nodemailer_1.default.createTransport((0, mailtrap_1.MailtrapTransport)({
    token: process.env.MAILTRAP_TOKEN,
}));
const generateOTP = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
};
exports.generateOTP = generateOTP;
const sendOTP = async (email, otp) => {
    try {
        const info = await transport.sendMail({
            from: {
                address: process.env.EMAIL_FROM,
                name: "Nifes Unity Flow",
            },
            to: [email],
            subject: "Your OTP Code",
            html: `
        <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px 0;">
          <div style="max-width:500px; margin:auto; background:white; border-radius:8px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
            <h2 style="margin-bottom:10px; color:#333;">Verify Your Account</h2>
            <p style="color:#555; font-size:15px;">Use the verification code below to continue.</p>

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
    }
    catch (error) {
        console.error("❌ Email failed:", error);
    }
};
exports.sendOTP = sendOTP;
