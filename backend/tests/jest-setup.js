// Jest global setup — runs before each test file
// Ensure critical env vars are set for all tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-jest-global-setup-1234567890';
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.DB_NAME = process.env.DB_NAME || 'gestion_aulas_test';
