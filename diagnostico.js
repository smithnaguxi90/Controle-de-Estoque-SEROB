/**
 * SCRIPT DE DIAGNÓSTICO DO SEROB
 * * Como usar:
 * 1. Edite a PASSWORD abaixo para a sua senha do MySQL.
 * 2. Abra o terminal na pasta do projeto.
 * 3. Execute: node diagnostico.js
 */

const mysql = require("mysql2");
const net = require("net");

// --- CONFIGURAÇÃO (ALTERE AQUI) ---
const DB_CONFIG = {
  host: "localhost",
  user: "root",
  password: "Smith1990@", // <--- COLOQUE A SUA SENHA AQUI
  database: "serob_db",
};

console.log("\n🔍 --- INICIANDO DIAGNÓSTICO SEROB ---");

// TESTE 1: Verificar Base de Dados MySQL
console.log("\n1️⃣  A testar conexão com MySQL...");
const connection = mysql.createConnection(DB_CONFIG);

connection.connect((err) => {
  if (err) {
    console.error("❌ FALHA NO MYSQL:");
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("   -> A senha ou utilizador estão incorretos.");
      console.error(
        '   -> Verifique a linha "password" neste ficheiro e no server.js'
      );
    } else if (err.code === "ECONNREFUSED") {
      console.error("   -> O MySQL parece estar desligado.");
      console.error(
        "   -> Abra o XAMPP ou MySQL Workbench e inicie o servidor."
      );
    } else if (err.code === "ER_BAD_DB_ERROR") {
      console.error('   -> A base de dados "serob_db" não existe.');
      console.error('   -> Execute o script "schema.sql" no Workbench.');
    } else {
      console.error("   -> Erro: " + err.message);
    }
    testPort(); // Continua para o próximo teste
  } else {
    console.log("✅ MySQL conectado com sucesso!");
    connection.query("SELECT count(*) as total FROM materials", (err, rows) => {
      if (err) {
        console.log('⚠️  Aviso: Tabela "materials" não encontrada ou vazia.');
      } else {
        console.log(`   -> Encontrados ${rows[0].total} produtos registados.`);
      }
      connection.end();
      testPort();
    });
  }
});

// TESTE 2: Verificar se a Porta 3000 está livre ou em uso
function testPort() {
  console.log("\n2️⃣  A testar porta do servidor (3000)...");
  const server = net.createServer();

  server.once("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log("⚠️  A porta 3000 JÁ ESTÁ EM USO.");
      console.log('   Isto é BOM se for o seu "server.js" a correr.');
      console.log(
        '   Se o "server.js" não estiver aberto, outro programa está a bloquear a porta.'
      );
    } else {
      console.log("❌ Erro na porta: " + err.message);
    }
    finish();
  });

  server.once("listening", () => {
    console.log("ℹ️  A porta 3000 está livre.");
    console.log('   -> Isto significa que o "server.js" NÃO ESTÁ A CORRER.');
    console.log(
      '   -> Você precisa abrir um terminal e rodar "node server.js".'
    );
    server.close();
    finish();
  });

  server.listen(3000);
}

function finish() {
  console.log("\n🏁 --- FIM DO DIAGNÓSTICO ---\n");
}
