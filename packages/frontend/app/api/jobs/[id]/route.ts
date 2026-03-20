import { NextRequest, NextResponse } from "next/server";

// Import jobs array from parent route (in production, use a database)
// This is a simplified mock implementation
const jobsStore: { [key: string]: any } = {};

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const updatedJob = await req.json();
    
    jobsStore[id] = { id, ...updatedJob };
    
    return NextResponse.json(
      { success: true, job: jobsStore[id] },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    delete jobsStore[id];
    
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
