import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: "Tank.io Next.js API Operational" });
}