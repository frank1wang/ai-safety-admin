const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');
const { minioClient, bucketName } = require('../config/minio');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// GET / - 获取样本列表（分页、筛选、搜索）
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, hazard_type, sample_type, search } = req.query;
    let sql = 'SELECT * FROM samples WHERE 1=1';
    const params = [];
    let idx = 1;

    if (hazard_type) { sql += ` AND hazard_type = $${idx++}`; params.push(hazard_type); }
    if (sample_type) { sql += ` AND sample_type = $${idx++}`; params.push(sample_type); }
    if (search) { sql += ` AND (hazard_type ILIKE $${idx} OR expected_output ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

    sql += ' ORDER BY created_at DESC';
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(sql, params);
    const countSql = 'SELECT COUNT(*) FROM samples WHERE 1=1' + sql.split('WHERE 1=1')[1].split('ORDER BY')[0];
    const countResult = await pool.query(countSql, params.slice(0, -2));

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get samples error:', err);
    res.status(500).json({ error: '获取样本列表失败' });
  }
});

// GET /featured - 获取精选样本
router.get('/featured', verifyToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await pool.query(
      'SELECT * FROM samples WHERE is_featured = true ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get featured samples error:', err);
    res.status(500).json({ error: '获取精选样本失败' });
  }
});

// POST / - 创建样本（上传图片到MinIO）
router.post('/', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { hazard_type, risk_level, expected_output, sample_type, is_featured, annotation_data } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
      const objectName = `samples/${Date.now()}_${req.file.originalname}`;
      await minioClient.putObject(bucketName, objectName, req.file.buffer, req.file.size, {
        'Content-Type': req.file.mimetype
      });
      image_url = `${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`}/${bucketName}/${objectName}`;
    }

    const result = await pool.query(
      'INSERT INTO samples (image_url, hazard_type, risk_level, expected_output, sample_type, is_featured, annotation_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [image_url, hazard_type, risk_level, expected_output, sample_type || 'positive', is_featured === 'true' || is_featured === true, annotation_data ? JSON.stringify(annotation_data) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create sample error:', err);
    res.status(500).json({ error: '创建样本失败' });
  }
});

// PUT /:id - 更新样本
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { image_url, hazard_type, risk_level, expected_output, sample_type, is_featured, annotation_data } = req.body;
    const result = await pool.query(
      'UPDATE samples SET image_url=$1, hazard_type=$2, risk_level=$3, expected_output=$4, sample_type=$5, is_featured=$6, annotation_data=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [image_url, hazard_type, risk_level, expected_output, sample_type, is_featured, annotation_data ? JSON.stringify(annotation_data) : null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '样本不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update sample error:', err);
    res.status(500).json({ error: '更新样本失败' });
  }
});

// DELETE /:id - 删除样本
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const sample = await pool.query('SELECT image_url FROM samples WHERE id = $1', [req.params.id]);
    if (sample.rows.length === 0) return res.status(404).json({ error: '样本不存在' });

    const imageUrl = sample.rows[0].image_url;
    if (imageUrl && imageUrl.includes(bucketName)) {
      const objectName = imageUrl.split(`${bucketName}/`)[1];
      if (objectName) {
        try { await minioClient.removeObject(bucketName, objectName); } catch (e) { console.warn('Remove image from MinIO failed:', e); }
      }
    }

    await pool.query('DELETE FROM samples WHERE id = $1', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete sample error:', err);
    res.status(500).json({ error: '删除样本失败' });
  }
});

// POST /:id/feature - 标记/取消标记精选样本
router.post('/:id/feature', verifyToken, requireAdmin, async (req, res) => {
  try {
    const current = await pool.query('SELECT is_featured FROM samples WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: '样本不存在' });

    const newFeatured = !current.rows[0].is_featured;
    const result = await pool.query(
      'UPDATE samples SET is_featured = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newFeatured, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Feature sample error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// GET /groups - 按隐患类型分组统计
router.get('/groups', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT hazard_type, risk_level, COUNT(*) as count,
        COUNT(*) FILTER (WHERE is_featured = true) as featured_count
       FROM samples GROUP BY hazard_type, risk_level ORDER BY count DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get sample groups error:', err);
    res.status(500).json({ error: '获取分组统计失败' });
  }
});

// POST /app/upload - APP上传识别原图和结果到云端
router.post('/app/upload', async (req, res) => {
  try {
    const { device_id, image_url, recognition_result } = req.body;
    if (!device_id || !image_url) {
      return res.status(400).json({ error: '缺少device_id或image_url' });
    }

    const result = await pool.query(
      'INSERT INTO app_uploads (device_id, image_url, recognition_result, uploaded_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [device_id, image_url, recognition_result ? JSON.stringify(recognition_result) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('APP upload error:', err);
    res.status(500).json({ error: '上传失败' });
  }
});

module.exports = router;
