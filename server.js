const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path"); // Necessário para arquivos estáticos

const app = express();
const PORT = 3000;

// --- CONFIGURAÇÃO DA BASE DE DADOS ---
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "Smith1990@", // <--- Confirme se a senha está correta
  database: "serob_db",
};

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- [IMPORTANTE] SERVIR ARQUIVOS DO SITE (HTML, CSS, JS) ---
// Sem esta linha, o navegador recebe "Cannot GET /"
app.use(express.static(__dirname));

// Logger de pedidos
app.use((req, res, next) => {
  console.log(
    `[${new Date().toLocaleTimeString()}] 📨 Pedido recebido: ${req.method} ${
      req.url
    }`
  );
  next();
});

// Conexão MySQL com Re-conexão Automática
let db;

function handleDisconnect() {
  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error("\n❌ ERRO CRÍTICO AO LIGAR À BASE DE DADOS:", err.code);
      if (err.code === "ER_ACCESS_DENIED_ERROR") {
        console.error("👉 Senha incorreta no server.js (linha 14).");
      } else if (err.code === "ECONNREFUSED") {
        console.error("👉 O MySQL não está a correr (Verifique o XAMPP).");
      } else if (err.code === "ER_BAD_DB_ERROR") {
        console.error('👉 Base de dados "serob_db" não existe.');
      }
      setTimeout(handleDisconnect, 5000);
    } else {
      console.log("✅ [Base de Dados] Conectado ao MySQL com sucesso!");
    }
  });

  db.on("error", (err) => {
    console.error("❌ [Base de Dados] Erro de conexão:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

// --- ROTAS DA API ---

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
    if (err)
      return res
        .status(500)
        .json({ error: "Erro de Banco de Dados: " + err.message });

    const activeMaterials = results.filter(
      (item) => item.is_archived !== 1 && item.is_archived !== true
    );

    const formatted = activeMaterials.map((item) => ({
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
    res.json(formatted);
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
        if (err || results.length === 0) {
          return db.rollback(() =>
            res.status(404).json({ message: "Material não encontrado" })
          );
        }

        const material = results[0];
        let newQuantity = material.quantity;
        if (type === "in") newQuantity += parseInt(quantity);
        else newQuantity -= parseInt(quantity);

        if (newQuantity < 0) {
          return db.rollback(() =>
            res.status(400).json({ message: "Stock insuficiente" })
          );
        }

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
                console.log(
                  `✅ Movimentação: SKU ${sku} | Qtd ${quantity} | ${type}`
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
  const sql = `
        SELECT m.id, m.date, m.type, m.quantity, mat.name as itemName, mat.sku as itemSku, u.name as userName
        FROM movements m
        LEFT JOIN materials mat ON m.material_id = mat.id
        LEFT JOIN users u ON m.user_id = u.id
        ORDER BY m.date DESC LIMIT 50
    `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = results.map((m) => ({
      id: m.id,
      date: m.date,
      itemName: m.itemName || "Item Removido",
      itemSku: m.itemSku,
      type: m.type,
      quantity: m.quantity,
      user: m.userName || "Sistema",
    }));
    res.json(formatted);
  });
});

// --- ROTA FINAL (Fallback) ---
// Garante que se aceder a uma rota desconhecida, volta ao index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log("\n🟢 ===================================================");
  console.log(`🚀 SERVIDOR LIGADO EM: http://localhost:${PORT}`);
  console.log("   Agora você pode acessar o site pelo navegador.");
  console.log("===================================================\n");
});
