import nodemailer from "nodemailer"
import dotenv from 'dotenv';

dotenv.config();

export const generateOTP = (): string => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

export const sendOTP = async (email: string, otp: string): Promise<void> => {
  console.log(`📧 OTP for ${email}: ${otp}`);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code - Nifes Unity Flow",
      text: `Your OTP code is: ${otp}. Valid for 10 minutes.`,
      html: `<div><h2>Your OTP Code</h2><p>Your OTP code is: <b>${otp}</b></p><p>Valid for 10 minutes.</p></div>`,
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.error("Email send failed:", error);
  }
};
