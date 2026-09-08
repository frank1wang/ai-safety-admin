const express = require('express');
const pool = require('../config/database');
const { getDefaultModel } = require('../config/aiModels');
const axios = require('axios');

const router = express.Router();

// 设备级简单鉴权中间件：检查device_id是否在黑名单中
async function checkDeviceBlock(req, res, next) {
  const device_id = req.body.device_id || req.query.device_id;
  if (!device_id) {
    return res.status(400).json({ error: '缺少device_id参数' });
  }

  try {
    const blocked = await pool.query(
      'SELECT 1 FROM device_blocks WHERE device_id = $1 AND (expires_at IS NULL OR expires_at > NOW())',
      [device_id]
    );
    if (blocked.rows.length > 0) {
      return res.status(403).json({ error: '设备已被封禁' });
    }
    next();
  } catch (err) {
    console.error('Device check error:', err);
    next();
  }
}

// GET /config - 获取APP配置（隐患字典、安全标准、大模型配置、Prompt模板、推理参数）
router.get('/config', checkDeviceBlock, async (req, res) => {
  try {
    const hazards = await pool.query(
      `SELECT h.*, s.standard_code, s.standard_name, s.clause_number, s.clause_content
       FROM hazard_dictionary h
       LEFT JOIN safety_standards s ON h.related_standard_id = s.id
       WHERE h.status = 'published' ORDER BY h.risk_level DESC, h.created_at DESC`
    );

    const standards = await pool.query(
      "SELECT * FROM safety_standards WHERE status = 'active' ORDER BY category, standard_code"
    );

    const modelResult = await pool.query('SELECT * FROM model_configs WHERE is_default = true LIMIT 1');
    let modelConfig;
    if (modelResult.rows.length > 0) {
      const m = modelResult.rows[0];
      modelConfig = { model_key: m.model_key, model_name: m.model_name, base_url: m.base_url };
    } else {
      const defaultModel = getDefaultModel();
      modelConfig = { model_key: Object.keys(defaultModel).find(k => defaultModel[k]?.apiKey) || 'qwen-vl', model_name: defaultModel.name, base_url: defaultModel.baseURL };
    }

    const promptResult = await pool.query("SELECT * FROM prompts WHERE is_default = true LIMIT 1");
    let promptTemplate;
    if (promptResult.rows.length > 0) {
      promptTemplate = promptResult.rows[0];
    } else {
      promptTemplate = {
        name: '默认识别Prompt',
        prompt_text: '请识别这张施工安全图片中的隐患，输出JSON格式：{hazard_type, risk_level, description, suggestion}'
      };
    }

    const inferenceResult = await pool.query('SELECT * FROM inference_settings ORDER BY id DESC LIMIT 1');
    const inference = inferenceResult.rows[0] || { temperature: 0.7, max_tokens: 2048, enable_rag: true, enable_few_shot: true };

    const fewShotResult = await pool.query(
      'SELECT * FROM samples WHERE is_featured = true ORDER BY created_at DESC LIMIT 5'
    );

    res.json({
      hazards: hazards.rows,
      standards: standards.rows,
      model_config: modelConfig,
      prompt_template: promptTemplate,
      inference_settings: {
        temperature: inference.temperature,
        max_tokens: inference.max_tokens,
        enable_rag: inference.enable_rag,
        enable_few_shot: inference.enable_few_shot
      },
      few_shot_examples: fewShotResult.rows,
      emergency_stop: inference.emergency_stop || false,
      stop_reason: inference.stop_reason || null
    });
  } catch (err) {
    console.error('Get app config error:', err);
    res.status(500).json({ error: '获取APP配置失败' });
  }
});

