import {
  db,
  collection,
  onSnapshot,
  deleteDoc,
  doc,
} from "./firebase-config.js";

const tabelaBody = document.querySelector("tbody"); // Ou o ID do corpo da sua tabela

function carregarTabela() {
  // O onSnapshot fica "ouvindo" o banco. Qualquer mudança lá, reflete aqui.
  onSnapshot(collection(db, "estoque"), (snapshot) => {
    // Limpa a tabela antes de redesenhar
    tabelaBody.innerHTML = "";

    snapshot.forEach((documento) => {
      // Aqui pegamos os dados do banco
      const produto = documento.data();
      const firebaseId = documento.id; // ID único do Firebase (importante para excluir/editar)

      // Criamos a linha da tabela (ajuste as classes conforme seu CSS)
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${produto.id}</td> <td>${produto.contractCode}</td>
        <td>${produto.sku}</td>
        <td>${produto.category}</td>
        <td>${produto.name}</td>
        <td>${produto.quantity}</td>
        <td>
            <button class="btn-delete" data-id="${firebaseId}">Excluir</button>
        </td>
      `;
      tabelaBody.appendChild(tr);
    });

    // Adiciona eventos aos botões de excluir recém-criados
    document.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const idParaDeletar = e.target.getAttribute("data-id");
        if (confirm("Deseja excluir este item?")) {
          await deleteDoc(doc(db, "estoque", idParaDeletar));
        }
      });
    });
  });
}

// Inicia a aplicação
carregarTabela();

import { db, collection, addDoc } from "./firebase-config.js";

// 1. Selecionamos o formulário
const formCadastro = document.getElementById("form-cadastro");

// 2. Adicionamos o evento de envio (submit)
formCadastro.addEventListener("submit", async (event) => {
  // Previne que a página recarregue (padrão do HTML)
  event.preventDefault();

  // Feedback visual (opcional)
  const btnSalvar = document.getElementById("btn-salvar");
  const textoOriginal = btnSalvar.innerText;
  btnSalvar.innerText = "Salvando...";
  btnSalvar.disabled = true;

  // 3. Captura os valores dos inputs
  // Convertemos Quantidade e ID para Número, o resto é Texto
  const novoProduto = {
    id: Number(document.getElementById("inp-id").value),
    contractCode: document.getElementById("inp-contract").value,
    sku: document.getElementById("inp-sku").value,
    name: document.getElementById("inp-name").value.toUpperCase(), // Força letra maiúscula para padronizar
    category: document.getElementById("inp-category").value,
    quantity: Number(document.getElementById("inp-quantity").value),
  };

  try {
    // 4. Envia para o Firebase (Coleção 'estoque')
    await addDoc(collection(db, "estoque"), novoProduto);

    // 5. Limpa o formulário após o sucesso
    formCadastro.reset();
    alert("Produto cadastrado com sucesso!");
  } catch (erro) {
    console.error("Erro ao cadastrar:", erro);
    alert("Erro ao salvar. Verifique o console.");
  } finally {
    // Restaura o botão
    btnSalvar.innerText = textoOriginal;
    btnSalvar.disabled = false;
  }
});
