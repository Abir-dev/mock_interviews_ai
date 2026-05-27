'use server';

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const ONE_WEEK = 60 * 60 * 24 * 7 * 1000; // 7 days
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-jwt-key');

export async function signUp(params: SignUpParams) {
    const { name, email, password } = params;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return {
                success: false,
                message: "User already exists. Please sign in instead."
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            }
        });
        
        return {
            success: true,
            message: "Account created successfully. Please sign in."
        }
    } catch (e: any) {
        console.error("Error signing up:", e);

        return {
            success: false,
            message: "An error occurred during signup. Please try again."
        }
    }
}

export async function setSessionCookie(userId: string) {
    const cookieStore = await cookies();

    const sessionCookie = await new SignJWT({ uid: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET);

    cookieStore.set('session', sessionCookie, {
        maxAge: ONE_WEEK,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
    });
}

export async function signIn(params: SignInParams) {
    const { email, password } = params;

    try {
        const userRecord = await prisma.user.findUnique({
            where: { email }
        });

        if (!userRecord) {
            return {
                success: false,
                message: "User not found. Please sign up."
            }
        }

        const isPasswordValid = await bcrypt.compare(password, userRecord.password);

        if (!isPasswordValid) {
            return {
                success: false,
                message: "Invalid credentials. Please try again."
            }
        }

        await setSessionCookie(userRecord.id);

        return {
            success: true,
            message: "Signed in successfully."
        };
    } catch (e) {
        console.error("Error signing in:", e);
        return {
            success: false,
            message: "Failed to log into an account."
        }
    }
}

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) 
        return null;

    try {
        const { payload } = await jwtVerify(sessionCookie, JWT_SECRET);
        
        if (!payload.uid) return null;

        const userRecord = await prisma.user.findUnique({
            where: { id: payload.uid as string }
        });

        if (!userRecord) return null;

        return {
            id: userRecord.id,
            name: userRecord.name,
            email: userRecord.email,
        };
    } catch (e) {
        console.error("Error verifying session:", e);
        return null;
    }
}

export async function isAuthenticated() {
    const user = await getCurrentUser();
    return !!user; 
}
