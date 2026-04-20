"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export type RegisterState = {
  success: boolean;
  error?: string;
};

export async function registerUser(
  email: string,
  password: string
): Promise<RegisterState> {
  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please provide a valid email address." };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters long.",
    };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[registerUser] Unexpected error:", err);
    return {
      success: false,
      error: "An unexpected server error occurred. Please try again.",
    };
  }
}
