import { NextRequest, NextResponse } from "next/server";

// In-memory storage (replace with database in production)
let jobs: any[] = [];

export async function POST(req: NextRequest) {
  try {
    const { jobs: newJobs } = await req.json();
    
    if (!Array.isArray(newJobs)) {
      return NextResponse.json(
        { error: "Jobs must be an array" },
        { status: 400 }
      );
    }

    jobs = [...jobs, ...newJobs];
    
    return NextResponse.json(
      { success: true, count: newJobs.length },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create jobs" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ jobs }, { status: 200 });
}
