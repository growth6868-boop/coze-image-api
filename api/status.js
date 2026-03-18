module.exports = async (req, res) => {
  const taskId = req.body.task_id || req.query.task_id;

  if (!taskId) {
    return res.status(400).json({ error: "task_id is required" });
  }

  try {
    const response = await fetch('https://grsai.dakka.com.cn/v1/draw/result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GRSAI_API_KEY}`
      },
      body: JSON.stringify({ task_id: taskId })
    });

    const data = await response.json();

    if (data.code === 0) {
      const status = data.data.status === 0 ? 'PENDING' : data.data.status === 1 ? 'SUCCESS' : 'FAILED';
      
      return res.status(200).json({
        task_id: taskId,
        status: status,
        image_url: data.data.url || null
      });
    } else {
      return res.status(500).json({ error: data.message });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
