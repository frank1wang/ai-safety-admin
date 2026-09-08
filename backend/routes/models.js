const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');
const { AI_MODELS } = require('../config/aiModels');

const router = express.Router();

// GET / - 获取所有模型配置
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM model_configs ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get models error:', err);
    res.status(500).json({ error: '获取模型配置失败' });
  }
});

// POST / - 添加新模型配置
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { model_key, model_name, api_key, base_url, is_default } = req.body;
    if (!model_key || !model_name) {
      return res.status(400).json({ error: 'model_key和model_name为必填项' });
    }

    await pool.query('BEGIN');
    if (is_default) {
      await pool.query('UPDATE model_configs SET is_default = false');
    }
    const result = await pool.query(
      'INSERT INTO model_configs (model_key, model_name, api_key, base_url, is_default) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [model_key, model_name, api_key, base_url, is_default || false]
    );
    await pool.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Create model error:', err);
    res.status(500).json({ error: '添加模型配置失败' });
  }
});

// PUT /:id - 更新模型配置
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { model_key, model_name, api_key, base_url, is_default } = req.body;
    await pool.query('BEGIN');
    if (is_default) {
      await pool.query('UPDATE model_configs SET is_default = false');
    }
    const result = await pool.query(
      'UPDATE model_configs SET model_key=$1, model_name=$2, api_key=$3, base_url=$4, is_default=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [model_key, model_name, api_key, base_url, is_default, req.params.id]
    );
    await pool.query('COMMIT');
    if (result.rows.length === 0) return res.status(404).json({ error: '模型配置不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Update model error:', err);
    res.status(500).json({ error: '更新模型配置失败' });
  }
});

// DELETE /:id - 删除模型配置
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM model_configs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '模型配置不存在' });
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete model error:', err);
    res.status(500).json({ error: '删除模型配置失败' });
  }
});

// POST /:id/default - 设置默认模型
router.post('/:id/default', verifyToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('BEGIN');
    await pool.query('UPDATE model_configs SET is_default = false');
    const result = await pool.query(
      'UPDATE model_configs SET is_default = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    await pool.query('COMMIT');
    if (result.rows.length === 0) return res.status(404).json({ error: '模型配置不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Set default model error:', err);
    res.status(500).json({ error: '设置默认模型失败' });
  }
});

// GET /status - 检查各模型API key配置状态
router.get('/status', verifyToken, async (req, res) => {
  try {
    const dbModels = await pool.query('SELECT id, model_key, model_name, is_default, CASE WHEN api_key IS NOT NULL AND api_key != \'\' THEN true ELSE false END as has_key FROM model_configs');
    const envStatus = Object.entries(AI_MODELS).map(([key, config]) => ({
      model_key: key,
      model_name: config.name,
      source: 'env',
      configured: !!config.apiKey
    }));
    res.json({
      database: dbModels.rows,
      environment: envStatus
    });
  } catch (err) {
    console.error('Get model status error:', err);
    res.status(500).json({ error: '获取模型状态失败' });
  }
});

module.exports = router;
