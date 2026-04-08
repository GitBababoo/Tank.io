
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    const body = await req.json();
    const { username, maxLevel, score, bossKills, timeAlive } = body;

    // Check if user is logged in
    const userEmail = session?.user?.email;
    
    // Logic: 
    // 1. If user is logged in via Email (Google), we save to their account in DB.
    // 2. If user is Guest, we strictly cannot save to relational DB easily without an account.
    
    if (!userEmail) {
        // Guest mode: We just return success but don't write to DB
        return NextResponse.json({ success: true, message: "Guest stats not persisted" });
    }

    // Find the user in DB
    const user = await prisma.user.findUnique({
        where: { email: userEmail }
    });

    if (user) {
        const record = await prisma.gameStat.create({
            data: {
                userId: user.id,
                score: Math.floor(score),
                maxLevel: maxLevel,
                bossKills: bossKills,
                timeAlive: timeAlive,
                tankClass: "unknown"
            }
        });
        return NextResponse.json({ success: true, record });
    }

    return NextResponse.json({ success: false, message: "User not found" });

  } catch (error) {
    console.error("Database Error:", error);
    // Fail silently to client to avoid crashing game loop
    return NextResponse.json({ success: false, error: String(error) });
  }
}
