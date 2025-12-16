const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3001; // Mantendo a porta 3001

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

// [IMPORTANTE] Servir os arquivos do site
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
      if (err.code === "ER_ACCESS_DENIED_ERROR")
        console.error("👉 Senha incorreta no server.js");
      else if (err.code === "ECONNREFUSED")
        console.error("👉 MySQL desligado (Abra o XAMPP).");
      else if (err.code === "ER_BAD_DB_ERROR")
        console.error("👉 Base de dados 'serob_db' não existe.");
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
app.post("/api/login", (req, res) => {
  const { userId, password } = req.body;
  const sql = "SELECT * FROM users WHERE id = ? AND password = ?";
  db.query(sql, [userId, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length > 0) {
      const user = results[0];
      delete user.password;
      res.json({ success: true, user });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Credenciais inválidas" });
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

// NOVA ROTA: Atualizar Material (Ex: Ressuprimento/Meta)
app.put("/api/materials/:id", (req, res) => {
  const { id } = req.params;
  const { maxQuantity } = req.body;

  if (maxQuantity === undefined) {
    return res.status(400).json({ error: "Valor inválido" });
  }

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

// --- ROTA FINAL (Express 5 Syntax) ---
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, "index.html")));

const server = app.listen(PORT, () => {
  console.log("\n🟢 ===================================================");
  console.log(`🚀 SERVIDOR LIGADO EM: http://localhost:${PORT}`);
  console.log("   Acesse este link no seu navegador.");
  console.log("===================================================\n");
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(
      `\n❌ A porta ${PORT} também está ocupada! Tente reiniciar o computador ou matar o processo.`
    );
  } else {
    console.error("Erro:", e);
  }
});
