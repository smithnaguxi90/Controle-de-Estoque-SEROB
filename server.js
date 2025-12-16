const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt"); // Biblioteca de criptografia

const app = express();
const PORT = 3001;

// --- CONFIGURAÇÃO DA BASE DE DADOS ---
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "Smith1990@", // <--- Confirme se a senha está correta
  database: "serob_db",
};

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// --- CONEXÃO MYSQL ---
let db;
function handleDisconnect() {
  db = mysql.createConnection(dbConfig);
  db.connect((err) => {
    if (err) {
      console.error("\n❌ ERRO MYSQL:", err.code);
      setTimeout(handleDisconnect, 5000);
    } else {
      console.log("✅ [MySQL] Conectado!");
    }
  });
  db.on("error", (err) => {
    console.error("❌ Erro MySQL:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") handleDisconnect();
    else throw err;
  });
}
handleDisconnect();

// --- ROTAS API ---

// ROTA DE LOGIN (Com Migração Automática para Hash)
app.post("/api/login", (req, res) => {
  const { userId, password } = req.body;

  // Buscar utilizador pelo ID
  const sql = "SELECT * FROM users WHERE id = ?";
  db.query(sql, [userId], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Utilizador não encontrado" });
    }

    const user = results[0];

    try {
      // 1. Tentar comparar como HASH (Senha Segura)
      const match = await bcrypt.compare(password, user.password);

      if (match) {
        // Senha correta e já segura
        delete user.password;
        return res.json({ success: true, user });
      }

      // 2. Se falhar, verificar se é uma senha ANTIGA (Texto Simples - Migração)
      // Esta parte permite que o utilizador entre a primeira vez para convertermos a senha
      if (password === user.password) {
        console.log(
          `🔒 A migrar senha do utilizador ${user.name} para formato seguro...`
        );

        // Criptografar e atualizar na BD
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query("UPDATE users SET password = ? WHERE id = ?", [
          hashedPassword,
          user.id,
        ]);

        delete user.password;
        return res.json({ success: true, user });
      }

      // Senha incorreta
      res.status(401).json({ success: false, message: "Senha incorreta" });
    } catch (e) {
      res.status(500).json({ error: "Erro ao processar senha" });
    }
  });
});

// ROTA ALTERAR SENHA (Agora salva Criptografado)
app.post("/api/change-password", (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  // 1. Buscar utilizador para verificar senha antiga
  const checkSql = "SELECT * FROM users WHERE id = ?";
  db.query(checkSql, [userId], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ message: "Utilizador não encontrado" });

    const user = results[0];
    let isOldPasswordCorrect = false;

    // Verificar senha antiga (Suporta tanto Hash quanto Texto Simples)
    const matchHash = await bcrypt.compare(oldPassword, user.password);
    if (matchHash) {
      isOldPasswordCorrect = true;
    } else if (oldPassword === user.password) {
      isOldPasswordCorrect = true;
    }

    if (!isOldPasswordCorrect) {
      return res
        .status(401)
        .json({ success: false, message: "A senha atual está incorreta." });
    }

    // 2. Criptografar a NOVA senha antes de salvar
    try {
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      const updateSql = "UPDATE users SET password = ? WHERE id = ?";
      db.query(updateSql, [hashedNewPassword, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Senha alterada com sucesso!" });
      });
    } catch (e) {
      res.status(500).json({ error: "Erro ao criptografar senha" });
    }
  });
});

app.get("/api/materials", (req, res) => {
  const sql = "SELECT * FROM materials ORDER BY name ASC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const activeMaterials = results
      .filter((item) => !item.is_archived)
      .map((item) => ({
        id: item.id,
        contractCode: item.contract_code,
        sku: item.sku,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        maxQuantity: item.max_quantity || 100,
        minQuantity: item.min_quantity || 0,
        alertPercentage: item.alert_percentage || 40,
      }));
    res.json(activeMaterials);
  });
});

app.put("/api/materials/:id", (req, res) => {
  const { id } = req.params;
  const { maxQuantity } = req.body;
  if (maxQuantity === undefined)
    return res.status(400).json({ error: "Valor inválido" });

  const sql = "UPDATE materials SET max_quantity = ? WHERE id = ?";
  db.query(sql, [maxQuantity, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post("/api/movements", (req, res) => {
  const { sku, type, quantity, userId } = req.body;
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query(
      "SELECT id, quantity FROM materials WHERE sku = ?",
      [sku],
      (err, results) => {
        if (err || results.length === 0)
          return db.rollback(() =>
            res.status(404).json({ message: "Material não encontrado" })
          );
        const material = results[0];
        let newQuantity = material.quantity;
        if (type === "in") newQuantity += parseInt(quantity);
        else newQuantity -= parseInt(quantity);

        if (newQuantity < 0)
          return db.rollback(() =>
            res.status(400).json({ message: "Estoque insuficiente" })
          );

        db.query(
          "UPDATE materials SET quantity = ? WHERE id = ?",
          [newQuantity, material.id],
          (err) => {
            if (err)
              return db.rollback(() =>
                res.status(500).json({ error: err.message })
              );
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
                res.json({ success: true });
              });
            });
          }
        );
      }
    );
  });
});

app.get("/api/movements", (req, res) => {
  const sql = `SELECT m.id, m.date, m.type, m.quantity, mat.name as itemName, mat.sku as itemSku, u.name as userName FROM movements m LEFT JOIN materials mat ON m.material_id = mat.id LEFT JOIN users u ON m.user_id = u.id ORDER BY m.date DESC LIMIT 50`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = results.map((m) => ({
      id: m.id,
      date: m.date,
      itemName: m.itemName || "Item desconhecido",
      itemSku: m.itemSku,
      type: m.type,
      quantity: m.quantity,
      user: m.userName || "Sistema",
    }));
    res.json(formatted);
  });
});

app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, "index.html")));

const server = app.listen(PORT, () => {
  console.log("\n🟢 ===================================================");
  console.log(`🚀 SERVIDOR LIGADO EM: http://localhost:${PORT}`);
  console.log("   Agora as senhas estão protegidas com criptografia.");
  console.log("===================================================\n");
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(
      `\n❌ A porta ${PORT} está ocupada! Use: npx kill-port ${PORT}`
    );
  } else {
    console.error("Erro:", e);
  }
});
