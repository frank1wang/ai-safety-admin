const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');
const xlsx = require('xlsx');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all hazards
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, risk_level, status, search } = req.query;
    let sql = `SELECT h.*, s.standard_code, s.standard_name 
               FROM hazard_dictionary h 
               LEFT JOIN safety_standards s ON h.related_standard_id = s.id 
               WHERE 1=1`;
    const params = [];
    let paramIdx = 1;

    if (risk_level) { sql += ` AND h.risk_level = $${paramIdx++}`; params.push(risk_level); }
    if (status) { sql += ` AND h.status = $${paramIdx++}`; params.push(status); }
    if (search) { sql += ` AND h.hazard_name ILIKE $${paramIdx++}`; params.push(`%${search}%`); paramIdx++; }

    sql += ' ORDER BY h.created_at DESC';
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await pool.query(sql, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM hazard_dictionary');

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    res.status(500).json({ error: '获取隐患列表失败' });
  }
});

// Get hazard by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.*, s.standard_code, s.standard_name 
       FROM hazard_dictionary h 
       LEFT JOIN safety_standards s ON h.related_standard_id = s.id 
       WHERE h.id = $1`, 
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '隐患不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '获取隐患详情失败' });
  }
});

// Create hazard
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { hazard_name, risk_level, related_standard_id, default_rectification, default_deadline_days, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO hazard_dictionary (hazard_name, risk_level, related_standard_id, default_rectification, default_deadline_days, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [hazard_name, risk_level, related_standard_id, default_rectification, default_deadline_days, status || 'published']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '创建隐患条目失败' });
  }
});

// Update hazard
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { hazard_name, risk_level, related_standard_id, default_rectification, default_deadline_days, status } = req.body;
  try {
    // Get current version
    const current = await pool.query('SELECT version FROM hazard_dictionary WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: '隐患不存在' });
    
    const newVersion = current.rows[0].version + 1;
    const result = await pool.query(
      'UPDATE hazard_dictionary SET hazard_name=$1, risk_level=$2, related_standard_id=$3, default_rectification=$4, default_deadline_days=$5, status=$6, version=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [hazard_name, risk_level, related_standard_id, default_rectification, default_deadline_days, status, newVersion, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '更新隐患条目失败' });
  }
});

// Delete hazard
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM hazard_dictionary WHERE id = $1', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});

// Bulk import
router.post('/import', verifyToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const imported = [];
    for (const row of data) {
      const result = await pool.query(
        'INSERT INTO hazard_dictionary (hazard_name, risk_level, default_rectification, default_deadline_days, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [row['隐患名称'], row['风险等级'], row['默认整改措施'], row['默认整改期限'] || 7, row['状态'] || 'published']
      );
      imported.push(result.rows[0]);
    }
    res.json({ message: `成功导入 ${imported.length} 条隐患`, data: imported });
  } catch (err) {
    res.status(500).json({ error: '导入失败' });
  }
});

// APP API: Get active hazards with standards
router.get('/app/active', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.*, s.standard_code, s.standard_name, s.clause_number, s.clause_content 
       FROM hazard_dictionary h 
       LEFT JOIN safety_standards s ON h.related_standard_id = s.id 
       WHERE h.status = 'published' 
       ORDER BY h.risk_level DESC, h.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: '获取隐患字典失败' });
  }
});

module.exports = router;
