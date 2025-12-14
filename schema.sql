-- 1. Criação do Banco de Dados
CREATE DATABASE IF NOT EXISTS serob_db;
USE serob_db;

-- 2. Tabela de Usuários
-- Armazena os dados de login e perfil dos utilizadores
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    initials VARCHAR(5) NOT NULL,
    color VARCHAR(20) DEFAULT 'blue',
    password VARCHAR(255) NOT NULL, -- Em produção, use hash (bcrypt), aqui texto puro para compatibilidade com seu demo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Materiais (Estoque)
-- Armazena os itens, quantidades e níveis de alerta
CREATE TABLE IF NOT EXISTS materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contract_code VARCHAR(50),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INT DEFAULT 0,
    max_quantity INT DEFAULT 100, -- Ponto de ressuprimento/meta
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Tabela de Movimentações
-- Histórico de entradas e saídas
CREATE TABLE IF NOT EXISTS movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    user_id INT NOT NULL,
    type ENUM('in', 'out') NOT NULL,
    quantity INT NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. Inserção de Dados Iniciais (Seed)
-- Baseado no seu arquivo index.html

-- Usuários
INSERT INTO users (name, email, role, initials, color, password) VALUES
('Jefferson de Araújo Silva', 'jefferson.araujo@camara.leg.br', 'admin', 'JA', 'blue', 'serob.admin'),
('Jessé Souza dos Anjos', 'jesse.anjos@camara.leg.br', 'user', 'JS', 'emerald', 'serob.user'),
('Antônio Pinto Melo Sousa Júnior', 'antoniosousa.junior@camara.leg.br', 'user', 'AP', 'purple', 'serob.user');

-- Materiais
INSERT INTO materials (contract_code, sku, name, category, quantity, max_quantity) VALUES
('B.16.04.007', '39201', 'GÁS 13 KG', 'DEP. C4 - GÁS', 27, 40),
('B.02.03.001', '20827', 'IMPERMEABILIZANTE FLEXÍVEL BASE RESINA', 'DEP. 01 - IMPERMEABILIZAÇÃO', 265, 300),
('B.10.02.012', '4121', 'TINTA ESMALTE SINTÉTICO ACETINADO', 'DEP. 02 - TINTA ESMALTE', 77, 100),
('B.05.06.001', '4617', 'ADESIVO DE CONTATO - COLA FÓRMICA', 'DEP. 03 - COLA FÓRMICA', 3239, 4000),
('B.16.04.001', '5819', 'ÁLCOOL', 'DEP. 04 - ÁLCOOL', 3253, 4000),
('B.08.01.007', '3046', 'PISO CINZA', 'DEP. 12 - PISO VINÍLICO', 542, 600),
('B.16.10.001', '25742', 'FITA CREPE 25 MM X 50 M', 'DEP. 25 - TINTA ACRÍLICA', 3252, 4000),
('B.04.05.012', '2511', 'CANTONEIRA AÇO 1.1/2 x 1.1/2 x 3/16"', 'DEMAP - 01 ao 11', 165, 200);