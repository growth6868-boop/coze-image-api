const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { prompt, image_urls, ratio, resolution } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  try {
    const response = await fetch('https://grsai.dakka.com.cn/v1/draw/nano-banana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GRSAI_API_KEY}`
      },
      body: JSON.stringify({
        prompt,
        image_urls,
        ratio,
        resolution
      })
    });

    const data = await response.json();

    if (data.code === 0) {
      return res.status(200).json({
        task_id: data.data.task_id,
        status: 'pending'
      });
    } else {
      return res.status(500).json({ error: data.message });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
