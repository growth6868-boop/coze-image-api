import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // 获取所有参数
  const apiKey = searchParams.get('key'); // 必填
  const prompt = searchParams.get('prompt'); // 必填
  const model = searchParams.get('model') || 'nano-banana-2'; // 默认使用 nano-banana-2
  const imageUrls = searchParams.get('image_urls'); // 可选
  const ratio = searchParams.get('ratio'); // 可选
  const resolution = searchParams.get('resolution'); // 可选
  
  // 验证必填参数
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing required parameter: key (API Key)' },
      { status: 400 }
    );
  }
  
  if (!prompt) {
    return NextResponse.json(
      { error: 'Missing required parameter: prompt' },
      { status: 400 }
    );
  }
  
  try {
    // 构建请求体
    const requestBody: Record<string, any> = {
      apikey: apiKey, // 改为 apikey 而不是 key
      model: model,
      prompt: prompt
    };
    
    // 添加可选参数
    if (imageUrls) {
      requestBody.image_urls = imageUrls.split(',').map((url: string) => url.trim());
    }
    
    if (ratio) {
      requestBody.ratio = ratio;
    }
    
    if (resolution) {
      requestBody.resolution = resolution;
    }
    
    // 调用 Grsai API Nano Banana 生图接口
    const response = await fetch('https://grsai.dakka.com.cn/v1/draw/nano-banana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.msg || errorData.message || 'Failed to generate image' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // 检查 API 是否返回错误码
    if (data.code !== 0 && data.code !== undefined) {
      return NextResponse.json(
        { error: data.msg || 'API error' },
        { status: 400 }
      );
    }
    
    // 从响应中获取图片 URL
    const imageUrl = data.data?.url || data.data?.image_url || data.imageUrl || data.image_url || data.url;
    
    return NextResponse.json({
      success: true,
      model: model,
      prompt: prompt,
      imageUrl: imageUrl,
      timestamp: Date.now(),
      apiResponse: data // 调试用：返回完整 API 响应
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
