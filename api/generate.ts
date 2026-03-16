import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompts = [] } = body;

  return NextResponse.json({
    status: 'ready',
    receivedPrompts: prompts.length,
    message: '✅ 部署成功！准备好接收图片生成请求'
  });
}
