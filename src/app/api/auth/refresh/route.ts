import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Client-side refresh is no longer supported' },
    { status: 410 }
  );
}
