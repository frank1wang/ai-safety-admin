const express = require('express');
const { verifyToken } = require('../middleware/auth');
const pool = require('../config/database');
const xlsx = require('xlsx');

const router = express.Router();

// GET /tasks - 导出识别记录为Excel
router.get('/tasks', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, d.title as doc_title
       FROM recognition_tasks t
       LEFT JOIN rag_documents d ON d.id = t.document_id
       ORDER BY t.created_at DESC`
    );

    const data = result.rows.map(r => ({
      '任务ID': r.id,
      '设备ID': r.device_id,
      '图片URL': r.image_url,
      '隐患类型': r.hazard_type,
      '风险等级': r.risk_level,
      '识别结果': typeof r.recognition_result === 'string' ? r.recognition_result : JSON.stringify(r.recognition_result),
      '使用模型': r.model_used,
      '状态': r.status,
      '复核状态': r.review_status,
      '复核备注': r.review_notes,
      '创建时间': r.created_at,
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '识别记录');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=recognition_tasks.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export tasks error:', err);
    res.status(500).json({ error: '导出识别记录失败' });
  }
});

// GET /standards - 导出安全标准库
router.get('/standards', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM safety_standards ORDER BY category, standard_code');

    const data = result.rows.map(r => ({
      '规范编号': r.standard_code,
      '规范名称': r.standard_name,
      '条款号': r.clause_number,
      '条文内容': r.clause_content,
      '分类': r.category,
      '状态': r.status,
      '创建时间': r.created_at,
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '安全标准库');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=safety_standards.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export standards error:', err);
    res.status(500).json({ error: '导出安全标准库失败' });
  }
});

// GET /samples - 导出样本库
router.get('/samples', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM samples ORDER BY created_at DESC');

    const data = result.rows.map(r => ({
      '样本ID': r.id,
      '图片URL': r.image_url,
      '隐患类型': r.hazard_type,
      '风险等级': r.risk_level,
      '预期输出': r.expected_output,
      '样本类型': r.sample_type,
      '精选': r.is_featured ? '是' : '否',
      '标注数据': r.annotation_data,
      '来源任务ID': r.source_task_id,
      '创建时间': r.created_at,
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '样本库');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=samples.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export samples error:', err);
    res.status(500).json({ error: '导出样本库失败' });
  }
});

// GET /hazards - 导出隐患字典
router.get('/hazards', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.*, s.standard_code, s.standard_name
       FROM hazard_dictionary h
       LEFT JOIN safety_standards s ON h.related_standard_id = s.id
       ORDER BY h.risk_level DESC, h.created_at DESC`
    );

    const data = result.rows.map(r => ({
      '隐患名称': r.hazard_name,
      '风险等级': r.risk_level,
      '关联规范编号': r.standard_code,
      '关联规范名称': r.standard_name,
      '默认整改措施': r.default_rectification,
      '默认整改期限(天)': r.default_deadline_days,
      '状态': r.status,
      '版本': r.version,
      '创建时间': r.created_at,
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '隐患字典');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=hazard_dictionary.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export hazards error:', err);
    res.status(500).json({ error: '导出隐患字典失败' });
  }
});

module.exports = router;
