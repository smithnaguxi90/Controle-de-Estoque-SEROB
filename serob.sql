USE serob_db;

-- Desativar verificação de chaves estrangeiras para permitir apagar sem erros
SET FOREIGN_KEY_CHECKS = 0;

-- Apagar as tabelas antigas
DROP TABLE IF EXISTS movements;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS users;

-- Reativar verificação
SET FOREIGN_KEY_CHECKS = 1;