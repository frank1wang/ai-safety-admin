const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');
const { minioClient, bucketName } = require('../config/minio');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// GET / - 获取文档列表
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rag_documents ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get RAG docs error:', err);
    res.status(500).json({ error: '获取文档列表失败' });
  }
});

// POST /upload - 上传PDF/Word文档到MinIO并解析
router.post('/upload', verifyToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });

    const { title, description } = req.body;
    const objectName = `rag/${Date.now()}_${req.file.originalname}`;

    await minioClient.putObject(bucketName, objectName, req.file.buffer, req.file.size, {
      'Content-Type': req.file.mimetype
    });

    const fileUrl = `${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`}/${bucketName}/${objectName}`;

    let extractedText = '';
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(req.file.buffer);
      extractedText = data.text;
    } catch (e) {
      extractedText = req.file.buffer.toString('utf-8').substring(0, 50000);
    }

    const chunks = [];
    const chunkSize = 1000;
    const overlap = 200;
    for (let i = 0; i < extractedText.length; i += chunkSize - overlap) {
      chunks.push(extractedText.slice(i, i + chunkSize));
    }

    const result = await pool.query(
      'INSERT INTO rag_documents (title, description, file_url, file_type, extracted_text, chunk_count, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title || req.file.originalname, description, fileUrl, req.file.mimetype, extractedText, chunks.length, true]
    );

    for (let i = 0; i < chunks.length; i++) {
      await pool.query(
        'INSERT INTO rag_chunks (document_id, chunk_index, content) VALUES ($1, $2, $3)',
        [result.rows[0].id, i, chunks[i]]
      );
    }

    res.status(201).json({ message: '上传并解析成功', document: result.rows[0], chunks: chunks.length });
  } catch (err) {
    console.error('RAG upload error:', err);
    res.status(500).json({ error: '上传或解析失败' });
  }
});

// DELETE /:id - 删除文档
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const doc = await pool.query('SELECT file_url FROM rag_documents WHERE id = $1', [req.params.id]);
    if (doc.rows.length === 0) return res.status(404).json({ error: '文档不存在' });

    const fileUrl = doc.rows[0].file_url;
    if (fileUrl && fileUrl.includes(bucketName)) {
      const objectName = fileUrl.split(`${bucketName}/`)[1];
      if (objectName) {
        try { await minioClient.removeObject(bucketName, objectName); } catch (e) { console.warn('Remove RAG file failed:', e); }
      }
    }

    await pool.query('DELETE FROM rag_chunks WHERE document_id = $1', [req.params.id]);
    await pool.query('DELETE FROM rag_documents WHERE id = $1', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete RAG doc error:', err);
    res.status(500).json({ error: '删除文档失败' });
  }
});

// POST /:id/toggle - 启用/禁用文档
router.post('/:id/toggle', verifyToken, requireAdmin, async (req, res) => {
  try {
    const current = await pool.query('SELECT is_active FROM rag_documents WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: '文档不存在' });

    const newStatus = !current.rows[0].is_active;
    const result = await pool.query(
      'UPDATE rag_documents SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newStatus, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle RAG doc error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// POST /test - 测试RAG检索（简单关键词匹配）
router.post('/test', verifyToken, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: '需要提供查询内容' });

    const keywords = query.split(/\s+/).filter(k => k.length > 1);
    if (keywords.length === 0) return res.status(400).json({ error: '查询内容无效' });

    const sql =
      `SELECT d.id, d.title, c.chunk_index, c.content,
        (${keywords.map(() => `CASE WHEN c.content ILIKE $${keywords.indexOf(keywords[0]) + 2} THEN 1 ELSE 0 END`).join(' + ')}) as relevance
       FROM rag_chunks c
       JOIN rag_documents d ON c.document_id = d.id
       WHERE d.is_active = true AND (${keywords.map((_, i) => `c.content ILIKE $${i + 2}`).join(' OR ')})
       ORDER BY relevance DESC, c.chunk_index ASC
       LIMIT 5`;

    const params = [query, ...keywords.map(k => `%${k}%`)];
    const result = await pool.query(sql, params);
    res.json({ query, results: result.rows });
  } catch (err) {
    console.error('RAG test error:', err);
    res.status(500).json({ error: '检索失败' });
  }
});

// GET /status - 获取RAG知识库状态
router.get('/status', verifyToken, async (req, res) => {
  try {
    const docStats = await pool.query(
      `SELECT COUNT(*) as total_docs,
        COUNT(*) FILTER (WHERE is_active = true) as active_docs,
        SUM(chunk_count) as total_chunks
       FROM rag_documents`
    );
    const recentDocs = await pool.query(
      'SELECT id, title, is_active, created_at FROM rag_documents ORDER BY created_at DESC LIMIT 5'
    );
    res.json({
      stats: docStats.rows[0],
      recent_documents: recentDocs.rows
    });
  } catch (err) {
    console.error('Get RAG status error:', err);
    res.status(500).json({ error: '获取知识库状态失败' });
  }
});

module.exports = router;
