require('dotenv').config();

const AI_MODELS = {
  'deepseek-vl': {
    name: 'DeepSeek Vision',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-vl',
  },
  'qwen-vl': {
    name: 'Qwen-VL',
    baseURL: 'https://dashscope.aliyuncs.com/api/v1',
    apiKey: process.env.QWEN_API_KEY,
    model: 'qwen-vl-plus',
  },
  'gemini-pro-vision': {
    name: 'Gemini Pro Vision',
    baseURL: 'https://generativelanguage.googleapis.com/v1',
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-pro-vision',
  },
};

function getDefaultModel() {
  const defaultKey = process.env.DEFAULT_AI_MODEL || 'qwen-vl';
  return AI_MODELS[defaultKey] || AI_MODELS['qwen-vl'];
}

function getAllModels() {
  return Object.entries(AI_MODELS).map(([key, config]) => ({
    id: key,
    name: config.name,
    configured: !!config.apiKey,
  }));
}

module.exports = { AI_MODELS, getDefaultModel, getAllModels };
