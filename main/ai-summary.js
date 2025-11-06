const axios = require('axios');

// 硅基流动 API 配置
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const MODEL_NAME = 'THUDM/glm-4-9b-chat';

// 检查 API Key 是否设置
if (!SILICONFLOW_API_KEY) {
  console.error('错误：未设置 SILICONFLOW_API_KEY 环境变量');
  console.error('请使用: export SILICONFLOW_API_KEY=your_api_key');
  process.exit(1);
}

/**
 * 使用 AI 总结单篇文章
 * @param {string} title - 文章标题
 * @param {string} link - 文章链接
 * @returns {Promise<string>} AI 生成的总结
 */
async function summarizeArticle(title, link) {
  try {
    // 构建提示词
    const prompt = `请用中文简洁地总结这篇文章的研究工作。\n\n标题：${title}\n链接：${link}`;

    // 调用 AI API
    const response = await axios.post(
      SILICONFLOW_API_URL,
      {
        model: MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    return response.data.choices[0].message.content;

  } catch (error) {
    if (error.response) {
      console.error('API 错误:', error.response.status, error.response.data);
    } else {
      console.error('请求错误:', error.message);
    }
    throw error;
  }
}

// 导出函数供其他模块使用
module.exports = { summarizeArticle };
