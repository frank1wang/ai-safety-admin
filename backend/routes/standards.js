const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');
const xlsx = require('xlsx');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all standards
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, category, status, search } = req.query;
    let sql = 'SELECT * FROM safety_standards WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (category) { sql += ` AND category = $${paramIdx++}`; params.push(category); }
    if (status) { sql += ` AND status = $${paramIdx++}`; params.push(status); }
    if (search) { sql += ` AND (standard_code ILIKE $${paramIdx} OR standard_name ILIKE $${paramIdx})`; params.push(`%${search}%`); paramIdx++; }

    sql += ' ORDER BY created_at DESC';
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await pool.query(sql, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM safety_standards');

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    res.status(500).json({ error: '获取标准列表失败' });
  }
});

// Get categories
router.get('/categories', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM safety_standards WHERE category IS NOT NULL');
    res.json(result.rows.map(r => r.category));
  } catch (err) {
    res.status(500).json({ error: '获取分类失败' });
  }
});

// Create standard
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { standard_code, standard_name, clause_number, clause_content, category } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO safety_standards (standard_code, standard_name, clause_number, clause_content, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [standard_code, standard_name, clause_number, clause_content, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '创建标准失败' });
  }
});

// Update standard
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { standard_code, standard_name, clause_number, clause_content, category, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE safety_standards SET standard_code=$1, standard_name=$2, clause_number=$3, clause_content=$4, category=$5, status=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [standard_code, standard_name, clause_number, clause_content, category, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '标准不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '更新标准失败' });
  }
});

// Delete standard
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM safety_standards WHERE id = $1', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});

// Bulk import from Excel
router.post('/import', verifyToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const imported = [];
    for (const row of data) {
      const result = await pool.query(
        'INSERT INTO safety_standards (standard_code, standard_name, clause_number, clause_content, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [row['规范编号'], row['规范名称'], row['条款号'], row['条文内容'], row['分类']]
      );
      imported.push(result.rows[0]);
    }
    res.json({ message: `成功导入 ${imported.length} 条标准`, data: imported });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: '导入失败，请检查Excel格式' });
  }
});

// Export to Excel
router.get('/export', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM safety_standards ORDER BY created_at DESC');
    const data = result.rows.map(r => ({
      '规范编号': r.standard_code,
      '规范名称': r.standard_name,
      '条款号': r.clause_number,
      '条文内容': r.clause_content,
      '分类': r.category,
      '状态': r.status,
    }));
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '安全标准库');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=safety_standards.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: '导出失败' });
  }
});

// APP API: Get active standards
router.get('/app/active', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM safety_standards WHERE status = 'active' ORDER BY category, standard_code");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: '获取标准失败' });
  }
});

module.exports = router;
