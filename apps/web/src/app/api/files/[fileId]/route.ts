import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, apiRequest } from '@/lib/api-client';

export async function GET(_request: Request, context: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await context.params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;

  if (!accessToken) {
    return NextResponse.json({ message: '未登录，无法读取文件元数据' }, { status: 401 });
  }

  try {
    const file = await apiRequest<Record<string, unknown>>(`/files/${fileId}`, {
      auth: { accessToken },
      retryOn401: false,
    });
    return NextResponse.json(file);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : '读取文件失败' }, { status: 500 });
  }
}
