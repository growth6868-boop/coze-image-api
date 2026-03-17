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
    
    console.log('Request body:', requestBody);
    console.log('Authorization header:', `Bearer ${apiKey}`);
    
    // 调用 Grsai API Nano Banana 生图接口
    // 请求方式为 POST，需要在 Authorization 请求头中传递 API Key
    const response = await fetch('https://grsai.dakka.com.cn/v1/draw/nano-banana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseText = await response.text();
    console.log('API Response Status:', response.status);
    console.log('API Response (first 300 chars):', responseText.substring(0, 300));
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `API Error: ${responseText || 'Failed to generate image'}` },
        { status: response.status }
      );
    }
    
    // 解析 SSE（Server-Sent Events）流式响应
    // 格式为: data: {...}\n\ndata: {...}
    const lines = responseText.split('\n');
    let lastValidData = null;
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6).trim();
        if (jsonStr) {
          try {
            lastValidData = JSON.parse(jsonStr);
            console.log('Parsed SSE data:', {
              id: lastValidData.id,
              status: lastValidData.status,
              progress: lastValidData.progress,
              results: lastValidData.results
            });
          } catch (e) {
            console.error('Failed to parse SSE line:', jsonStr);
          }
        }
      }
    }
    
    // 使用最后一条有效的数据
    const data = lastValidData;
    
    // 检查 API 是否返回错误码
    if (data && data.code && data.code !== 0) {
      return NextResponse.json(
        { error: data.msg || 'API error' },
        { status: 400 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'No valid response from API' },
        { status: 500 }
      );
    }
    
    // 从最后的流式响应中提取信息
    const imageUrl = data.results?.image_url || data.results?.url || 
                     (Array.isArray(data.results) && data.results[0]?.url);
    
    return NextResponse.json({
      success: true,
      model: model,
      prompt: prompt,
      status: data.status,
      progress: data.progress,
      taskId: data.id,
      imageUrl: imageUrl,
      timestamp: Date.now(),
      apiResponse: data // 调试用：返回完整 API 响应
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
