/**
 * SEROB API Backend
 * * Dependências necessárias:
 * npm install express mysql2 cors body-parser
 */

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Permite que seu HTML acesse esta API
app.use(bodyParser.json());

// Configuração da Conexão MySQL
// ATENÇÃO: Altere 'sua_senha' para a senha real do seu MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Smith1990@",
  database: "serob_db",
});

// Conectar ao Banco
db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao MySQL:", err);
    return;
  }
  console.log("Conectado ao banco de dados MySQL.");
});

// --- ROTAS DA API ---

// 1. Login (Simples)
app.post("/api/login", (req, res) => {
  const { userId, password } = req.body;

  // Busca o usuário pelo ID
  const sql = "SELECT * FROM users WHERE id = ?";
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const user = results[0];

    // Verifica senha (texto simples conforme demo original)
    if (user.password === password) {
      // Remove a senha antes de enviar pro front
      delete user.password;
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Senha incorreta" });
    }
  });
});

// 2. Listar Todos os Materiais
app.get("/api/materials", (req, res) => {
  const sql = "SELECT * FROM materials ORDER BY name ASC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Mapeia para o formato que o frontend espera (camelCase)
    const formatted = results.map((item) => ({
      id: item.id,
      contractCode: item.contract_code,
      sku: item.sku,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      maxQuantity: item.max_quantity,
    }));

    res.json(formatted);
  });
});

// 3. Registrar Movimentação
app.post("/api/movements", (req, res) => {
  const { sku, type, quantity, userId } = req.body;

  // Inicia transação para garantir integridade
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    // 3.1 Buscar material
    db.query(
      "SELECT id, quantity, name FROM materials WHERE sku = ?",
      [sku],
      (err, results) => {
        if (err)
          return db.rollback(() =>
            res.status(500).json({ error: err.message })
          );
        if (results.length === 0)
          return db.rollback(() =>
            res.status(404).json({ message: "Material não encontrado" })
          );

        const material = results[0];
        const newQuantity =
          type === "in"
            ? material.quantity + parseInt(quantity)
            : material.quantity - parseInt(quantity);

        // Validação de estoque negativo
        if (newQuantity < 0) {
          return db.rollback(() =>
            res.status(400).json({ message: "Estoque insuficiente" })
          );
        }

        // 3.2 Atualizar Estoque
        db.query(
          "UPDATE materials SET quantity = ? WHERE id = ?",
          [newQuantity, material.id],
          (err) => {
            if (err)
              return db.rollback(() =>
                res.status(500).json({ error: err.message })
              );

            // 3.3 Registrar no Histórico
            const sqlMove =
              "INSERT INTO movements (material_id, user_id, type, quantity) VALUES (?, ?, ?, ?)";
            db.query(sqlMove, [material.id, userId, type, quantity], (err) => {
              if (err)
                return db.rollback(() =>
                  res.status(500).json({ error: err.message })
                );

              db.commit((err) => {
                if (err)
                  return db.rollback(() =>
                    res.status(500).json({ error: err.message })
                  );
                res.json({
                  success: true,
                  newQuantity,
                  message: "Movimentação registrada",
                });
              });
            });
          }
        );
      }
    );
  });
});

// 4. Listar Movimentações (Histórico)
app.get("/api/movements", (req, res) => {
  const sql = `
        SELECT m.id, m.date, m.type, m.quantity, mat.name as itemName, mat.sku as itemSku, u.name as userName
        FROM movements m
        JOIN materials mat ON m.material_id = mat.id
        JOIN users u ON m.user_id = u.id
        ORDER BY m.date DESC
        LIMIT 50
    `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const formatted = results.map((m) => ({
      id: m.id,
      date: m.date,
      itemName: m.itemName,
      itemSku: m.itemSku,
      type: m.type,
      quantity: m.quantity,
      user: m.userName,
    }));

    res.json(formatted);
  });
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
