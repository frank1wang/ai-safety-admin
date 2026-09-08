const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');
const { getDefaultModel } = require('../config/aiModels');
const axios = require('axios');

const router = express.Router();

// GET / - 获取所有提示词
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prompts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get prompts error:', err);
    res.status(500).json({ error: '获取提示词列表失败' });
  }
});

// GET /default - 获取默认提示词
router.get('/default', verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM prompts WHERE is_default = true LIMIT 1");
    if (result.rows.length > 0) return res.json(result.rows[0]);

    const fallback = await pool.query('SELECT * FROM prompts ORDER BY created_at DESC LIMIT 1');
    if (fallback.rows.length > 0) return res.json(fallback.rows[0]);

    res.status(404).json({ error: '未找到提示词' });
  } catch (err) {
    console.error('Get default prompt error:', err);
    res.status(500).json({ error: '获取默认提示词失败' });
  }
});

// POST / - 创建新提示词
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, prompt_text, is_default } = req.body;
    if (!name || !prompt_text) {
      return res.status(400).json({ error: 'name和prompt_text为必填项' });
    }

    await pool.query('BEGIN');
    if (is_default) {
      await pool.query('UPDATE prompts SET is_default = false');
    }
    const result = await pool.query(
      'INSERT INTO prompts (name, prompt_text, is_default) VALUES ($1, $2, $3) RETURNING *',
      [name, prompt_text, is_default || false]
    );
    await pool.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Create prompt error:', err);
    res.status(500).json({ error: '创建提示词失败' });
  }
});

// PUT /:id - 更新提示词
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, prompt_text, is_default } = req.body;
    await pool.query('BEGIN');
    if (is_default) {
      await pool.query('UPDATE prompts SET is_default = false');
    }
    const result = await pool.query(
      'UPDATE prompts SET name=$1, prompt_text=$2, is_default=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
      [name, prompt_text, is_default, req.params.id]
    );
    await pool.query('COMMIT');
    if (result.rows.length === 0) return res.status(404).json({ error: '提示词不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Update prompt error:', err);
    res.status(500).json({ error: '更新提示词失败' });
  }
});

// DELETE /:id - 删除提示词
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM prompts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '提示词不存在' });
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete prompt error:', err);
    res.status(500).json({ error: '删除提示词失败' });
  }
});

// POST /:id/default - 设置默认提示词
router.post('/:id/default', verifyToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('BEGIN');
    await pool.query('UPDATE prompts SET is_default = false');
    const result = await pool.query(
      'UPDATE prompts SET is_default = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    await pool.query('COMMIT');
    if (result.rows.length === 0) return res.status(404).json({ error: '提示词不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Set default prompt error:', err);
    res.status(500).json({ error: '设置默认提示词失败' });
  }
});

// POST /:id/test - 测试提示词（调用AI模型）
router.post('/:id/test', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { image_url } = req.body;
    if (!image_url) return res.status(400).json({ error: '需要提供测试图片URL' });

    const promptResult = await pool.query('SELECT * FROM prompts WHERE id = $1', [req.params.id]);
    if (promptResult.rows.length === 0) return res.status(404).json({ error: '提示词不存在' });
    const prompt = promptResult.rows[0];

    const model = getDefaultModel();
    if (!model.apiKey) return res.status(500).json({ error: '未配置AI模型API Key' });

    const payload = {
      model: model.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt.prompt_text },
            { type: 'image_url', image_url: { url: image_url } }
          ]
        }
      ]
    };

    const response = await axios.post(`${model.baseURL}/chat/completions`, payload, {
      headers: { 'Authorization': `Bearer ${model.apiKey}`, 'Content-Type': 'application/json' },
      timeout: 120000
    });

    const aiResult = response.data.choices?.[0]?.message?.content || '';
    let parsed;
    try {
      parsed = JSON.parse(aiResult);
    } catch (e) {
      parsed = { raw_text: aiResult };
    }

    res.json({
      prompt_used: prompt.name,
      model: model.name,
      result: parsed
    });
  } catch (err) {
    console.error('Test prompt error:', err);
    res.status(500).json({ error: '测试提示词失败', detail: err.message });
  }
});

module.exports = router;
