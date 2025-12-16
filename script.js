// CONFIGURAÇÃO DA API
const API_URL = "http://localhost:3000/api";

// USERS UI CONFIG
const USERS_UI = [
  {
    id: 1,
    name: "Jefferson de Araújo Silva",
    email: "jefferson.araujo@camara.leg.br",
    role: "admin",
    initials: "JA",
    color: "blue",
  },
  {
    id: 2,
    name: "Jessé Souza dos Anjos",
    email: "jesse.anjos@camara.leg.br",
    role: "user",
    initials: "JS",
    color: "emerald",
  },
  {
    id: 3,
    name: "Antônio Pinto Melo Sousa Júnior",
    email: "antoniosousa.junior@camara.leg.br",
    role: "user",
    initials: "AP",
    color: "purple",
  },
];

// APP LOGIC
const app = {
  config: {
    thresholds: { critical: 15, warning: 40 },
    storageKeyUser: "serob_current_user_v1",
  },

  // State
  data: [],
  filteredData: [],
  paginatedData: [],
  movements: [],
  currentView: "dashboard",
  activeMovementFilter: null,
  currentUser: null,
  tempLoginUser: null,

  currentPage: 1,
  itemsPerPage: 15,
  totalPages: 1,
  sortConfig: { key: "name", order: "asc" },
  searchQuery: "",
  searchDebounceTimer: null,

  init() {
    lucide.createIcons();
    this.checkLogin();
    // Carregar dados (apenas via API)
    this.loadData();

    // Event Listeners
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("searchInputDesktop").focus();
      }
      if (e.key === "Escape") this.closeModal();
    });

    const searchHandler = (e) => {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.handleSearch(e.target.value);
      }, 300);
    };

    document
      .getElementById("searchInputDesktop")
      .addEventListener("input", searchHandler);
    document
      .getElementById("searchInputMobile")
      .addEventListener("input", searchHandler);
  },

  updateConnectionStatus(isOnline) {
    const dot = document.getElementById("statusDot");
    const text = document.getElementById("statusText");
    const container = document.getElementById("statusIndicator");

    if (isOnline) {
      dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse";
      text.textContent = "Online";
      text.className = "text-[10px] text-emerald-400 font-medium";
      container.className =
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-emerald-900/50 transition-colors";
    } else {
      dot.className = "w-1.5 h-1.5 rounded-full bg-red-500";
      text.textContent = "Offline";
      text.className = "text-[10px] text-red-400 font-medium";
      container.className =
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-red-900/50 transition-colors";
    }
  },

  checkLogin() {
    const storedUser = localStorage.getItem(this.config.storageKeyUser);
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
      this.updateUIForUser();
      document.getElementById("loginOverlay").classList.add("hidden");
    } else {
      document.getElementById("loginOverlay").classList.remove("hidden");
      this.backToUserSelect();
    }
  },

  selectUserForLogin(uiId) {
    const userUI = USERS_UI.find((u) => u.id === uiId);
    if (userUI) {
      this.tempLoginUser = userUI;
      document.getElementById("selectedUserName").textContent = userUI.name;
      document.getElementById("selectedUserAvatar").textContent =
        userUI.initials;

      // Colors
      const colors = {
        blue: "bg-blue-100 text-blue-600",
        emerald: "bg-emerald-100 text-emerald-600",
        purple: "bg-purple-100 text-purple-600",
      };
      const colorClass = colors[userUI.color] || colors.blue;
      document.getElementById(
        "selectedUserAvatar"
      ).className = `w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl mb-3 shadow-inner ${colorClass}`;

      document.getElementById("loginStep1").classList.add("hidden");
      document.getElementById("loginStep2").classList.remove("hidden");
      document.getElementById("loginStep2").classList.add("flex");
      setTimeout(() => document.getElementById("loginPassword").focus(), 100);
    }
  },

  backToUserSelect() {
    this.tempLoginUser = null;
    document.getElementById("loginPassword").value = "";
    document.getElementById("loginStep2").classList.add("hidden");
    document.getElementById("loginStep2").classList.remove("flex");
    document.getElementById("loginStep1").classList.remove("hidden");
  },

  async performLogin(e) {
    e.preventDefault();
    const pwdInput = document.getElementById("loginPassword");
    const password = pwdInput.value;

    if (!this.tempLoginUser) return;

    try {
      // Login seguro via API
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.tempLoginUser.id,
          password: password,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Erro no servidor");
      }

      const result = await response.json();

      if (result.success) {
        this.completeLogin({ ...this.tempLoginUser, ...result.user });
      } else {
        this.showToast(result.message || "Acesso negado", "error");
      }
    } catch (error) {
      console.error("Login Error:", error);
      this.showToast(
        "Erro de conexão. Verifique se o servidor está a rodar.",
        "error"
      );
      this.updateConnectionStatus(false);
    }
  },

  completeLogin(user) {
    this.currentUser = user;
    localStorage.setItem(
      this.config.storageKeyUser,
      JSON.stringify(this.currentUser)
    );
    this.updateUIForUser();
    document.getElementById("loginOverlay").classList.add("hidden");
    this.showToast(
      `Bem-vindo, ${this.currentUser.name.split(" ")[0]}!`,
      "success"
    );
    document.getElementById("loginPassword").value = "";
    this.tempLoginUser = null;
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.config.storageKeyUser);
    document.getElementById("loginOverlay").classList.remove("hidden");
    this.backToUserSelect();
  },

  updateUIForUser() {
    if (!this.currentUser) return;
    document.getElementById("userName").textContent = this.currentUser.name;
    document.getElementById("userEmail").textContent = this.currentUser.email;
    document.getElementById("userAvatar").textContent =
      this.currentUser.initials;
    this.render();
  },

  // --- DATA LOADING (API ONLY) ---
  async loadData() {
    this.showLoading(true);
    try {
      const timeout = (ms) =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), ms)
        );

      const fetchPromise = Promise.all([
        fetch(`${API_URL}/materials`),
        fetch(`${API_URL}/movements`),
      ]);

      // Corrida entre o fetch e um timeout de 5 segundos
      const [matRes, movRes] = await Promise.race([
        fetchPromise,
        timeout(5000), // Aumentei um pouco o timeout para redes lentas
      ]);

      if (!matRes.ok || !movRes.ok) throw new Error("Falha na resposta da API");

      this.data = await matRes.json();
      const rawMoves = await movRes.json();

      // Converter datas
      this.movements = rawMoves.map((m) => ({
        ...m,
        date: new Date(m.date),
      }));

      this.updateConnectionStatus(true);
      this.processData();
      this.populateDatalist();
    } catch (e) {
      console.error("Erro de conexão:", e);
      this.updateConnectionStatus(false);
      this.showToast("Falha ao conectar com o servidor.", "error");

      // Limpa os dados visuais se não conseguir conectar
      this.data = [];
      this.movements = [];
      this.processData();
    } finally {
      this.showLoading(false);
    }
  },

  // --- CORE FUNCTIONS ---
  processData() {
    const query = this.searchQuery.toLowerCase();
    if (query) {
      this.filteredData = this.data.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          (item.contractCode &&
            item.contractCode.toLowerCase().includes(query)) ||
          (item.category && item.category.toLowerCase().includes(query))
      );
    } else {
      this.filteredData = [...this.data];
    }

    this.filteredData.sort((a, b) => {
      let valA = a[this.sortConfig.key];
      let valB = b[this.sortConfig.key];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return this.sortConfig.order === "asc" ? -1 : 1;
      if (valA > valB) return this.sortConfig.order === "asc" ? 1 : -1;
      return 0;
    });

    this.updateKPIs(this.filteredData);

    this.totalPages = Math.max(
      1,
      Math.ceil(this.filteredData.length / this.itemsPerPage)
    );
    if (this.currentPage > this.totalPages) this.currentPage = 1;

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedData = this.filteredData.slice(start, end);

    this.render();
  },

  render() {
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (this.paginatedData.length === 0) {
      document.getElementById("emptyState").classList.remove("hidden");
      document.getElementById("emptyState").classList.add("flex");
      // Update pagination counts to 0
      document.getElementById("pageStart").textContent = 0;
      document.getElementById("pageEnd").textContent = 0;
      document.getElementById("totalItems").textContent = 0;
      return;
    }

    document.getElementById("emptyState").classList.add("hidden");
    document.getElementById("emptyState").classList.remove("flex");

    const fragment = document.createDocumentFragment();
    const isAdmin = this.currentUser?.role === "admin";

    this.paginatedData.forEach((item) => {
      const tr = document.createElement("tr");
      tr.className =
        "hover:bg-slate-50 group border-b border-slate-50 last:border-b-0 transition-colors animate-fade-in";

      const catColor = this.getCategoryColor(item.category || "");
      const status = this.getStockStatus(item);
      const qtyCursor = isAdmin ? "cursor-pointer" : "cursor-default";
      const editCursor = isAdmin ? "cursor-pointer" : "cursor-default";
      const qtyTitle = isAdmin ? "Clique para ajustar saldo (Balanço)" : "";

      tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                  <div onclick="app.copyToClipboard('${
                    item.contractCode
                  }', 'Contrato')" class="clickable-code flex items-center gap-1.5 cursor-pointer group/code w-fit">
                    <i data-lucide="hash" class="w-3 h-3 text-slate-300 group-hover/code:text-blue-500 transition-colors"></i>
                    <span class="text-xs font-mono font-medium text-slate-600 group-hover/code:text-blue-600 transition-colors bg-slate-100 group-hover/code:bg-blue-50 px-1.5 py-0.5 rounded border border-slate-200 group-hover/code:border-blue-200">${
                      item.contractCode || "-"
                    }</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                   <span class="text-xs font-mono text-slate-500">${
                     item.sku
                   }</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border badge-${catColor}">
                    ${(item.category || "Geral").replace("DEP.", "").trim()}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="text-xs font-medium text-slate-900 truncate-2 max-w-xs" title="${
                    item.name
                  }">${item.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-2 group/qty ${qtyCursor}" onclick="app.editQuantity(${
        item.id
      })" title="${qtyTitle}">
                    <span class="text-xs font-bold text-slate-700 border-b border-dashed border-transparent ${
                      isAdmin ? "group-hover/qty:border-slate-300" : ""
                    } transition-colors">${item.quantity}</span>
                    <span class="text-[10px] text-slate-400">un</span>
                    ${
                      isAdmin
                        ? '<i data-lucide="refresh-ccw" class="w-3 h-3 text-slate-300 opacity-0 group-hover/qty:opacity-100 transition-opacity"></i>'
                        : ""
                    }
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-2 group/edit ${editCursor}" onclick="app.editMaxCapacity(${
        item.id
      })">
                    <span class="text-xs font-medium text-slate-600 border-b border-dashed border-slate-300 ${
                      isAdmin
                        ? "group-hover/edit:border-blue-400 group-hover/edit:text-blue-600"
                        : ""
                    } transition-colors" title="${
        isAdmin ? "Editar Ressuprimento" : ""
      }">${item.maxQuantity}</span>
                    ${
                      isAdmin
                        ? '<i data-lucide="edit-2" class="w-3 h-3 text-slate-300 opacity-0 group-hover/edit:opacity-100 transition-opacity"></i>'
                        : ""
                    }
                  </div>
                </td>
                 <td class="px-6 py-4 whitespace-nowrap text-center">
                  <div class="flex flex-col items-center gap-1">
                      <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${
                        status.color
                      }">
                        <span class="relative flex h-1.5 w-1.5">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${
                            status.dot
                          } opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-1.5 w-1.5 ${
                            status.dot
                          }"></span>
                        </span>
                        <span class="text-[10px] font-semibold">${
                          status.label
                        }</span>
                      </div>
                      <span class="text-[10px] text-slate-400 font-medium">${
                        status.note
                      }</span>
                  </div>
                </td>
              `;
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);

    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(
      start + this.itemsPerPage - 1,
      this.filteredData.length
    );

    document.getElementById("pageStart").textContent = start;
    document.getElementById("pageEnd").textContent = end;
    document.getElementById("totalItems").textContent =
      this.filteredData.length;
    document.getElementById("currentPageDisplay").textContent =
      this.currentPage;
    document.getElementById("btnPrev").disabled = this.currentPage === 1;
    document.getElementById("btnNext").disabled =
      this.currentPage === this.totalPages;

    lucide.createIcons();
  },

  renderMovements() {
    const tbody = document.getElementById("movementsBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let displayMovements = this.movements;
    if (this.activeMovementFilter) {
      displayMovements = this.movements.filter(
        (m) => m.type === this.activeMovementFilter
      );
    }

    if (displayMovements.length === 0) {
      const msg = this.activeMovementFilter
        ? "Nenhuma movimentação encontrada com este filtro."
        : "Ainda não existem registros no histórico.";
      const icon = this.activeMovementFilter ? "filter-x" : "clipboard-list";

      tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400 text-xs"><div class="flex flex-col items-center justify-center gap-2"><i data-lucide="${icon}" class="w-8 h-8 opacity-20 mb-1"></i><span>${msg}</span></div></td></tr>`;
      lucide.createIcons();
      return;
    }

    const fragment = document.createDocumentFragment();
    displayMovements.forEach((mov) => {
      const tr = document.createElement("tr");
      tr.className =
        "hover:bg-slate-50 border-b border-slate-50 last:border-b-0 transition-colors animate-fade-in";
      const isEntry = mov.type === "in";
      const badgeClass = isEntry
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : "bg-orange-50 text-orange-700 border-orange-100";
      const icon = isEntry ? "arrow-down-left" : "arrow-up-right";
      const typeLabel = isEntry ? "Entrada" : "Saída";
      const dateStr = mov.date
        ? new Intl.DateTimeFormat("pt-PT", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(mov.date)
        : "-";

      tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap"><span class="text-xs font-mono text-slate-500">${dateStr}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${badgeClass}">
                            <i data-lucide="${icon}" class="w-3 h-3"></i><span class="text-[10px] font-semibold uppercase">${typeLabel}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-col">
                            <span class="text-xs font-medium text-slate-900 truncate max-w-xs" title="${
                              mov.itemName
                            }">${mov.itemName || "Item"}</span>
                            <span class="text-[10px] font-mono text-slate-400">SKU: ${
                              mov.itemSku || "-"
                            }</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right"><span class="text-xs font-bold text-slate-700">${
                      mov.quantity
                    }</span></td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                            <div class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">${(
                              mov.user || "?"
                            ).charAt(0)}</div>
                            <span class="text-xs text-slate-600">${
                              mov.user || "Desconhecido"
                            }</span>
                        </div>
                    </td>
                `;
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
    lucide.createIcons();
  },

  renderReports(btnElement = null) {
    let icon;
    if (btnElement) {
      icon = btnElement.querySelector("svg") || btnElement.querySelector("i");
      if (icon) icon.classList.add("animate-spin");
      btnElement.disabled = true;
    }

    // Recarrega dados reais antes de renderizar relatório
    this.loadData()
      .then(() => {
        // Lógica de renderização de relatório
        const groups = {};
        this.data.forEach((item) => {
          const cat = item.category
            ? item.category.replace("DEP.", "").trim()
            : "Outros";
          groups[cat] = (groups[cat] || 0) + 1;
        });

        const sortedGroups = Object.entries(groups)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        const totalItems = Math.max(1, this.data.length);
        const catContainer = document.getElementById("reportCategories");
        if (catContainer) {
          catContainer.innerHTML = "";
          sortedGroups.forEach(([name, count]) => {
            const pct = Math.round((count / totalItems) * 100);
            catContainer.innerHTML += `<div><div class="flex justify-between text-xs mb-1"><span class="font-medium text-slate-700 truncate w-3/4">${name}</span><span class="text-slate-500">${count} itens (${pct}%)</span></div><div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden"><div class="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out" style="width: 0%"></div></div></div>`;
            setTimeout(() => {
              const bars = catContainer.querySelectorAll(".bg-blue-500");
              const lastBar = bars[bars.length - 1];
              if (lastBar) lastBar.style.width = `${pct}%`;
            }, 50);
          });
        }

        const criticalItems = this.data
          .map((item) => {
            const max = item.maxQuantity || 100;
            return { ...item, pct: (item.quantity / max) * 100 };
          })
          .filter((item) => item.pct <= this.config.thresholds.warning)
          .sort((a, b) => a.pct - b.pct)
          .slice(0, 8);

        const critBody = document.getElementById("reportCriticalBody");
        if (critBody) {
          critBody.innerHTML = "";
          if (criticalItems.length === 0) {
            critBody.innerHTML =
              '<tr><td colspan="3" class="px-3 py-4 text-center text-slate-400 italic">Nenhum item em estado crítico.</td></tr>';
          } else {
            criticalItems.forEach((item) => {
              const status = this.getStockStatus(item);
              critBody.innerHTML += `<tr><td class="px-3 py-2 border-b border-slate-50"><div class="font-medium text-slate-700 truncate max-w-[180px]" title="${item.name}">${item.name}</div><div class="text-[10px] text-slate-400 font-mono">${item.sku}</div></td><td class="px-3 py-2 text-right border-b border-slate-50 font-bold text-slate-600">${item.quantity}</td><td class="px-3 py-2 text-center border-b border-slate-50"><span class="inline-block w-2 h-2 rounded-full ${status.dot}" title="${status.label}"></span></td></tr>`;
            });
          }
        }

        const totalMoves = this.movements ? this.movements.length : 0;
        const totalIn = this.movements
          ? this.movements.filter((m) => m.type === "in").length
          : 0;
        const totalOut = this.movements
          ? this.movements.filter((m) => m.type === "out").length
          : 0;

        const elTotalMoves = document.getElementById("repTotalMoves");
        if (elTotalMoves) elTotalMoves.textContent = totalMoves;
        const elTotalIn = document.getElementById("repTotalIn");
        if (elTotalIn) elTotalIn.textContent = totalIn;
        const elTotalOut = document.getElementById("repTotalOut");
        if (elTotalOut) elTotalOut.textContent = totalOut;

        if (btnElement)
          this.showToast("Relatórios atualizados com sucesso.", "success");
      })
      .catch(() => {
        this.showToast("Erro ao atualizar relatórios.", "error");
      })
      .finally(() => {
        if (icon) icon.classList.remove("animate-spin");
        if (btnElement) btnElement.disabled = false;
      });
  },

  handleSearch(query) {
    this.searchQuery = query;
    this.currentPage = 1;
    this.processData();
  },

  clearSearch() {
    this.searchQuery = "";
    document.getElementById("searchInputDesktop").value = "";
    document.getElementById("searchInputMobile").value = "";
    this.currentPage = 1;
    this.processData();
  },

  sort(key) {
    if (this.sortConfig.key === key) {
      this.sortConfig.order = this.sortConfig.order === "asc" ? "desc" : "asc";
    } else {
      this.sortConfig.key = key;
      this.sortConfig.order = "asc";
    }
    this.processData();
  },

  async editMaxCapacity(id) {
    if ((this.currentUser?.role || "admin") !== "admin") {
      this.showToast("Apenas administradores.", "error");
      return;
    }
    this.showToast("Edição de meta não disponível na demonstração.", "info");
  },

  async editQuantity(id) {
    // Funcionalidade de Balanço (ajusta através de movimentação)
    if ((this.currentUser?.role || "admin") !== "admin") {
      this.showToast("Apenas administradores.", "error");
      return;
    }
    const item = this.data.find((i) => i.id === id);
    if (!item) return;

    const newQtyStr = prompt(
      `AJUSTE DE SALDO (Balanço):\n${item.name}\n\nQuantidade Atual: ${item.quantity}\n\nNova Quantidade Real:`,
      item.quantity
    );

    if (newQtyStr !== null) {
      const newQty = parseInt(newQtyStr);
      if (!isNaN(newQty) && newQty >= 0) {
        const diff = newQty - item.quantity;
        if (diff === 0) return;

        // Determina se é entrada ou saída para corrigir
        const type = diff > 0 ? "in" : "out";
        const qtyToMove = Math.abs(diff);

        try {
          // Usa a mesma API de movimentação para registrar o ajuste
          const response = await fetch(`${API_URL}/movements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sku: item.sku,
              type: type,
              quantity: qtyToMove,
              userId: this.currentUser.id,
            }),
          });

          const result = await response.json();
          if (result.success) {
            this.showToast(
              `Saldo corrigido (Ajuste de ${
                type === "in" ? "+" : "-"
              }${qtyToMove}).`,
              "success"
            );
            this.loadData();
          } else {
            this.showToast(result.message, "error");
          }
        } catch (e) {
          this.showToast("Erro ao conectar com o servidor.", "error");
        }
      } else {
        this.showToast("Valor inválido.", "error");
      }
    }
  },

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.processData();
    }
  },

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.processData();
    }
  },

  copyToClipboard(text, label) {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    this.showToast(`${label} copiado!`, "success");
  },

  getCategoryColor(category) {
    const hash = category
      .split("")
      .reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const types = ["blue", "green", "purple", "orange", "gray"];
    return types[hash % types.length];
  },

  getStockStatus(item) {
    const max = item.maxQuantity || 100;
    const percentage = Math.round((item.quantity / max) * 100);
    if (percentage <= this.config.thresholds.critical) {
      return {
        label: "Ação Necessária",
        color: "text-red-700 bg-red-50 border-red-100",
        dot: "bg-red-500",
        pct: percentage,
        note: "Risco de Rutura",
      };
    }
    if (percentage <= this.config.thresholds.warning) {
      return {
        label: "Pedir Compra",
        color: "text-amber-700 bg-amber-50 border-amber-100",
        dot: "bg-amber-500",
        pct: percentage,
        note: "Entrega: 45 dias",
      };
    }
    return {
      label: "Estoque Saudável",
      color: "text-emerald-700 bg-emerald-50 border-emerald-100",
      dot: "bg-emerald-500",
      pct: percentage,
      note: `${percentage}% da Meta`,
    };
  },

  updateKPIs(data) {
    const animate = (id, endValue, prefix = "") => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = prefix + new Intl.NumberFormat("pt-PT").format(endValue);
    };
    const count = data.length;
    const groups = new Set(data.map((i) => i.category)).size;
    const critical = data.filter((i) => {
      const max = i.maxQuantity || 100;
      return (i.quantity / max) * 100 <= this.config.thresholds.critical;
    }).length;
    animate("statTotalItems", count);
    animate("statGroups", groups);
    animate("statCritical", critical);
  },

  showLoading(isLoading) {
    const loader = document.getElementById("loadingState");
    if (loader) {
      if (isLoading)
        loader.classList.remove("opacity-0", "pointer-events-none");
      else loader.classList.add("opacity-0", "pointer-events-none");
    }
  },

  showToast(msg, type = "info") {
    let bg = "#3b82f6";
    if (type === "success") bg = "#10b981";
    if (type === "error") bg = "#ef4444";
    if (type === "warning") bg = "#f59e0b";
    Toastify({
      text: msg,
      duration: 3000,
      style: { background: bg, borderRadius: "8px" },
    }).showToast();
  },

  populateDatalist() {
    setTimeout(() => {
      const datalist = document.getElementById("materialList");
      if (datalist) {
        datalist.innerHTML = "";
        this.data.forEach((item) => {
          const option = document.createElement("option");
          option.value = item.sku;
          option.textContent = `${item.name} (${item.quantity} un)`;
          datalist.appendChild(option);
        });
      }
    }, 500);
  },

  openModal() {
    const modal = document.getElementById("movementModal");
    const backdrop = document.getElementById("modalBackdrop");
    const panel = document.getElementById("modalPanel");
    modal.classList.remove("hidden");
    setTimeout(() => {
      backdrop.classList.remove("opacity-0");
      panel.classList.remove("opacity-0", "scale-95");
      panel.classList.add("opacity-100", "scale-100");
    }, 10);
    document.getElementById("movementForm").reset();
    this.toggleModalType("in");
  },

  closeModal() {
    const modal = document.getElementById("movementModal");
    const backdrop = document.getElementById("modalBackdrop");
    const panel = document.getElementById("modalPanel");
    backdrop.classList.add("opacity-0");
    panel.classList.remove("opacity-100", "scale-100");
    panel.classList.add("opacity-0", "scale-95");
    setTimeout(() => modal.classList.add("hidden"), 200);
  },

  toggleModalType(type) {
    const btnSubmit = document.getElementById("btnSubmitMovement");
    if (type === "in") {
      btnSubmit.textContent = "Confirmar Entrada";
      btnSubmit.classList.remove("bg-orange-600", "hover:bg-orange-500");
      btnSubmit.classList.add("bg-emerald-600", "hover:bg-emerald-500");
    } else {
      btnSubmit.textContent = "Confirmar Saída";
      btnSubmit.classList.remove("bg-emerald-600", "hover:bg-emerald-500");
      btnSubmit.classList.add("bg-orange-600", "hover:bg-orange-500");
    }
  },

  async saveMovement(e) {
    e.preventDefault();
    const form = document.getElementById("movementForm");
    const formData = new FormData(form);
    const type = formData.get("moveType");
    const skuInput = formData.get("moveItem");
    const qty = parseInt(formData.get("moveQty"));

    if (!skuInput || isNaN(qty) || qty <= 0) {
      this.showToast("Preencha todos os campos corretamente.", "error");
      return;
    }

    // Verificação preliminar de estoque para saída
    const targetItem = this.data.find((i) => i.sku === skuInput);
    if (targetItem && type === "out" && targetItem.quantity < qty) {
      this.showToast(
        `Estoque insuficiente. Disponível: ${targetItem.quantity}`,
        "error"
      );
      return;
    }

    if (!this.currentUser) {
      this.showToast("Sessão expirada. Faça login novamente.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: skuInput,
          type: type,
          quantity: qty,
          userId: this.currentUser.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showToast("Movimentação registrada com sucesso!", "success");
        this.loadData();
        this.closeModal();
      } else {
        this.showToast(result.message || "Erro no servidor", "error");
      }
    } catch (err) {
      console.error(err);
      this.showToast("Erro ao conectar com o servidor.", "error");
    }
  },

  toggleMovementFilter(type) {
    if (this.activeMovementFilter === type) this.activeMovementFilter = null;
    else this.activeMovementFilter = type;
    this.updateMovementFilterUI();
    this.renderMovements();
  },

  updateMovementFilterUI() {
    const btnIn = document.getElementById("btnFilterIn");
    const btnOut = document.getElementById("btnFilterOut");
    const baseClass =
      "bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center px-3 py-1.5 shadow-sm transition-all group";
    btnIn.className = baseClass;
    btnOut.className = baseClass;
    if (this.activeMovementFilter === "in") {
      btnIn.className =
        "bg-emerald-50 border border-emerald-200 rounded-lg flex items-center px-3 py-1.5 shadow-sm ring-1 ring-emerald-500/20 transition-all group";
    }
    if (this.activeMovementFilter === "out") {
      btnOut.className =
        "bg-orange-50 border border-orange-200 rounded-lg flex items-center px-3 py-1.5 shadow-sm ring-1 ring-orange-500/20 transition-all group";
    }
  },

  navigate(viewName) {
    this.currentView = viewName;
    document
      .querySelectorAll(".nav-item")
      .forEach((el) => el.classList.remove("active"));
    document.getElementById(`nav-${viewName}`).classList.add("active");
    document.getElementById("viewDashboard").classList.add("hidden");
    document.getElementById("viewMovements").classList.add("hidden");
    document.getElementById("viewReports").classList.add("hidden");
    document.getElementById("viewMovements").classList.remove("flex");
    document.getElementById("viewReports").classList.remove("flex");

    if (viewName === "dashboard") {
      document.getElementById("viewDashboard").classList.remove("hidden");
      this.clearSearch(); // Agora limpa a pesquisa ao entrar no dashboard
    } else if (viewName === "movements") {
      document.getElementById("viewMovements").classList.remove("hidden");
      document.getElementById("viewMovements").classList.add("flex");
      this.renderMovements();
    } else if (viewName === "reports") {
      document.getElementById("viewReports").classList.remove("hidden");
      document.getElementById("viewReports").classList.add("flex");
      this.renderReports();
    }
  },

  exportCSV() {
    if (!this.data || this.data.length === 0) {
      this.showToast("Sem dados para exportar.", "info");
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SKU;Nome;Categoria;Quantidade;Contrato\n";
    this.data.forEach((item) => {
      const row = [
        item.sku,
        item.name.replace(/;/g, ","), // evita quebrar CSV
        item.category,
        item.quantity,
        item.contractCode,
      ].join(";");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "estoque_serob.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

// Expose app to window
window.app = app;
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
