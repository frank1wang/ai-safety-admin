const express = require('express');
const { verifyToken } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// GET /overview - 总览数据
router.get('/overview', verifyToken, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTasks = await pool.query(
      'SELECT COUNT(*) as count FROM recognition_tasks WHERE created_at >= $1',
      [todayStart]
    );
    const pendingReview = await pool.query(
      "SELECT COUNT(*) as count FROM recognition_tasks WHERE review_status IS NULL OR review_status = ''"
    );
    const highRisk = await pool.query(
      "SELECT COUNT(*) as count FROM recognition_tasks WHERE risk_level = 'high' AND created_at >= $1",
      [todayStart]
    );
    const activeDevices = await pool.query(
      'SELECT COUNT(DISTINCT device_id) as count FROM recognition_tasks WHERE created_at >= $1',
      [todayStart]
    );

    res.json({
      today_recognitions: parseInt(todayTasks.rows[0].count),
      pending_review: parseInt(pendingReview.rows[0].count),
      high_risk_today: parseInt(highRisk.rows[0].count),
      active_devices: parseInt(activeDevices.rows[0].count)
    });
  } catch (err) {
    console.error('Dashboard overview error:', err);
    res.status(500).json({ error: '获取总览数据失败' });
  }
});

// GET /charts/risk-distribution - 风险等级分布饼图数据
router.get('/charts/risk-distribution', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(risk_level, 'unknown') as name, COUNT(*) as value
       FROM recognition_tasks GROUP BY risk_level ORDER BY value DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Risk distribution error:', err);
    res.status(500).json({ error: '获取风险分布数据失败' });
  }
});

// GET /charts/hazard-top10 - TOP10隐患类型柱状图数据
router.get('/charts/hazard-top10', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(hazard_type, '未知') as name, COUNT(*) as value
       FROM recognition_tasks WHERE hazard_type IS NOT NULL AND hazard_type != ''
       GROUP BY hazard_type ORDER BY value DESC LIMIT 10`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Top hazards error:', err);
    res.status(500).json({ error: '获取高频隐患数据失败' });
  }
});

// GET /charts/daily-trend - 近30天识别趋势折线图数据
router.get('/charts/daily-trend', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM recognition_tasks WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at) ORDER BY date ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Daily trend error:', err);
    res.status(500).json({ error: '获取每日趋势数据失败' });
  }
});

// GET /charts/model-usage - 各模型调用量对比
router.get('/charts/model-usage', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(model_used, 'unknown') as name, COUNT(*) as value
       FROM recognition_tasks WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY model_used ORDER BY value DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Model usage error:', err);
    res.status(500).json({ error: '获取模型调用数据失败' });
  }
});

// GET /alerts - 近期告警
router.get('/alerts', verifyToken, async (req, res) => {
  try {
    const alerts = [];

    const highRiskBurst = await pool.query(
      `SELECT COUNT(*) as count FROM recognition_tasks
       WHERE risk_level = 'high' AND created_at >= NOW() - INTERVAL '1 hour'`
    );
    if (parseInt(highRiskBurst.rows[0].count) >= 5) {
      alerts.push({
        type: 'high_risk_burst',
        level: 'warning',
        message: `过去1小时内检测到 ${highRiskBurst.rows[0].count} 条高危隐患记录`,
        count: parseInt(highRiskBurst.rows[0].count),
        timestamp: new Date()
      });
    }

    const deviceAnomaly = await pool.query(
      `SELECT device_id, COUNT(*) as count
       FROM recognition_tasks
       WHERE created_at >= NOW() - INTERVAL '1 hour'
       GROUP BY device_id HAVING COUNT(*) > 50`
    );
    for (const row of deviceAnomaly.rows) {
      alerts.push({
        type: 'device_anomaly',
        level: 'warning',
        message: `设备 ${row.device_id} 过去1小时内识别次数异常 (${row.count}次)`,
        device_id: row.device_id,
        count: parseInt(row.count),
        timestamp: new Date()
      });
    }

    const emergency = await pool.query(
      'SELECT emergency_stop, stop_reason FROM inference_settings ORDER BY id DESC LIMIT 1'
    );
    if (emergency.rows.length > 0 && emergency.rows[0].emergency_stop) {
      alerts.push({
        type: 'emergency_stop',
        level: 'critical',
        message: `AI识别服务处于紧急关停状态：${emergency.rows[0].stop_reason}`,
        timestamp: new Date()
      });
    }

    res.json(alerts);
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: '获取告警信息失败' });
  }
});

module.exports = router;
