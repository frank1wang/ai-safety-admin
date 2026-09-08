const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// GET /settings - 获取推理设置
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inference_settings ORDER BY id DESC LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({
        temperature: 0.7,
        max_tokens: 2048,
        enable_rag: true,
        enable_few_shot: true,
        emergency_stop: false
      });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get inference settings error:', err);
    res.status(500).json({ error: '获取推理设置失败' });
  }
});

// PUT /settings - 更新推理设置
router.put('/settings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { temperature, max_tokens, enable_rag, enable_few_shot } = req.body;
    const existing = await pool.query('SELECT id FROM inference_settings ORDER BY id DESC LIMIT 1');
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        'UPDATE inference_settings SET temperature=$1, max_tokens=$2, enable_rag=$3, enable_few_shot=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
        [temperature, max_tokens, enable_rag, enable_few_shot, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        'INSERT INTO inference_settings (temperature, max_tokens, enable_rag, enable_few_shot) VALUES ($1, $2, $3, $4) RETURNING *',
        [temperature, max_tokens, enable_rag, enable_few_shot]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update inference settings error:', err);
    res.status(500).json({ error: '更新推理设置失败' });
  }
});

// GET /stats - 获取调用统计
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const daily = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as request_count,
        COUNT(*) FILTER (WHERE status = 'success') as success_count,
        SUM(tokens_used) as total_tokens
       FROM api_call_logs WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at) ORDER BY date DESC`
    );

    const overall = await pool.query(
      `SELECT COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'success') as success_requests,
        AVG(tokens_used) as avg_tokens
       FROM api_call_logs WHERE created_at >= NOW() - INTERVAL '30 days'`
    );

    res.json({
      daily: daily.rows,
      overall: overall.rows[0]
    });
  } catch (err) {
    console.error('Get inference stats error:', err);
    res.status(500).json({ error: '获取调用统计失败' });
  }
});

// GET /logs - 获取API调用日志
router.get('/logs', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, device_id, model_used, status } = req.query;
    let sql = 'SELECT * FROM api_call_logs WHERE 1=1';
    const params = [];
    let idx = 1;

    if (device_id) { sql += ` AND device_id = $${idx++}`; params.push(device_id); }
    if (model_used) { sql += ` AND model_used = $${idx++}`; params.push(model_used); }
    if (status) { sql += ` AND status = $${idx++}`; params.push(status); }

    sql += ' ORDER BY created_at DESC';
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(sql, params);
    const countSql = 'SELECT COUNT(*) FROM api_call_logs WHERE 1=1' + sql.split('WHERE 1=1')[1].split('ORDER BY')[0];
    const countResult = await pool.query(countSql, params.slice(0, -2));

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get inference logs error:', err);
    res.status(500).json({ error: '获取调用日志失败' });
  }
});

// POST /limit/device - 设置单设备每日最大识别次数
router.post('/limit/device', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { device_id, max_daily_calls } = req.body;
    if (!device_id || max_daily_calls === undefined) {
      return res.status(400).json({ error: 'device_id和max_daily_calls为必填项' });
    }

    const result = await pool.query(
      `INSERT INTO device_limits (device_id, max_daily_calls) VALUES ($1, $2)
       ON CONFLICT (device_id) DO UPDATE SET max_daily_calls = $2, updated_at = NOW()
       RETURNING *`,
      [device_id, max_daily_calls]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Set device limit error:', err);
    res.status(500).json({ error: '设置设备限流失败' });
  }
});

// POST /emergency-stop - 一键关停AI识别服务
router.post('/emergency-stop', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const existing = await pool.query('SELECT id FROM inference_settings ORDER BY id DESC LIMIT 1');
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        'UPDATE inference_settings SET emergency_stop = true, stop_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [reason || '管理员手动关停', existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        'INSERT INTO inference_settings (emergency_stop, stop_reason) VALUES (true, $1) RETURNING *',
        [reason || '管理员手动关停']
      );
    }
    res.json({ message: 'AI识别服务已紧急关停', settings: result.rows[0] });
  } catch (err) {
    console.error('Emergency stop error:', err);
    res.status(500).json({ error: '紧急关停失败' });
  }
});

// GET /device-usage - 查看各设备今日调用次数
router.get('/device-usage', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT device_id, COUNT(*) as today_calls,
        COUNT(*) FILTER (WHERE status = 'success') as success_calls,
        MAX(created_at) as last_call_time
       FROM api_call_logs
       WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'
       GROUP BY device_id ORDER BY today_calls DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get device usage error:', err);
    res.status(500).json({ error: '获取设备调用统计失败' });
  }
});

module.exports = router;