// POST /recognize - 图片识别
router.post('/recognize', checkDeviceBlock, async (req, res) => {
  try {
    const { device_id, image_url } = req.body;
    if (!device_id || !image_url) {
      return res.status(400).json({ error: '缺少device_id或image_url' });
    }

    const settingsResult = await pool.query('SELECT emergency_stop FROM inference_settings ORDER BY id DESC LIMIT 1');
    if (settingsResult.rows.length > 0 && settingsResult.rows[0].emergency_stop) {
      return res.status(503).json({ error: 'AI识别服务当前处于紧急关停状态' });
    }

    const limitResult = await pool.query(
      `SELECT COALESCE(max_daily_calls, 1000) as max_calls FROM device_limits WHERE device_id = $1`,
      [device_id]
    );
    const maxDaily = limitResult.rows.length > 0 ? parseInt(limitResult.rows[0].max_calls) : 1000;
    const todayUsage = await pool.query(
      'SELECT COUNT(*) as count FROM api_call_logs WHERE device_id = $1 AND created_at >= CURRENT_DATE',
      [device_id]
    );
    if (parseInt(todayUsage.rows[0].count) >= maxDaily) {
      return res.status(429).json({ error: '今日识别次数已达上限' });
    }

    const promptResult = await pool.query("SELECT * FROM prompts WHERE is_default = true LIMIT 1");
    let promptText = '请识别这张施工安全图片中的隐患，以JSON格式输出：{hazard_type, risk_level, description, suggestion, related_standard}';
    if (promptResult.rows.length > 0) promptText = promptResult.rows[0].prompt_text;

    const model = getDefaultModel();
    if (!model.apiKey) {
      return res.status(500).json({ error: 'AI模型未配置' });
    }

    let fullPrompt = promptText;
    const inference = await pool.query('SELECT enable_few_shot, enable_rag FROM inference_settings ORDER BY id DESC LIMIT 1');
    const enableFewShot = inference.rows.length === 0 || inference.rows[0].enable_few_shot;
    const enableRag = inference.rows.length === 0 || inference.rows[0].enable_rag;

    if (enableFewShot) {
      const examples = await pool.query('SELECT * FROM samples WHERE is_featured = true LIMIT 3');
      if (examples.rows.length > 0) {
        fullPrompt += '\n\n参考示例：\n';
        examples.rows.forEach((ex, i) => {
          fullPrompt += `[示例${i + 1}] 图片: ${ex.image_url}, 预期输出: ${ex.expected_output}\n`;
        });
      }
    }

    if (enableRag) {
      const keywords = ['施工', '安全', '隐患', '危险'];
      const ragResult = await pool.query(
        `SELECT d.title, c.content FROM rag_chunks c
         JOIN rag_documents d ON c.document_id = d.id
         WHERE d.is_active = true AND c.content ILIKE ANY($1)
         ORDER BY c.chunk_index LIMIT 3`,
        [keywords.map(k => `%${k}%`)]
      );
      if (ragResult.rows.length > 0) {
        fullPrompt += '\n\n相关知识：\n';
        ragResult.rows.forEach((doc, i) => {
          fullPrompt += `[知识${i + 1}] ${doc.title}: ${doc.content.substring(0, 300)}\n`;
        });
      }
    }

    const payload = {
      model: model.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: fullPrompt },
            { type: 'image_url', image_url: { url: image_url } }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 2048
    };

    const startTime = Date.now();
    let aiResult;
    let status = 'success';
    let tokensUsed = 0;

    try {
      const response = await axios.post(`${model.baseURL}/chat/completions`, payload, {
        headers: { 'Authorization': `Bearer ${model.apiKey}`, 'Content-Type': 'application/json' },
        timeout: 120000
      });
      aiResult = response.data.choices?.[0]?.message?.content || '';
      tokensUsed = response.data.usage?.total_tokens || 0;
    } catch (apiErr) {
      status = 'failed';
      aiResult = apiErr.message;
      console.error('AI API error:', apiErr.message);
    }

    let parsedResult;
    try {
      const cleaned = aiResult.replace(/```json\s*/i, '').replace(/```\s*$/, '');
      parsedResult = JSON.parse(cleaned);
    } catch (e) {
      parsedResult = { raw_text: aiResult, parse_error: true };
    }

    await pool.query(
      'INSERT INTO api_call_logs (device_id, model_used, status, tokens_used, latency_ms, request_payload, response_payload) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [device_id, model.model, status, tokensUsed, Date.now() - startTime, JSON.stringify({ image_url, prompt_length: fullPrompt.length }), JSON.stringify(parsedResult)]
    );

    if (status === 'failed') {
      return res.status(502).json({ error: 'AI识别失败', detail: aiResult });
    }

    const taskResult = await pool.query(
      'INSERT INTO recognition_tasks (device_id, image_url, recognition_result, model_used, status, hazard_type, risk_level) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [device_id, image_url, JSON.stringify(parsedResult), model.model, 'completed', parsedResult.hazard_type, parsedResult.risk_level]
    );

    res.json({
      task_id: taskResult.rows[0].id,
      result: parsedResult,
      model_used: model.model
    });
  } catch (err) {
    console.error('Recognize error:', err);
    res.status(500).json({ error: '识别失败', detail: err.message });
  }
});

// POST /sync-tasks - 同步本地识别历史到云端
router.post('/sync-tasks', checkDeviceBlock, async (req, res) => {
  try {
    const { device_id, tasks } = req.body;
    if (!device_id || !Array.isArray(tasks)) {
      return res.status(400).json({ error: '缺少device_id或tasks数组' });
    }

    const synced = [];
    for (const task of tasks) {
      const result = await pool.query(
        `INSERT INTO recognition_tasks (device_id, image_url, recognition_result, model_used, status, hazard_type, risk_level, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
         ON CONFLICT (device_id, image_url, created_at) DO NOTHING
         RETURNING *`,
        [
          device_id,
          task.image_url,
          task.recognition_result ? JSON.stringify(task.recognition_result) : null,
          task.model_used,
          task.status || 'synced',
          task.hazard_type,
          task.risk_level,
          task.created_at
        ]
      );
      if (result.rows.length > 0) synced.push(result.rows[0]);
    }

    res.json({ message: `成功同步 ${synced.length} 条记录`, synced_count: synced.length });
  } catch (err) {
    console.error('Sync tasks error:', err);
    res.status(500).json({ error: '同步失败' });
  }
});

// GET /version-check - 检查APK版本更新
router.get('/version-check', async (req, res) => {
  try {
    const { current_version } = req.query;
    const result = await pool.query(
      'SELECT * FROM app_versions ORDER BY release_date DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.json({ has_update: false });
    }

    const latest = result.rows[0];
    const hasUpdate = current_version !== latest.version_code;

    res.json({
      has_update: hasUpdate,
      latest_version: latest.version_code,
      download_url: latest.download_url,
      release_notes: latest.release_notes,
      force_update: latest.force_update || false
    });
  } catch (err) {
    console.error('Version check error:', err);
    res.status(500).json({ error: '版本检查失败' });
  }
});

// POST /feedback - 提交误判反馈
router.post('/feedback', checkDeviceBlock, async (req, res) => {
  try {
    const { device_id, task_id, feedback_type, description, image_url } = req.body;
    if (!device_id || !feedback_type) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const result = await pool.query(
      'INSERT INTO feedbacks (device_id, task_id, feedback_type, description, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [device_id, task_id, feedback_type, description, image_url]
    );

    res.status(201).json({ message: '反馈提交成功', feedback: result.rows[0] });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: '提交反馈失败' });
  }
});

module.exports = router;
