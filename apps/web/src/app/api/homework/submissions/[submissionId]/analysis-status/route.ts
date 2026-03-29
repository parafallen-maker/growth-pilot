import { NextResponse } from 'next/server';
import { serverApiRequest } from '@/lib/server-api';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await params;
  const result = await serverApiRequest(`/homework/submissions/${submissionId}/analysis-status`);
  return NextResponse.json(result);
}
