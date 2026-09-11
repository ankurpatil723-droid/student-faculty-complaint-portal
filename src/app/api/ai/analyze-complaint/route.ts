import { NextResponse } from 'next/server';
import { analyzeComplaintIntelligence } from '@/lib/ai-intelligence-service';
import { getAllComplaints } from '@/lib/complaint-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required for AI intelligence analysis' }, { status: 400 });
    }

    const complaints = getAllComplaints();
    const aiIntelligence = analyzeComplaintIntelligence(title, description || '', complaints);

    return NextResponse.json({
      success: true,
      aiIntelligence,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'AI Intelligence processing failed' },
      { status: 500 }
    );
  }
}
