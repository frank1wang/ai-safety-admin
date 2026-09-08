const pool = require('./config/database');

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Safety standards library
    await client.query(`
      CREATE TABLE IF NOT EXISTS safety_standards (
        id SERIAL PRIMARY KEY,
        standard_code VARCHAR(50) NOT NULL,
        standard_name TEXT NOT NULL,
        clause_number VARCHAR(50),
        clause_content TEXT NOT NULL,
        category VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Hazard dictionary
    await client.query(`
      CREATE TABLE IF NOT EXISTS hazard_dictionary (
        id SERIAL PRIMARY KEY,
        hazard_name VARCHAR(200) NOT NULL,
        risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('high', 'medium', 'low')),
        related_standard_id INTEGER REFERENCES safety_standards(id),
        default_rectification TEXT,
        default_deadline_days INTEGER DEFAULT 7,
        status VARCHAR(20) DEFAULT 'published',
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Sample library
    await client.query(`
      CREATE TABLE IF NOT EXISTS sample_library (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        hazard_type VARCHAR(100) NOT NULL,
        risk_level VARCHAR(20) NOT NULL,
        expected_output TEXT,
        sample_type VARCHAR(20) NOT NULL CHECK (sample_type IN ('positive', 'negative')),
        is_featured BOOLEAN DEFAULT false,
        annotation_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // AI model configurations
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_model_configs (
        id SERIAL PRIMARY KEY,
        model_key VARCHAR(50) UNIQUE NOT NULL,
        model_name VARCHAR(100) NOT NULL,
        api_key TEXT NOT NULL,
        base_url TEXT,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // System prompts
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_prompts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        prompt_text TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Inference settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS inference_settings (
        id SERIAL PRIMARY KEY,
        temperature DECIMAL(3,2) DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 2048,
        enable_rag BOOLEAN DEFAULT true,
        enable_few_shot BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Recognition tasks
    await client.query(`
      CREATE TABLE IF NOT EXISTS recognition_tasks (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) NOT NULL,
        image_url TEXT NOT NULL,
        ai_result JSONB,
        hazards_detected JSONB,
        model_version VARCHAR(50),
        kb_version INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        review_status VARCHAR(20) DEFAULT 'pending',
        review_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // RAG documents
    await client.query(`
      CREATE TABLE IF NOT EXISTS rag_documents (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50),
        content_chunks JSONB,
        embedding vector(1536),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // API call logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_call_logs (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100),
        model_used VARCHAR(50),
        request_tokens INTEGER,
        response_tokens INTEGER,
        status VARCHAR(20),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Device blacklist
    await client.query(`
      CREATE TABLE IF NOT EXISTS device_blacklist (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) UNIQUE NOT NULL,
        reason TEXT,
        blocked_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert default admin
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', hashedPassword, 'admin']);

    // Insert default inference settings
    await client.query(`
      INSERT INTO inference_settings (temperature, max_tokens, enable_rag, enable_few_shot)
      VALUES (0.7, 2048, true, true)
      ON CONFLICT DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

initDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
