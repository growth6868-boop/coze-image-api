import { NextResponse } from 'next/server';

// 简单的内存任务队列
interface Task {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  model: string;
  imageUrl?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

const taskQueue: Map<string, Task> = new Map();

// 生成任务 ID
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// 执行异步生图任务
async function processImageGenerationTask(task: Task, apiKey: string, imageUrls?: string[], ratio?: string, resolution?: string) {
  try {
    task.status = 'processing';
    
    const requestBody: Record<string, any> = {
      key: apiKey,
      model: task.model,
      prompt: task.prompt
    };
    
    if (imageUrls && imageUrls.length > 0) {
      requestBody.image_urls = imageUrls;
    }
    
    if (ratio) {
      requestBody.ratio = ratio;
    }
    
    if (resolution) {
      requestBody.resolution = resolution;
    }
    
    const response = await fetch('https://grsai.dakka.com.cn/v1/draw/nano-banana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate image');
    }
    
    const data = await response.json();
    task.imageUrl = data.imageUrl;
    task.status = 'completed';
    task.completedAt = Date.now();
  } catch (error) {
    task.status = 'failed';
    task.error = error instanceof Error ? error.message : 'Unknown error';
    task.completedAt = Date.now();
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // 检查是否是查询任务状态
  const taskId = searchParams.get('task_id');
  if (taskId) {
    const task = taskQueue.get(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      taskId: taskId,
      status: task.status,
      prompt: task.prompt,
      model: task.model,
      imageUrl: task.imageUrl,
      error: task.error,
      createdAt: task.createdAt,
      completedAt: task.completedAt
    });
  }
  
  // 获取所有参数
  const apiKey = searchParams.get('key'); // 必填
  const prompt = searchParams.get('prompt'); // 必填
  const model = searchParams.get('model') || 'nano-banana-2'; // 默认使用 nano-banana-2
  const imageUrls = searchParams.get('image_urls'); // 可选
  const ratio = searchParams.get('ratio'); // 可选
  const resolution = searchParams.get('resolution'); // 可选
  const async = searchParams.get('async') === 'true'; // 异步模式
  
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
  
  // 异步模式：创建任务并立即返回
  if (async) {
    const taskId = generateTaskId();
    const task: Task = {
      id: taskId,
      status: 'pending',
      prompt: prompt,
      model: model,
      createdAt: Date.now()
    };
    
    taskQueue.set(taskId, task);
    
    // 后台处理任务，不等待
    const imageUrlsArray = imageUrls ? imageUrls.split(',').map(url => url.trim()) : undefined;
    processImageGenerationTask(task, apiKey, imageUrlsArray, ratio, resolution);
    
    return NextResponse.json({
      success: true,
      taskId: taskId,
      status: 'pending',
      message: 'Image generation task has been queued. Use ?task_id=' + taskId + ' to check status'
    });
  }
  
  // 同步模式：等待生图完成
  try {
    // 构建请求体
    const requestBody: Record<string, any> = {
      key: apiKey,
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
        { error: errorData.message || 'Failed to generate image' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      model: model,
      prompt: prompt,
      imageUrl: data.imageUrl,
      timestamp: Date.now()
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
