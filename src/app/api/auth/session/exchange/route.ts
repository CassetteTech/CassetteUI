import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Token exchange callback is no longer supported' },
    { status: 410 }
  );
}
