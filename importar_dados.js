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
