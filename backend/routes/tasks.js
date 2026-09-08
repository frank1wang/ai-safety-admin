const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// GET / - 获取识别任务列表
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, device_id, hazard_type, risk_level, time_range, review_status } = req.query;
    let sql = 'SELECT * FROM recognition_tasks WHERE 1=1';
    const params = [];
    let idx = 1;

    if (device_id) { sql += ` AND device_id = $${idx++}`; params.push(device_id); }
    if (hazard_type) { sql += ` AND hazard_type = $${idx++}`; params.push(hazard_type); }
    if (risk_level) { sql += ` AND risk_level = $${idx++}`; params.push(risk_level); }
    if (review_status) { sql += ` AND review_status = $${idx++}`; params.push(review_status); }
    if (time_range) {
      const [start, end] = time_range.split(',');
      if (start && end) {
        sql += ` AND created_at BETWEEN $${idx++} AND $${idx++}`;
        params.push(start, end);
      }
    }

    sql += ' ORDER BY created_at DESC';
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(sql, params);
    const countSql = 'SELECT COUNT(*) FROM recognition_tasks WHERE 1=1' + sql.split('WHERE 1=1')[1].split('ORDER BY')[0];
    const countResult = await pool.query(countSql, params.slice(0, -2));

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

// GET /:id - 获取任务详情
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recognition_tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '任务不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get task detail error:', err);
    res.status(500).json({ error: '获取任务详情失败' });
  }
});

// POST / - 创建识别任务（APP调用）
router.post('/', async (req, res) => {
  try {
    const { device_id, image_url, recognition_result, model_used, status } = req.body;
    if (!device_id || !image_url) {
      return res.status(400).json({ error: '缺少device_id或image_url' });
    }

    const parsedResult = recognition_result ? JSON.stringify(recognition_result) : null;
    const result = await pool.query(
      'INSERT INTO recognition_tasks (device_id, image_url, recognition_result, model_used, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [device_id, image_url, parsedResult, model_used, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: '创建识别任务失败' });
  }
});

// PUT /:id/review - 管理员复核任务
router.put('/:id/review', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { review_status, review_notes } = req.body;
    if (!['correct', 'wrong', 'missed'].includes(review_status)) {
      return res.status(400).json({ error: 'review_status必须是correct/wrong/missed之一' });
    }

    const result = await pool.query(
      'UPDATE recognition_tasks SET review_status=$1, review_notes=$2, reviewed_by=$3, reviewed_at=NOW() WHERE id=$4 RETURNING *',
      [review_status, review_notes, req.userId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '任务不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Review task error:', err);
    res.status(500).json({ error: '复核任务失败' });
  }
});

// POST /:id/sample - 将复核后的任务转为样本
router.post('/:id/sample', verifyToken, requireAdmin, async (req, res) => {
  try {
    const taskResult = await pool.query('SELECT * FROM recognition_tasks WHERE id = $1', [req.params.id]);
    if (taskResult.rows.length === 0) return res.status(404).json({ error: '任务不存在' });
    const task = taskResult.rows[0];

    let hazard_type = 'unknown';
    let risk_level = 'medium';
    let expected_output = task.recognition_result;

    try {
      const parsed = typeof task.recognition_result === 'string'
        ? JSON.parse(task.recognition_result)
        : task.recognition_result;
      if (parsed && parsed.hazard_type) hazard_type = parsed.hazard_type;
      if (parsed && parsed.risk_level) risk_level = parsed.risk_level;
      if (parsed) expected_output = JSON.stringify(parsed);
    } catch (e) { /* use defaults */ }

    const result = await pool.query(
      'INSERT INTO samples (image_url, hazard_type, risk_level, expected_output, sample_type, source_task_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [task.image_url, hazard_type, risk_level, expected_output, 'positive', task.id]
    );

    await pool.query('UPDATE recognition_tasks SET converted_to_sample = true WHERE id = $1', [req.params.id]);
    res.status(201).json({ message: '已转为样本', sample: result.rows[0] });
  } catch (err) {
    console.error('Convert to sample error:', err);
    res.status(500).json({ error: '转为样本失败' });
  }
});

// GET /stats/distribution - 隐患风险分布统计
router.get('/stats/distribution', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT risk_level, COUNT(*) as count
       FROM recognition_tasks GROUP BY risk_level ORDER BY count DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get distribution error:', err);
    res.status(500).json({ error: '获取风险分布统计失败' });
  }
});

// GET /stats/top-hazards - 高频隐患排行
router.get('/stats/top-hazards', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const result = await pool.query(
      `SELECT hazard_type, COUNT(*) as count
       FROM recognition_tasks WHERE hazard_type IS NOT NULL AND hazard_type != ''
       GROUP BY hazard_type ORDER BY count DESC LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get top hazards error:', err);
    res.status(500).json({ error: '获取高频隐患排行失败' });
  }
});

// GET /stats/daily-trend - 近30天识别数量趋势
router.get('/stats/daily-trend', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count,
        COUNT(*) FILTER (WHERE review_status = 'correct') as correct_count,
        COUNT(*) FILTER (WHERE review_status = 'wrong') as wrong_count,
        COUNT(*) FILTER (WHERE review_status = 'missed') as missed_count
       FROM recognition_tasks
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at) ORDER BY date ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get daily trend error:', err);
    res.status(500).json({ error: '获取每日趋势失败' });
  }
});

module.exports = router;
