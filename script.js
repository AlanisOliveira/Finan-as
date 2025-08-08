// Firebase Configuration (REPLACE WITH YOUR ACTUAL CONFIG)
const firebaseConfig = {
  apiKey: "AIzaSyBreN8dyGgodRKotvhYYTuu83QOE8WQM6E",
  authDomain: "financeiro-2ffba.firebaseapp.com",
  projectId: "financeiro-2ffba",
  storageBucket: "financeiro-2ffba.firebasestorage.app",
  messagingSenderId: "891828551058",
  appId: "1:891828551058:web:ce59772e7606aace1e954b",
  measurementId: "G-PDTQNG9L9R"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Get a reference to the Firestore database

class AdvancedFinancialApp {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        
        // Initialize Firebase Firestore instance
        this.db = db;
        this.userId = localStorage.getItem('financa_user_id') || null; // Load last used ID

        this.data = {}; // Initialize data as empty, will be loaded from Firestore or localStorage
        this.tempSplitData = null;
        this.editingTransactionId = null;
        this.searchTerm = '';
        this.sortField = 'data';
        this.sortDirection = 'desc';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        
        // Initial setup, then load data
        this.initializeDefaults();
        this.initializeTheme();
        this.bindEvents();
        this.updateDisplay();
        this.setTodayDate();

        // If a userId exists from previous session, load data from Firestore
        if (this.userId) {
            this.loadDataFromFirestore(this.userId);
        } else {
            // If no user ID, load from local storage (for existing local data) or start fresh
            this.data = this.loadDataFromLocalStorage();
            this.initializeDefaults(); // Re-initialize defaults if data was empty
            this.updateDisplay();
        }
        // Ensure UI reflects current year and month on load
        this.setCurrentDateActive();
        this.switchYear(this.currentYear);
        this.switchMonth(this.currentMonth);
        
        // Setup mobile-specific event listeners
        this.setupMobileFeatures();
    }

    // INITIALIZATION
    initializeDefaults() {
        if (!this.data.categories) {
            this.data.categories = [
                { id: 'alimentacao', name: '🍽️ Alimentação', custom: false },
                { id: 'transporte', name: '🚗 Transporte', custom: false },
                { id: 'moradia', name: '🏠 Moradia', custom: false },
                { id: 'saude', name: '💊 Saúde', custom: false },
                { id: 'educacao', name: '📚 Educação', custom: false },
                { id: 'lazer', name: '🎯 Lazer', custom: false },
                { id: 'salario', name: '💰 Salário', custom: false },
                { id: 'freelance', name: '💻 Freelance', custom: false },
                { id: 'investimentos', name: '📈 Investimentos', custom: false },
                { id: 'outros', name: '📦 Outros', custom: false }
            ];
        }

        if (!this.data.banks) {
            this.data.banks = [
                { id: 'nubank', name: '🟣 Nubank', custom: false },
                { id: 'inter', name: '🟠 Inter', custom: false },
                { id: 'bradesco', name: '🔴 Bradesco', custom: false },
                { id: 'itau', name: '🔵 Itaú', custom: false },
                { id: 'santander', name: '🔴 Santander', custom: false },
                { id: 'caixa', name: '🟡 Caixa', custom: false },
                { id: 'bb', name: '🟡 Banco do Brasil', custom: false },
                { id: 'dinheiro', name: '💵 Dinheiro', custom: false }
            ];
        }

        if (!this.data.people) {
            this.data.people = [];
        }

        if (!this.data.transactions) {
            this.data.transactions = {};
        }

        if (!this.data.goals) {
            this.data.goals = {};  // Organizado por período: { "2024-1": [...], "2024-2": [...] }
        }

        if (!this.data.cards) {
            this.data.cards = [];
        }

        if (!this.data.loans) {
            this.data.loans = [];
        }

        this.populateSelects();
        this.populateGastoParaSelect();
        this.setCurrentDateActive(); // Definir mês/ano atual como ativo
        // No longer calling saveData() here, as it will be handled by Firestore or explicit save
    }

    bindEvents() {
        // Year selector
        document.querySelectorAll('.year-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchYear(parseInt(e.target.dataset.year));
            });
        });

        // Month tabs
        document.querySelectorAll('.month-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchMonth(parseInt(e.target.dataset.month));
            });
        });

        // Form
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.editingTransactionId) {
                this.updateTransaction();
            } else {
                this.addTransaction();
            }
        });

        // Card form
        document.getElementById('cardForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCard();
        });

        // Debt form
        document.getElementById('debtForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDebt();
        });

        // Loan form
        document.getElementById('loanForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveLoan();
        });

        // Goals form
        document.getElementById('goalsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addGoal();
        });


        // Compartilhada checkbox
        document.getElementById('compartilhada').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.openSplitModal();
            } else {
                this.tempSplitData = null;
            }
            this.toggleValorPagoVisibility(e.target.checked);
        });

        // Split type buttons
        document.querySelectorAll('.split-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSplitType(e.target.dataset.type);
            });
        });

        // Search with debounce
        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchTerm = e.target.value.toLowerCase();
                this.currentPage = 1;
                this.updateTransactionsTable();
            }, 300);
        });

        // Filters
        ['filterTipo', 'filterCategoria', 'filterBanco', 'filterStatus'].forEach(filterId => {
            document.getElementById(filterId).addEventListener('change', () => {
                this.currentPage = 1;
                this.applyFilters();
            });
        });

        // Table sorting
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                this.sortTable(th.dataset.sort);
            });
        });

        // Auto-fill valor pago when valor changes
        document.getElementById('valor').addEventListener('input', (e) => {
            const valorPagoField = document.getElementById('valorPago');
            if (!valorPagoField.value || this.parseDecimal(valorPagoField.value) === 0) {
                valorPagoField.value = e.target.value;
            }
        });

        // Form validation
        ['data', 'tipo', 'descricao', 'categoria', 'banco', 'valor', 'valorPago', 'formaPagamento'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateField(fieldId));
                field.addEventListener('input', () => this.clearFieldError(fieldId));
            }
        });

        // Show/hide card select based on payment method
        document.getElementById('formaPagamento').addEventListener('change', (e) => {
            this.toggleCardSelect(e.target.value === 'Crédito');
        });

        // Add new event listeners for Firebase operations
        document.getElementById('loadDataBtn').addEventListener('click', () => this.promptForUserId('load'));
        document.getElementById('saveDataBtn').addEventListener('click', () => this.saveDataToFirestore());
        document.getElementById('generateAndSaveNewIdBtn').addEventListener('click', () => this.generateAndSaveNewId());
    }

    // VALIDATION
    validateField(fieldId) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(`${fieldId}Error`);
        let isValid = true;
        let errorMessage = '';

        if (field && errorEl) {
            switch (fieldId) {
                case 'data':
                    const date = new Date(field.value);
                    const today = new Date();
                    today.setHours(23, 59, 59, 999);
                    if (!field.value) {
                        isValid = false;
                        errorMessage = 'Data é obrigatória';
                    } else if (date > today) {
                        isValid = false;
                        errorMessage = 'Data não pode ser futura';
                    }
                    break;

                case 'valor':
                    const valor = this.parseDecimal(field.value);
                    if (!field.value || valor <= 0) {
                        isValid = false;
                        errorMessage = 'Valor deve ser maior que zero';
                    }
                    break;

                case 'valorPago':
                    if (field.value) {
                        const valorPago = this.parseDecimal(field.value);
                        const valorTotal = this.parseDecimal(document.getElementById('valor').value);
                        if (valorPago < 0) {
                            isValid = false;
                            errorMessage = 'Valor pago não pode ser negativo';
                        } else if (valorPago > valorTotal) {
                            isValid = false;
                            errorMessage = 'Valor pago não pode ser maior que o valor total';
                        }
                    }
                    break;

                default:
                    if (field.required && !field.value.trim()) {
                        isValid = false;
                        errorMessage = 'Campo obrigatório';
                    }
                    break;
            }

            if (!isValid) {
                field.classList.add('error');
                errorEl.textContent = errorMessage;
                errorEl.classList.add('show');
            } else {
                field.classList.remove('error');
                errorEl.classList.remove('show');
            }
        }

        return isValid;
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(`${fieldId}Error`);
        
        if (field && errorEl) {
            field.classList.remove('error');
            errorEl.classList.remove('show');
        }
    }

    validateForm() {
        const fields = ['data', 'tipo', 'descricao', 'categoria', 'banco', 'valor', 'formaPagamento'];
        let isValid = true;

        fields.forEach(fieldId => {
            if (!this.validateField(fieldId)) {
                isValid = false;
            }
        });

        // Additional validation for valorPago
        if (document.getElementById('valorPago').value) {
            if (!this.validateField('valorPago')) {
                isValid = false;
            }
        }

        return isValid;
    }

    // UTILITY METHODS
    parseDecimal(value) {
        if (typeof value === 'number') return Math.round(value * 100) / 100;
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
        }
        return 0;
    }

    formatCurrency(value) {
        const numValue = this.parseDecimal(value);
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(numValue);
    }

    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    // DATA MANAGEMENT (Modified for Firestore)
    loadDataFromLocalStorage() {
        try {
            const saved = localStorage.getItem('advanced_financial_data');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Erro ao carregar dados do localStorage:', error);
            this.showNotification('Erro ao carregar dados salvos localmente. Iniciando com dados vazios.', 'error');
            return {};
        }
    }

    async loadDataFromFirestore(id) {
        this.showLoading(true);
        try {
            const docRef = this.db.collection('Financeiro').doc(id);
            const doc = await docRef.get();

            if (doc.exists) {
                this.data = doc.data();
                this.userId = id; // Save the loaded user ID
                localStorage.setItem('financa_user_id', id); // Save ID for next time
                this.initializeDefaults(); // Re-initialize defaults with loaded data
                this.setCurrentDateActive(); // Garantir que mês/ano atual estejam selecionados
                this.updateDisplay();
                this.showNotification(`Dados carregados com sucesso para o ID: ${id}`, 'success');
            } else {
                this.showNotification(`Nenhum dado encontrado para o ID: ${id}. Iniciando com dados vazios.`, 'warning');
                this.data = {}; // Clear data if ID not found
                this.userId = id; // Still set the ID for saving new data
                localStorage.setItem('financa_user_id', id);
                this.initializeDefaults();
                this.setCurrentDateActive(); // Garantir que mês/ano atual estejam selecionados
                this.updateDisplay();
            }
        } catch (error) {
            console.error('Erro ao carregar dados do Firestore:', error);
            this.showNotification(`Erro ao carregar dados do Firestore: ${error.message}`, 'error');
            this.data = {}; // Clear data on error
            this.initializeDefaults();
            this.setCurrentDateActive(); // Garantir que mês/ano atual estejam selecionados
            this.updateDisplay();
        } finally {
            this.showLoading(false);
        }
    }

    async saveDataToFirestore() {
        if (!this.userId) {
            // If no userId is set, generate a new one automatically
            this.userId = this.generateUniqueId();
            localStorage.setItem('financa_user_id', this.userId);
            this.showNotification('Novo ID gerado automaticamente: ' + this.userId, 'info');
        }

        this.showLoading(true);
        try {
            const docRef = this.db.collection('Financeiro').doc(this.userId);
            await docRef.set(this.data); // Overwrite existing data or create new
            this.showNotification(`Dados salvos com sucesso para o ID: ${this.userId}`, 'success');
        } catch (error) {
            console.error('Erro ao salvar dados no Firestore:', error);
            this.showNotification(`Erro ao salvar dados no Firestore: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Override existing saveData to use Firestore
    saveData() {
        // Save to localStorage as a fallback/backup
        try {
            localStorage.setItem('advanced_financial_data', JSON.stringify(this.data));
        } catch (error) {
            console.error('Erro ao salvar dados no localStorage:', error);
            this.showNotification('Erro ao salvar dados localmente. Verifique o espaço de armazenamento.', 'error');
        }
        // Also save to Firestore if userId is set (or will be generated by saveDataToFirestore)
        this.saveDataToFirestore();
    }

    // New method to generate a unique ID
    generateUniqueId() {
        // Generates a random string that is highly unlikely to collide
        return 'financa_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // New method to generate a new ID and save current data under it
    generateAndSaveNewId() {
        if (confirm('Isso irá gerar um novo ID e salvar seus dados atuais sob ele. Deseja continuar?')) {
            this.userId = this.generateUniqueId();
            localStorage.setItem('financa_user_id', this.userId);
            this.showNotification('Novo ID gerado: ' + this.userId, 'info');
            this.saveDataToFirestore();
        }
    }

    promptForUserId(action) {
        let message = `Digite o ID para ${action === 'load' ? 'carregar' : 'salvar'} os dados:`
        if (this.userId) {
            message += ` (Atual: ${this.userId})`
        }
        const id = prompt(message);

        if (id && id.trim()) {
            const cleanId = id.trim();
            if (action === 'load') {
                this.loadDataFromFirestore(cleanId);
            } else { // save - this path is now less used, as saveDataToFirestore handles ID generation
                this.userId = cleanId; // Set the ID before saving
                localStorage.setItem('financa_user_id', cleanId);
                this.saveDataToFirestore();
            }
        } else if (id !== null) { // User clicked cancel, but not empty string
            this.showNotification('ID inválido. Operação cancelada.', 'warning');
        }
    }

    getTransactionKey() {
        return `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
    }

    getCurrentTransactions() {
        const key = this.getTransactionKey();
        return this.data.transactions[key] || [];
    }

    // UI UPDATES
    setTodayDate() {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        document.getElementById('data').value = dateString;
    }

    switchYear(year) {
        this.currentYear = year;
        
        // Update UI
        document.querySelectorAll('.year-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.year) === year);
        });
        
        this.currentPage = 1;
        this.updateDisplay();
    }

    switchMonth(month) {
        this.currentMonth = month;
        
        // Update UI
        document.querySelectorAll('.month-tab').forEach(tab => {
            tab.classList.toggle('active', parseInt(tab.dataset.month) === month);
        });
        
        this.currentPage = 1;
        this.updateDisplay();
    }

    populateSelects() {
        // Categories
        const categorySelects = [document.getElementById('categoria'), document.getElementById('filterCategoria'), document.getElementById('goalCategoria')];
        categorySelects.forEach(select => {
            if (!select) return;
            const currentValue = select.value;
            
            if (select.id === 'categoria') {
                select.innerHTML = '<option value="">Selecione...</option>';
            } else if (select.id === 'goalCategoria') {
                select.innerHTML = '<option value="">Selecione a categoria</option>';
            } else {
                select.innerHTML = '<option value="">Todas</option>';
            }
            
            this.data.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                select.appendChild(option);
            });
            
            select.value = currentValue;
        });

        // Banks
        const bankSelects = [document.getElementById('banco'), document.getElementById('filterBanco')];
        bankSelects.forEach(select => {
            if (!select) return;
            const currentValue = select.value;
            
            if (select.id === 'banco') {
                select.innerHTML = '<option value="">Selecione...</option>';
            } else {
                select.innerHTML = '<option value="">Todos</option>';
            }
            
            this.data.banks.forEach(bank => {
                const option = document.createElement('option');
                option.value = bank.id;
                option.textContent = bank.name;
                select.appendChild(option);
            });
            
            select.value = currentValue;
        });
    }

    // TRANSACTION MANAGEMENT
    addTransaction() {
        if (!this.validateForm()) {
            this.showNotification('Por favor, corrija os erros no formulário', 'error');
            return;
        }

        this.showLoading(true);

        const formData = new FormData(document.getElementById('transactionForm'));
        const transactionData = Object.fromEntries(formData);
        const isShared = document.getElementById('compartilhada').checked;
        const formaPagamento = transactionData.formaPagamento;
        const installments = parseInt(transactionData.installments) || 1;

        const baseTransaction = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            descricao: transactionData.descricao,
            tipo: transactionData.tipo,
            categoria: transactionData.categoria,
            banco: transactionData.banco,
            valor: this.parseDecimal(transactionData.valor),
            valorPago: isShared ? this.parseDecimal(transactionData.valorPago) || this.parseDecimal(transactionData.valor) : this.parseDecimal(transactionData.valor),
            formaPagamento: formaPagamento,
            cardId: formaPagamento === 'Crédito' ? transactionData.cardSelect : null,
            observacao: transactionData.observacao,
            compartilhada: isShared,
            divisao: this.tempSplitData,
            gastoPara: transactionData.gastoPara || null,
            createdAt: new Date().toISOString()
        };

        const key = this.getTransactionKey();
        if (!this.data.transactions[key]) {
            this.data.transactions[key] = [];
        }

        if (formaPagamento === 'Crédito' && installments > 1) {
            const valuePerInstallment = this.parseDecimal(baseTransaction.valor / installments);
            let currentMonthDate = new Date(transactionData.data);

            for (let i = 1; i <= installments; i++) {
                const installmentDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + (i - 1), currentMonthDate.getDate());
                const installmentKey = `${installmentDate.getFullYear()}-${installmentDate.getMonth()}`;

                const installmentTransaction = {
                    ...baseTransaction,
                    id: baseTransaction.id + '_part' + i, // Unique ID for each installment
                    data: installmentDate.toISOString().split('T')[0],
                    descricao: `${baseTransaction.descricao} (${i}/${installments})`,
                    valor: valuePerInstallment,
                    valorPago: valuePerInstallment, // Each installment is paid individually
                    installmentOf: baseTransaction.id, // Link to the original transaction ID
                    isInstallment: true // Flag para identificar parcelas
                };

                if (!this.data.transactions[installmentKey]) {
                    this.data.transactions[installmentKey] = [];
                }
                this.data.transactions[installmentKey].unshift(installmentTransaction);

                // Se for gasto compartilhado, aplicar divisão a cada parcela
                if (baseTransaction.compartilhada && baseTransaction.divisao) {
                    // Para parcelas compartilhadas, dividir o valor da parcela entre as pessoas
                    const parcelaDividida = { ...baseTransaction.divisao };
                    parcelaDividida.pessoas = parcelaDividida.pessoas.map(person => ({
                        ...person,
                        valor_devido: (person.valor_devido || 0) / installments
                    }));
                    installmentTransaction.divisao = parcelaDividida;
                }
            }
            this.showNotification(`✅ Transação parcelada em ${installments}x adicionada com sucesso!`, 'success');

        } else {
            // Single transaction
            baseTransaction.data = transactionData.data;
            this.data.transactions[key].unshift(baseTransaction);

            // Update people debts if shared
            if (baseTransaction.compartilhada && baseTransaction.divisao) {
                this.updateDebts(baseTransaction);
            }
            this.showNotification('✅ Transação adicionada com sucesso!', 'success');
        }

        this.saveData();
        this.updateDisplay();
        this.updateGoalsProgress(); // Atualizar progresso das metas após nova transação
        this.clearForm();
        
        setTimeout(() => {
            this.showLoading(false);
        }, 500);
    }

    editTransaction(id) {
        const key = this.getTransactionKey();
        const transactions = this.data.transactions[key] || [];
        const transaction = transactions.find(t => t.id === id);
        
        if (!transaction) {
            this.showNotification('Transação não encontrada!', 'error');
            return;
        }

        // Fill form with transaction data
        document.getElementById('data').value = transaction.data;
        document.getElementById('tipo').value = transaction.tipo;
        document.getElementById('descricao').value = transaction.descricao;
        document.getElementById('categoria').value = transaction.categoria;
        document.getElementById('banco').value = transaction.banco;
        document.getElementById('valor').value = transaction.valor;
        document.getElementById('valorPago').value = transaction.valorPago;
        document.getElementById('formaPagamento').value = transaction.formaPagamento;
        document.getElementById('observacao').value = transaction.observacao || '';
        document.getElementById('compartilhada').checked = transaction.compartilhada;
        document.getElementById('gastoPara').value = transaction.gastoPara || '';
        
        // Handle shared transaction data
        if (transaction.compartilhada && transaction.divisao) {
            this.tempSplitData = JSON.parse(JSON.stringify(transaction.divisao)); // Deep clone
        }
        
        this.toggleValorPagoVisibility(transaction.compartilhada);
        
        // Store the ID for updating instead of creating new
        this.editingTransactionId = id;
        
        // Change button text
        const submitBtn = document.querySelector('#transactionForm button[type="submit"]');
        submitBtn.innerHTML = '✏️ Atualizar Transação';
        
        // Scroll to form
        document.querySelector('.section').scrollIntoView({ behavior: 'smooth' });
        
        this.showNotification('Transação carregada para edição', 'info');
    }

    updateTransaction() {
        if (!this.validateForm()) {
            this.showNotification('Por favor, corrija os erros no formulário', 'error');
            return;
        }

        this.showLoading(true);

        const formData = new FormData(document.getElementById('transactionForm'));
        const transactionData = Object.fromEntries(formData);
        const isShared = document.getElementById('compartilhada').checked;

        const key = this.getTransactionKey();
        const transactions = this.data.transactions[key] || [];
        const transactionIndex = transactions.findIndex(t => t.id === this.editingTransactionId);
        
        if (transactionIndex === -1) {
            this.showLoading(false);
            this.showNotification('Transação não encontrada!', 'error');
            return;
        }

        const oldTransaction = transactions[transactionIndex];
        
        // Remove old debts if it was shared
        if (oldTransaction.compartilhada && oldTransaction.divisao) {
            this.removeDebts(oldTransaction);
        }

        const updatedTransaction = {
            ...oldTransaction,
            data: transactionData.data,
            descricao: transactionData.descricao,
            tipo: transactionData.tipo,
            categoria: transactionData.categoria,
            banco: transactionData.banco,
            valor: this.parseDecimal(transactionData.valor),
            valorPago: isShared ? this.parseDecimal(transactionData.valorPago) || this.parseDecimal(transactionData.valor) : this.parseDecimal(transactionData.valor),
            formaPagamento: transactionData.formaPagamento,
            observacao: transactionData.observacao,
            compartilhada: isShared,
            divisao: this.tempSplitData,
            gastoPara: transactionData.gastoPara || null,
            updatedAt: new Date().toISOString()
        };

        transactions[transactionIndex] = updatedTransaction;

        // Add new debts if now shared
        if (updatedTransaction.compartilhada && updatedTransaction.divisao) {
            this.updateDebts(updatedTransaction);
        }

        this.saveData();
        this.updateDisplay();
        this.clearForm();
        
        setTimeout(() => {
            this.showLoading(false);
            this.showNotification('✅ Transação atualizada com sucesso!', 'success');
        }, 500);
    }

    updateDebts(transaction) {
        if (!transaction.compartilhada || !transaction.divisao || !transaction.divisao.people) return;

        transaction.divisao.people.forEach(personInSplit => {
            if (!personInSplit.selected) return;

            const personData = this.data.people.find(p => p.id === personInSplit.id);
            if (!personData) return;

            if (!personData.debts) {
                personData.debts = [];
            }

            // Avoid adding duplicate debt if transaction is just being edited
            if (personData.debts.some(d => d.originalTransactionId === transaction.id)) return;

            const debtAmount = this.parseDecimal(personInSplit.valorDevido);
            if (debtAmount <= 0) return;

            personData.debts.push({
                id: 'debt_' + Date.now() + Math.random().toString(36).substr(2, 5),
                type: 'aReceber',
                description: `Divisão: ${transaction.descricao}`,
                amount: debtAmount,
                dueDate: transaction.data, // Use transaction date as due date
                paid: false,
                originalTransactionId: transaction.id // Link to the source transaction
            });
        });
    }

    deleteTransaction(id) {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

        this.showLoading(true);

        const key = this.getTransactionKey();
        const transactions = this.data.transactions[key] || [];
        const transactionIndex = transactions.findIndex(t => t.id === id);
        
        if (transactionIndex === -1) {
            this.showLoading(false);
            return;
        }

        const transaction = transactions[transactionIndex];
        
        // Remove debts if shared
        if (transaction.compartilhada && transaction.divisao) {
            this.removeDebts(transaction);
        }

        transactions.splice(transactionIndex, 1);
        this.saveData();
        
        setTimeout(() => {
            this.showLoading(false);
            this.updateDisplay();
            this.showNotification('🗑️ Transação excluída!', 'success');
        }, 300);
    }

    removeDebts(transaction) {
        if (!transaction.compartilhada || !transaction.divisao) return;

        // Iterate over all people to find and remove the debts associated with this transaction
        this.data.people.forEach(person => {
            if (person.debts && person.debts.length > 0) {
                person.debts = person.debts.filter(
                    d => d.originalTransactionId !== transaction.id
                );
            }
        });
    }

    clearForm() {
        document.getElementById('transactionForm').reset();
        document.getElementById('compartilhada').checked = false;
        
        // Clear errors
        document.querySelectorAll('.error-message').forEach(error => {
            error.classList.remove('show');
        });
        document.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });

        this.tempSplitData = null;
        this.editingTransactionId = null;
        
        // Reset button text
        const submitBtn = document.querySelector('#transactionForm button[type="submit"]');
        submitBtn.innerHTML = '➕ Adicionar Transação';
        
        this.toggleValorPagoVisibility(false);
        this.setTodayDate();
    }

    toggleValorPagoVisibility(isShared) {
        const valorPagoGroup = document.getElementById('valorPagoGroup');
        if (isShared) {
            valorPagoGroup.classList.remove('hidden');
        } else {
            valorPagoGroup.classList.add('hidden');
            document.getElementById('valorPago').value = '';
        }
    }

    // SPLIT FUNCTIONALITY
    openSplitModal() {
        const valor = this.parseDecimal(document.getElementById('valor').value);
        if (valor <= 0) {
            this.showNotification('Defina um valor para a transação primeiro!', 'error');
            document.getElementById('compartilhada').checked = false;
            return;
        }

        document.getElementById('splitTotalValue').textContent = this.formatCurrency(valor);
        document.getElementById('splitModal').classList.add('active');
        this.populateSplitPersonSelect();
        this.updateSplitPeopleList();
    }

    closeSplitModal() {
        document.getElementById('splitModal').classList.remove('active');
        if (!this.tempSplitData) {
            document.getElementById('compartilhada').checked = false;
        }
    }

    switchSplitType(type) {
        document.querySelectorAll('.split-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        this.updateSplitCalculation();
    }

    populateSplitPersonSelect() {
        const select = document.getElementById('splitPersonSelect');
        const addButton = document.querySelector('#splitModal button[onclick="app.addPersonToSplit()"]');
        select.innerHTML = '<option value="">Selecione uma pessoa...</option>';

        const peopleInSplit = this.tempSplitData ? this.tempSplitData.people.map(p => p.id) : [];
        
        const availablePeople = this.data.people.filter(p => !peopleInSplit.includes(p.id));

        if (availablePeople.length === 0) {
            select.innerHTML = '<option value="">Nenhuma pessoa disponível</option>';
            select.disabled = true;
            addButton.disabled = true;
        } else {
            availablePeople.forEach(person => {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = person.name;
                select.appendChild(option);
            });
            select.disabled = false;
            addButton.disabled = false;
        }
    }

    addPersonToSplit() {
        const select = document.getElementById('splitPersonSelect');
        const personId = select.value;
        
        if (!personId) {
            this.showNotification('Selecione uma pessoa da lista!', 'error');
            return;
        }

        const person = this.data.people.find(p => p.id === personId);
        if (!person) {
            this.showNotification('Pessoa não encontrada!', 'error');
            return;
        }

        // Initialize split data if not exists
        if (!this.tempSplitData) {
            this.tempSplitData = {
                type: 'igual',
                people: []
            };
        }

        // This check is redundant now but good for safety
        if (this.tempSplitData.people.find(p => p.id === person.id)) {
            this.showNotification('Pessoa já foi adicionada!', 'warning');
            return;
        }

        this.tempSplitData.people.push({
            id: person.id,
            name: person.name,
            selected: true,
            valorDevido: 0,
            percentual: 0
        });

        this.populateSplitPersonSelect();
        this.updateSplitPeopleList();
        this.updateSplitCalculation();
    }

    updateSplitPeopleList() {
        const container = document.getElementById('splitPeopleList');
        
        if (!this.tempSplitData || !this.tempSplitData.people.length) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenhuma pessoa adicionada ainda</p>';
            return;
        }

        const activeType = document.querySelector('.split-type-btn.active').dataset.type;

        container.innerHTML = this.tempSplitData.people.map(person => `
            <div class="person-item">
                <input type="checkbox" class="person-checkbox" 
                       ${person.selected ? 'checked' : ''}
                       onchange="app.togglePersonInSplit('${person.id}')">
                <div class="person-info">
                    <strong>${person.name}</strong>
                    <div class="person-value">
                        ${activeType === 'igual' ? 
                            `<span class="text-success">${this.formatCurrency(person.valorDevido)}</span>` :
                            activeType === 'percentual' ?
                            `<input type="number" min="0" max="100" value="${person.percentual}" 
                             onchange="app.updatePersonPercentual('${person.id}', this.value)" 
                             style="width: 60px; padding: 4px;"> %` :
                            `<input type="number" min="0" step="0.01" value="${person.valorDevido}" 
                             onchange="app.updatePersonValue('${person.id}', this.value)"
                             style="width: 80px; padding: 4px;">`
                        }
                    </div>
                </div>
                <button type="button" class="btn btn-danger btn-small" 
                        onclick="app.removePersonFromSplit('${person.id}')">
                    🗑️
                </button>
            </div>
        `).join('');
    }

    togglePersonInSplit(personId) {
        const person = this.tempSplitData.people.find(p => p.id === personId);
        if (person) {
            person.selected = !person.selected;
            this.updateSplitCalculation();
        }
    }

    updatePersonPercentual(personId, value) {
        const person = this.tempSplitData.people.find(p => p.id === personId);
        if (person) {
            person.percentual = this.parseDecimal(value);
            this.updateSplitCalculation();
        }
    }

    updatePersonValue(personId, value) {
        const person = this.tempSplitData.people.find(p => p.id === personId);
        if (person) {
            person.valorDevido = this.parseDecimal(value);
        }
    }

    removePersonFromSplit(personId) {
        if (!this.tempSplitData) return;
        
        this.tempSplitData.people = this.tempSplitData.people.filter(p => p.id !== personId);
        this.updateSplitPeopleList();
        this.updateSplitCalculation();
    }

    updateSplitCalculation() {
        if (!this.tempSplitData) return;

        const totalValue = this.parseDecimal(document.getElementById('valor').value);
        const activeType = document.querySelector('.split-type-btn.active').dataset.type;
        const selectedPeople = this.tempSplitData.people.filter(p => p.selected);

        this.tempSplitData.type = activeType;

        switch (activeType) {
            case 'igual':
                // Include the user (person paying) in the equal division
                const totalPeopleCount = selectedPeople.length + 1; // +1 for the user themselves
                const valuePerPerson = totalValue / totalPeopleCount;
                selectedPeople.forEach(person => {
                    person.valorDevido = this.parseDecimal(valuePerPerson);
                });
                break;

            case 'percentual':
                selectedPeople.forEach(person => {
                    person.valorDevido = this.parseDecimal((totalValue * person.percentual) / 100);
                });
                break;

            case 'fixo':
                // Values are set manually, no automatic calculation
                break;
        }

        this.updateSplitPeopleList();
    }

    saveSplitTransaction() {
        if (!this.tempSplitData || !this.tempSplitData.people.length) {
            this.showNotification('Adicione pelo menos uma pessoa!', 'error');
            return;
        }

        const selectedPeople = this.tempSplitData.people.filter(p => p.selected);
        if (!selectedPeople.length) {
            this.showNotification('Selecione pelo menos uma pessoa!', 'error');
            return;
        }

        const totalValue = this.parseDecimal(document.getElementById('valor').value);
        const totalSplit = selectedPeople.reduce((sum, p) => sum + this.parseDecimal(p.valorDevido), 0);

        if (Math.abs(totalSplit - totalValue) > 0.01) {
            this.showNotification(`Atenção: Total dividido (${this.formatCurrency(totalSplit)}) diferente do valor total (${this.formatCurrency(totalValue)})`, 'warning');
        }

        this.closeSplitModal();
        this.showNotification('✅ Divisão configurada!', 'success');
    }

    // DEBT MANAGEMENT
    updateDebtsPanel() {
        const receivableList = document.getElementById('receivableList');
        const payableList = document.getElementById('payableList');

        const allDebts = this.data.people.flatMap(p => 
            (p.debts || []).map(d => ({ ...d, personId: p.id, personName: p.name }))
        );

        const receivables = allDebts.filter(d => d.type === 'aReceber' && !d.paid);
        const payables = allDebts.filter(d => d.type === 'aPagar' && !d.paid);

        receivableList.innerHTML = receivables.length ? receivables.map(this.renderDebtItem).join('') : '<p class="text-muted" style="padding: 15px; text-align: center;">Ninguém te deve.</p>';
        payableList.innerHTML = payables.length ? payables.map(this.renderDebtItem).join('') : '<p class="text-muted" style="padding: 15px; text-align: center;">Você não deve a ninguém.</p>';
    }

    renderDebtItem(debt) {
        const isPayable = debt.type === 'aPagar';
        return `
            <div class="debt-item" onclick="app.payDebt('${debt.id}', ${isPayable})">
                <div class="debt-info">
                    <h4>${debt.description}</h4>
                    <div class="debt-count">${isPayable ? 'Para:' : 'De:'} ${debt.personName}</div>
                    <div class="debt-count">Vence: ${new Date(debt.dueDate).toLocaleDateString('pt-BR')}</div>
                </div>
                <div class="debt-amount ${isPayable ? 'negative' : 'positive'}">
                    ${this.formatCurrency(debt.amount)}
                </div>
            </div>
        `;
    }

    openDebtManagementModal() {
        document.getElementById('debtManagementModal').classList.add('active');
        this.populateDebtPersonSelect();
        document.getElementById('debtForm').reset();
    }

    closeDebtManagementModal() {
        document.getElementById('debtManagementModal').classList.remove('active');
    }

    populateDebtPersonSelect() {
        const select = document.getElementById('debtPerson');
        select.innerHTML = '';
        this.data.people.forEach(person => {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = person.name;
            select.appendChild(option);
        });
    }

    saveDebt() {
        const type = document.getElementById('debtType').value;
        const personId = document.getElementById('debtPerson').value;
        const description = document.getElementById('debtDescription').value;
        const amount = this.parseDecimal(document.getElementById('debtAmount').value);
        const dueDate = document.getElementById('debtDueDate').value;

        if (!personId || !description || !amount || !dueDate) {
            this.showNotification('Preencha todos os campos.', 'error');
            return;
        }

        const person = this.data.people.find(p => p.id === personId);
        if (!person) return;

        if (!person.debts) {
            person.debts = [];
        }

        person.debts.push({
            id: 'debt_' + Date.now(),
            type,
            description,
            amount,
            dueDate,
            paid: false
        });

        this.saveData();
        this.updateDebtsPanel();
        this.closeDebtManagementModal();
        this.showNotification('Dívida salva com sucesso!', 'success');
    }

    payDebt(debtId, isPayable) {
        if (!isPayable) {
            this.showNotification('Ações para contas a receber serão implementadas em breve.', 'info');
            return;
        }

        let debt, person;
        for (const p of this.data.people) {
            const foundDebt = (p.debts || []).find(d => d.id === debtId);
            if (foundDebt) {
                debt = foundDebt;
                person = p;
                break;
            }
        }

        if (!debt || !person) return;

        if (!confirm(`Deseja registrar o pagamento de "${debt.description}" no valor de ${this.formatCurrency(debt.amount)}?`)) return;

        // Mark debt as paid
        debt.paid = true;

        // Create a new expense transaction
        const transaction = {
            id: Date.now().toString(),
            data: new Date().toISOString().split('T')[0],
            descricao: `Pagamento Dívida: ${debt.description}`,
            tipo: 'Saída',
            categoria: 'pagamentos',
            banco: 'default', 
            valor: debt.amount,
            valorPago: debt.amount,
            formaPagamento: 'Débito',
            observacao: `Pagamento para ${person.name}`,
            compartilhada: false,
            divisao: null,
            gastoPara: null,
            createdAt: new Date().toISOString()
        };

        const key = this.getTransactionKey();
        if (!this.data.transactions[key]) {
            this.data.transactions[key] = [];
        }
        this.data.transactions[key].unshift(transaction);

        this.saveData();
        this.updateDisplay();
        this.showNotification('Pagamento registrado e dívida baixada!', 'success');
    }

    // TABLE SORTING
    sortTable(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'desc';
        }

        // Update UI
        document.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === this.sortField) {
                th.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });

        this.currentPage = 1;
        this.updateTransactionsTable();
    }

    // DISPLAY UPDATES
    updateDisplay() {
        this.updateDashboard();
        this.updateTransactionsTable();
        this.updateFilters();
        this.updateDebtsPanel();
        this.updateStats();
        this.updateRecentPeople();
        this.updateGastosPorPessoa();
        this.updateGoalsDashboard();
        this.updateCardDashboard();
        this.updateLoanList();
        this.updateAnalysisSection();
    }

    updateDashboard() {
        const transactions = this.getCurrentTransactions();
        
        const entradasMes = transactions
            .filter(t => t.tipo === 'Entrada')
            .reduce((sum, t) => sum + this.parseDecimal(t.valor), 0);

        const saidasMes = transactions
            .filter(t => t.tipo === 'Saída')
            .reduce((sum, t) => sum + this.parseDecimal(t.valor), 0);

        const saldoMes = entradasMes - saidasMes;

        document.getElementById('totalEntradas').textContent = this.formatCurrency(entradasMes);
        document.getElementById('totalSaidas').textContent = this.formatCurrency(saidasMes);
        // Saldo do mês atual
        document.getElementById('saldoMes').textContent = this.formatCurrency(saldoMes);
        
        // Calcular saldo acumulativo (todas as transações até o mês atual)
        const saldoAcumulativo = this.calculateAccumulativeBalance();
        document.getElementById('saldoAcumulativo').textContent = this.formatCurrency(saldoAcumulativo);

        // Update saldo do mês color
        const monthlyBalanceEl = document.getElementById('saldoMes');
        monthlyBalanceEl.className = `dashboard-value ${saldoMes >= 0 ? 'entradas' : 'saidas'}`;
        
        // Update saldo acumulativo color
        const accumulativeBalanceEl = document.getElementById('saldoAcumulativo');
        accumulativeBalanceEl.className = `dashboard-value ${saldoAcumulativo >= 0 ? 'entradas' : 'saidas'}`;

        // Calculate and display accumulated balance
        this.updateAccumulatedBalance();

        const totalDividas = this.data.people
            .reduce((sum, p) => sum + Math.abs(this.parseDecimal(p.totalOwed)), 0);
        document.getElementById('totalDividas').textContent = this.formatCurrency(totalDividas);
        
        // Update advanced dashboard
        this.updateAdvancedDashboard();
    }

    updateAccumulatedBalance() {
        let totalEntradas = 0;
        let totalSaidas = 0;

        for (const yearMonth in this.data.transactions) {
            const transactions = this.data.transactions[yearMonth];
            transactions.forEach(t => {
                if (t.tipo === 'Entrada') {
                    totalEntradas += this.parseDecimal(t.valor);
                } else if (t.tipo === 'Saída') {
                    totalSaidas += this.parseDecimal(t.valor);
                }
            });
        }

        const accumulatedBalance = totalEntradas - totalSaidas;
        // TODO: Elemento 'accumulated-balance' não existe no HTML atual
        // document.getElementById('accumulated-balance').textContent = this.formatCurrency(accumulatedBalance);

        // Update accumulated balance color
        // const accumulatedBalanceEl = document.getElementById('accumulated-balance');
        // accumulatedBalanceEl.className = `dashboard-value ${accumulatedBalance >= 0 ? 'entradas' : 'saidas'}`;
    }

    calculateAccumulativeBalance() {
        let totalEntradas = 0;
        let totalSaidas = 0;
        
        // Iterar por todos os anos e meses até o mês/ano atual
        for (let year = 2020; year <= this.currentYear; year++) {
            const maxMonth = (year === this.currentYear) ? this.currentMonth : 11;
            
            for (let month = 0; month <= maxMonth; month++) {
                const monthKey = `${year}-${month}`;
                const transactions = this.data.transactions[monthKey] || [];
                
                transactions.forEach(t => {
                    if (t.tipo === 'Entrada') {
                        totalEntradas += this.parseDecimal(t.valor);
                    } else if (t.tipo === 'Saída') {
                        totalSaidas += this.parseDecimal(t.valor);
                    }
                });
            }
        }
        
        return totalEntradas - totalSaidas;
    }

    setCurrentDateActive() {
        // Definir o ano atual como ativo
        document.querySelectorAll('.year-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.year) === this.currentYear) {
                btn.classList.add('active');
            }
        });

        // Definir o mês atual como ativo
        document.querySelectorAll('.month-tab').forEach(tab => {
            tab.classList.remove('active');
            if (parseInt(tab.dataset.month) === this.currentMonth) {
                tab.classList.add('active');
                // Scroll para o mês ativo no mobile
                this.scrollToActiveMonth(tab);
            }
        });
    }

    scrollToActiveMonth(activeTab) {
        // Auto-scroll para o mês ativo em dispositivos móveis
        if (window.innerWidth <= 768) {
            const monthTabs = document.querySelector('.month-tabs');
            if (monthTabs && activeTab) {
                const scrollLeft = activeTab.offsetLeft - (monthTabs.clientWidth / 2) + (activeTab.clientWidth / 2);
                monthTabs.scrollTo({
                    left: scrollLeft,
                    behavior: 'smooth'
                });
            }
        }
    }

    setupMobileFeatures() {
        // Detectar se é dispositivo mobile
        const isMobile = window.innerWidth <= 768;
        
        // Adicionar classe para CSS específico
        if (isMobile) {
            document.body.classList.add('mobile-device');
        }

        // Listener para mudanças de orientação
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });

        // Listener para resize da janela
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        // Scroll suave para navegação por meses
        document.querySelectorAll('.month-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.scrollToActiveMonth(tab);
                }
            });
        });

        // Melhorar experiência de toque nos modais
        this.setupTouchModals();

        // Auto-hide da barra de endereço no mobile (iOS Safari)
        if (isMobile && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
            this.hideAddressBar();
        }
    }

    handleOrientationChange() {
        // Reajustar layout após mudança de orientação
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            document.body.classList.add('mobile-device');
        } else {
            document.body.classList.remove('mobile-device');
        }

        // Scroll para mês ativo se necessário
        const activeTab = document.querySelector('.month-tab.active');
        if (activeTab && window.innerWidth <= 768) {
            this.scrollToActiveMonth(activeTab);
        }

        // Reajustar modais abertos
        const openModal = document.querySelector('.modal-overlay:not(.hidden)');
        if (openModal) {
            this.adjustModalForDevice(openModal);
        }
    }

    handleWindowResize() {
        // Throttle resize events para performance
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.handleOrientationChange();
        }, 250);
    }

    setupTouchModals() {
        // Melhorar experiência de toque nos modais
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            // Fechar modal ao tocar no overlay (fora do modal)
            overlay.addEventListener('touchstart', (e) => {
                if (e.target === overlay) {
                    // Encontrar método de fechamento específico
                    const closeBtn = overlay.querySelector('.modal-close');
                    if (closeBtn) {
                        closeBtn.click();
                    }
                }
            }, { passive: true });
        });
    }

    adjustModalForDevice(modalOverlay) {
        const modal = modalOverlay.querySelector('.modal');
        if (!modal) return;

        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Ajustar altura do modal para viewport móvel
            const viewportHeight = window.innerHeight;
            const maxHeight = viewportHeight * 0.9;
            modal.style.maxHeight = `${maxHeight}px`;
            
            // Centralizar verticalmente
            modal.style.marginTop = 'auto';
            modal.style.marginBottom = 'auto';
        } else {
            // Reset para desktop
            modal.style.maxHeight = '';
            modal.style.marginTop = '';
            modal.style.marginBottom = '';
        }
    }

    hideAddressBar() {
        // Esconder barra de endereço no iOS Safari
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 500);
    }

    // ==================== SISTEMA DE METAS ====================
    
    getGoalKey() {
        return `${this.currentYear}-${this.currentMonth}`;
    }

    addGoal(categoria, valorMeta, tipo = 'limite_maximo') {
        const goalKey = this.getGoalKey();
        
        if (!this.data.goals[goalKey]) {
            this.data.goals[goalKey] = [];
        }

        // Verificar se já existe meta para esta categoria no mês
        const existingGoal = this.data.goals[goalKey].find(g => g.categoria === categoria);
        if (existingGoal) {
            this.showNotification(`Já existe uma meta para ${categoria} este mês!`, 'warning');
            return false;
        }

        const goal = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            categoria: categoria,
            tipo: tipo, // limite_maximo, economia_minima, meta_entrada
            valor_meta: this.parseDecimal(valorMeta),
            valor_gasto: 0, // calculado automaticamente
            status: 'ativo',
            criado_em: new Date().toISOString().split('T')[0],
            alertas: {
                '50_porcento': false,
                '80_porcento': false,
                '100_porcento': false
            }
        };

        this.data.goals[goalKey].push(goal);
        this.saveData();
        this.updateGoalsProgress();
        this.showNotification(`✅ Meta de ${categoria} adicionada com sucesso!`, 'success');
        return true;
    }

    removeGoal(goalId) {
        const goalKey = this.getGoalKey();
        if (!this.data.goals[goalKey]) return;

        this.data.goals[goalKey] = this.data.goals[goalKey].filter(g => g.id !== goalId);
        this.saveData();
        this.updateGoalsProgress();
        this.showNotification('Meta removida!', 'success');
    }

    calculateGoalProgress() {
        const goalKey = this.getGoalKey();
        const goals = this.data.goals[goalKey] || [];
        const transactionKey = `${this.currentYear}-${this.currentMonth}`;
        const transactions = this.data.transactions[transactionKey] || [];

        goals.forEach(goal => {
            let totalSpent = 0;
            
            // Calcular total gasto na categoria
            transactions.forEach(t => {
                if (t.categoria === goal.categoria && t.tipo === 'Saída') {
                    totalSpent += this.parseDecimal(t.valor);
                }
            });

            goal.valor_gasto = totalSpent;
            
            // Verificar alertas
            this.checkGoalAlerts(goal);
        });

        this.saveData();
    }

    checkGoalAlerts(goal) {
        if (goal.tipo !== 'limite_maximo') return;

        const percentage = (goal.valor_gasto / goal.valor_meta) * 100;
        
        if (percentage >= 100 && !goal.alertas['100_porcento']) {
            goal.alertas['100_porcento'] = true;
            this.showNotification(`🚨 Meta de ${goal.categoria} estourada! ${this.formatCurrency(goal.valor_gasto)}/${this.formatCurrency(goal.valor_meta)}`, 'error');
        } else if (percentage >= 80 && !goal.alertas['80_porcento']) {
            goal.alertas['80_porcento'] = true;
            this.showNotification(`⚠️ Cuidado! 80% da meta de ${goal.categoria} atingida! ${this.formatCurrency(goal.valor_gasto)}/${this.formatCurrency(goal.valor_meta)}`, 'warning');
        } else if (percentage >= 50 && !goal.alertas['50_porcento']) {
            goal.alertas['50_porcento'] = true;
            this.showNotification(`💡 Você já gastou 50% da meta de ${goal.categoria}: ${this.formatCurrency(goal.valor_gasto)}/${this.formatCurrency(goal.valor_meta)}`, 'info');
        }
    }

    updateGoalsProgress() {
        this.calculateGoalProgress();
        this.updateGoalsDashboard();
    }

    updateGoalsDashboard() {
        const goalKey = this.getGoalKey();
        const goals = this.data.goals[goalKey] || [];
        const activeGoalsDiv = document.getElementById('activeGoals');
        
        if (goals.length === 0) {
            activeGoalsDiv.innerHTML = '<p class="text-muted">Nenhuma meta definida para este mês</p>';
            return;
        }

        let html = '<div class="goals-grid">';
        
        goals.forEach(goal => {
            const percentage = goal.valor_meta > 0 ? Math.min((goal.valor_gasto / goal.valor_meta) * 100, 100) : 0;
            const remaining = Math.max(goal.valor_meta - goal.valor_gasto, 0);
            
            let statusClass = 'success';
            let statusIcon = '✅';
            
            if (percentage >= 100) {
                statusClass = 'danger';
                statusIcon = '🚨';
            } else if (percentage >= 80) {
                statusClass = 'warning';
                statusIcon = '⚠️';
            } else if (percentage >= 50) {
                statusClass = 'info';
                statusIcon = '💡';
            }

            const tipoIcon = goal.tipo === 'limite_maximo' ? '🚫' : '💰';
            const tipoLabel = goal.tipo === 'limite_maximo' ? 'Limite Máximo' : 'Meta de Economia';

            html += `
                <div class="goal-card ${statusClass}">
                    <div class="goal-header">
                        <h4>${tipoIcon} ${goal.categoria}</h4>
                        <button class="btn-small btn-danger" onclick="app.removeGoalById('${goal.id}')" title="Remover meta">🗑️</button>
                    </div>
                    <div class="goal-type">${tipoLabel}</div>
                    <div class="goal-values">
                        <span class="current">${this.formatCurrency(goal.valor_gasto)}</span>
                        <span class="separator">/</span>
                        <span class="target">${this.formatCurrency(goal.valor_meta)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${statusClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="goal-info">
                        <span class="percentage">${statusIcon} ${percentage.toFixed(0)}%</span>
                        <span class="remaining">${goal.tipo === 'limite_maximo' ? 'Restam' : 'Faltam'}: ${this.formatCurrency(remaining)}</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        activeGoalsDiv.innerHTML = html;
    }

    removeGoalById(goalId) {
        if (!confirm('Tem certeza que deseja remover esta meta?')) return;
        
        const goalKey = this.getGoalKey();
        if (!this.data.goals[goalKey]) return;

        this.data.goals[goalKey] = this.data.goals[goalKey].filter(g => g.id !== goalId);
        this.saveData();
        this.updateGoalsDashboard();
        this.showNotification('Meta removida!', 'success');
    }

    updateAdvancedDashboard() {
        // Update Metas card
        this.updateMetasCard();
        
        // Update Comparativo card 
        this.updateComparativoCard();
    }

    updateMetasCard() {
        const metaProgress = document.getElementById('metaProgress');
        const metaSubtitle = document.getElementById('metaSubtitle');
        
        const goalKey = this.getGoalKey();
        const goals = this.data.goals[goalKey] || [];
        
        if (goals.length === 0) {
            metaProgress.textContent = '0%';
            metaSubtitle.textContent = 'Sem metas definidas para este mês';
            metaProgress.className = 'dashboard-value';
            return;
        }

        // Calculate overall progress from all active goals in current month
        const activeGoals = goals.filter(g => g.status === 'ativo');
        
        if (activeGoals.length === 0) {
            metaProgress.textContent = '0%';
            metaSubtitle.textContent = 'Sem metas ativas este mês';
            metaProgress.className = 'dashboard-value';
            return;
        }

        let totalProgress = 0;
        let exceededGoals = 0;
        
        activeGoals.forEach(goal => {
            const percentage = goal.valor_meta > 0 ? (goal.valor_gasto / goal.valor_meta) * 100 : 0;
            totalProgress += percentage;
            if (percentage >= 100) exceededGoals++;
        });

        const avgProgress = Math.min(totalProgress / activeGoals.length, 100);
        
        metaProgress.textContent = `${avgProgress.toFixed(0)}%`;
        
        if (exceededGoals > 0) {
            metaProgress.className = 'dashboard-value saidas';
            metaSubtitle.textContent = `${exceededGoals} meta(s) excedida(s)`;
        } else if (avgProgress >= 80) {
            metaProgress.className = 'dashboard-value dividas';
            metaSubtitle.textContent = `${activeGoals.length} meta(s) próximas do limite`;
        } else {
            metaProgress.className = 'dashboard-value entradas';
            metaSubtitle.textContent = `${activeGoals.length} meta(s) sob controle`;
        }
    }

    updateComparativoCard() {
        const current = this.getCurrentTransactions();
        const currentSaidas = current
            .filter(t => t.tipo === 'Saída')
            .reduce((sum, t) => sum + this.parseDecimal(t.valor), 0);
        
        // Get previous month data
        const prevMonth = new Date(this.currentYear, this.currentMonth - 1, 1);
        const prevYear = prevMonth.getFullYear();
        const prevMonthIndex = prevMonth.getMonth();
        const prevTransactionKey = `${prevYear}-${String(prevMonthIndex).padStart(2, '0')}`;
        const prevTransactions = this.data.transactions[prevTransactionKey] || [];
        
        const prevSaidas = prevTransactions
            .filter(t => t.tipo === 'Saída')
            .reduce((sum, t) => sum + this.parseDecimal(t.valor), 0);
        
        const comparativoValue = document.getElementById('comparativoValue');
        const comparativoSubtitle = document.getElementById('comparativoSubtitle');
        
        if (prevSaidas === 0) {
            comparativoValue.textContent = '-';
            comparativoSubtitle.textContent = 'Mês anterior sem dados';
            comparativoValue.className = 'dashboard-value';
        } else {
            const diff = currentSaidas - prevSaidas;
            const percent = ((diff / prevSaidas) * 100);
            
            if (diff > 0) {
                comparativoValue.textContent = `+${percent.toFixed(1)}%`;
                comparativoValue.className = 'dashboard-value saidas';
                comparativoSubtitle.textContent = `+${this.formatCurrency(diff)} vs. anterior`;
            } else if (diff < 0) {
                comparativoValue.textContent = `${percent.toFixed(1)}%`;
                comparativoValue.className = 'dashboard-value entradas';
                comparativoSubtitle.textContent = `${this.formatCurrency(diff)} vs. anterior`;
            } else {
                comparativoValue.textContent = '0%';
                comparativoValue.className = 'dashboard-value';
                comparativoSubtitle.textContent = 'Mesmo que o anterior';
            }
        }
    }

    

    // GOALS SYSTEM METHODS
    addGoal() {
        const categoria = document.getElementById('goalCategoria').value;
        const tipo = document.getElementById('goalTipo').value;
        const valor = parseFloat(document.getElementById('goalValor').value);

        if (!categoria || !tipo || !valor || valor <= 0) {
            this.showNotification('Preencha todos os campos obrigatórios corretamente.', 'error');
            return;
        }

        const success = this.addGoalByCategory(categoria, valor, tipo);
        
        if (success) {
            document.getElementById('goalsForm').reset();
            this.updateGoalsDashboard();
        }
    }

    // Método renomeado da implementação anterior
    addGoalByCategory(categoria, valorMeta, tipo = 'limite_maximo') {
        const goalKey = this.getGoalKey();
        
        if (!this.data.goals[goalKey]) {
            this.data.goals[goalKey] = [];
        }

        // Verificar se já existe meta para esta categoria no mês
        const existingGoal = this.data.goals[goalKey].find(g => g.categoria === categoria);
        if (existingGoal) {
            this.showNotification(`Já existe uma meta para ${categoria} este mês!`, 'warning');
            return false;
        }

        const goal = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            categoria: categoria,
            tipo: tipo, // limite_maximo, economia_minima, meta_entrada
            valor_meta: this.parseDecimal(valorMeta),
            valor_gasto: 0, // calculado automaticamente
            status: 'ativo',
            criado_em: new Date().toISOString().split('T')[0],
            alertas: {
                '50_porcento': false,
                '80_porcento': false,
                '100_porcento': false
            }
        };

        this.data.goals[goalKey].push(goal);
        this.saveData();
        this.updateGoalsProgress();
        this.showNotification(`✅ Meta de ${categoria} adicionada com sucesso!`, 'success');
        return true;
    }





    getTransactionsInPeriod(startDate, endDate) {
        const allTransactions = [];
        
        Object.keys(this.data.transactions).forEach(yearMonth => {
            const transactions = this.data.transactions[yearMonth] || [];
            transactions.forEach(transaction => {
                const transDate = new Date(transaction.data);
                if (transDate >= startDate && transDate <= endDate) {
                    allTransactions.push(transaction);
                }
            });
        });
        
        return allTransactions;
    }

    updateTransactionsTable() {
        const tbody = document.getElementById('transactionsBody');
        const transactions = this.getFilteredAndSortedTransactions();
        
        // Pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedTransactions = transactions.slice(startIndex, endIndex);

        if (!paginatedTransactions.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        ${transactions.length === 0 ? 'Nenhuma transação encontrada' : 'Nenhuma transação nesta página'}
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = paginatedTransactions.map(t => `
                <tr>
                    <td>${new Date(t.data).toLocaleDateString('pt-BR')}</td>
                    <td>
                        <div style="font-weight: 600;">${t.descricao}</div>
                        ${t.observacao ? `<div style="font-size: 12px; color: var(--text-secondary);">${t.observacao}</div>` : ''}
                    </td>
                    <td>
                        <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; 
                                     background: ${t.tipo === 'Entrada' ? 'var(--success)' : 'var(--danger)'}; color: white;">
                            ${t.tipo}
                        </span>
                    </td>
                    <td class="${t.tipo === 'Entrada' ? 'value-positive' : 'value-negative'}">
                        ${this.formatCurrency(t.valor)}
                    </td>
                    <td class="${t.tipo === 'Entrada' ? 'value-positive' : 'value-negative'}">
                        ${this.formatCurrency(t.valorPago)}
                    </td>
                    <td>${this.getCategoryName(t.categoria)}</td>
                    <td>${this.getBankName(t.banco)}</td>
                    <td>
                        ${t.compartilhada ? 
                            `<span class="shared-badge">COMPARTILHADA</span>` : 
                            t.gastoPara ? 
                            `<span style="background: var(--info); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">PARA: ${this.getPersonName(t.gastoPara)}</span>` :
                            '<span style="color: var(--text-secondary);">Individual</span>'
                        }
                        ${t.compartilhada && t.divisao ? 
                            `<div style="font-size: 11px; color: var(--text-secondary);">
                                ${t.divisao.people.filter(p => p.selected).length} pessoa(s)
                            </div>` : ''
                        }
                    </td>
                    <td class="action-buttons">
                        <button class="btn btn-secondary btn-icon btn-small" onclick="app.editTransaction('${t.id}')" title="Editar">
                            ✏️
                        </button>
                        <button class="btn btn-danger btn-icon btn-small" onclick="app.deleteTransaction('${t.id}')" title="Excluir">
                            🗑️
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        this.updatePagination(transactions.length);
    }

    getFilteredAndSortedTransactions() {
        let transactions = this.getCurrentTransactions();
        
        // Apply filters
        const filters = {
            tipo: document.getElementById('filterTipo').value,
            categoria: document.getElementById('filterCategoria').value,
            banco: document.getElementById('filterBanco').value,
            status: document.getElementById('filterStatus').value
        };

        transactions = transactions.filter(t => {
            // Search filter
            if (this.searchTerm) {
                const searchableText = `${t.descricao} ${t.observacao} ${t.valor}`.toLowerCase();
                if (!searchableText.includes(this.searchTerm)) return false;
            }

            // Other filters
            if (filters.tipo && t.tipo !== filters.tipo) return false;
            if (filters.categoria && t.categoria !== filters.categoria) return false;
            if (filters.banco && t.banco !== filters.banco) return false;
            if (filters.status === 'compartilhada' && !t.compartilhada) return false;
            if (filters.status === 'individual' && t.compartilhada) return false;
            
            return true;
        });

        // Sort transactions
        transactions.sort((a, b) => {
            let aValue = a[this.sortField];
            let bValue = b[this.sortField];

            // Handle different data types
            if (this.sortField === 'data') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            } else if (this.sortField === 'valor' || this.sortField === 'valorPago') {
                aValue = this.parseDecimal(aValue);
                bValue = this.parseDecimal(bValue);
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (this.sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return transactions;
    }

    updatePagination(totalItems) {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let html = '';

        // Previous button
        if (this.currentPage > 1) {
            html += `<button class="pagination-btn" onclick="app.goToPage(${this.currentPage - 1})">‹ Anterior</button>`;
        }

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            html += `<button class="pagination-btn" onclick="app.goToPage(1)">1</button>`;
            if (startPage > 2) {
                html += `<span>...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" onclick="app.goToPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span>...</span>`;
            }
            html += `<button class="pagination-btn" onclick="app.goToPage(${totalPages})">${totalPages}</button>`;
        }

        // Next button
        if (this.currentPage < totalPages) {
            html += `<button class="pagination-btn" onclick="app.goToPage(${this.currentPage + 1})">Próxima ›</button>`;
        }

        pagination.innerHTML = html;
    }

    goToPage(page) {
        this.currentPage = page;
        this.updateTransactionsTable();
    }

    updateFilters() {
        const transactions = this.getCurrentTransactions();
        
        // Categories filter
        const categoriaFilter = document.getElementById('filterCategoria');
        const currentCategoria = categoriaFilter.value;
        categoriaFilter.innerHTML = '<option value="">Todas</option>';
        
        const usedCategories = [...new Set(transactions.map(t => t.categoria))];
        usedCategories.forEach(catId => {
            const option = document.createElement('option');
            option.value = catId;
            option.textContent = this.getCategoryName(catId);
            categoriaFilter.appendChild(option);
        });
        categoriaFilter.value = currentCategoria;

        // Banks filter
        const bancoFilter = document.getElementById('filterBanco');
        const currentBanco = bancoFilter.value;
        bancoFilter.innerHTML = '<option value="">Todos</option>';
        
        const usedBanks = [...new Set(transactions.map(t => t.banco))];
        usedBanks.forEach(bankId => {
            const option = document.createElement('option');
            option.value = bankId;
            option.textContent = this.getBankName(bankId);
            bancoFilter.appendChild(option);
        });
        bancoFilter.value = currentBanco;
    }

    updateStats() {
        const transactions = this.getCurrentTransactions();
        const sharedTransactions = transactions.filter(t => t.compartilhada);
        const peopleInvolved = new Set();
        
        sharedTransactions.forEach(t => {
            if (t.divisao && t.divisao.people) {
                t.divisao.people.forEach(p => {
                    if (p.selected) peopleInvolved.add(p.name);
                });
            }
        });

        const maxExpense = transactions
            .filter(t => t.tipo === 'Saída')
            .reduce((max, t) => this.parseDecimal(t.valor) > max ? this.parseDecimal(t.valor) : max, 0);

        document.getElementById('statsTransacoes').textContent = transactions.length;
        document.getElementById('statsCompartilhados').textContent = sharedTransactions.length;
        document.getElementById('statsPessoas').textContent = peopleInvolved.size;
        document.getElementById('statsMaiorGasto').textContent = this.formatCurrency(maxExpense);
    }

    updateRecentPeople() {
        const container = document.getElementById('recentPeople');
        const recentPeople = this.data.people.slice(-5).reverse();

        if (!recentPeople.length) {
            container.innerHTML = '<p class="text-muted">Nenhuma pessoa cadastrada</p>';
            return;
        }

        container.innerHTML = recentPeople.map(person => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
                <span>${person.name}</span>
                <span class="${person.totalOwed > 0 ? 'text-danger' : person.totalOwed < 0 ? 'text-success' : 'text-muted'}" style="font-size: 12px;">
                    ${this.formatCurrency(Math.abs(person.totalOwed))}
                </span>
            </div>
        `).join('');
    }

    applyFilters() {
        this.updateTransactionsTable();
    }

    // UTILITY METHODS
    getCategoryName(id) {
        const category = this.data.categories.find(c => c.id === id);
        return category ? category.name : id;
    }

    getBankName(id) {
        const bank = this.data.banks.find(b => b.id === id);
        return bank ? bank.name : id;
    }

    getPersonName(id) {
        const person = this.data.people.find(p => p.id === id);
        return person ? person.name : 'Pessoa não encontrada';
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // CUSTOM OPTIONS
    addCustomOption(type) {
        const name = prompt(`Nome da nova ${type === 'categoria' ? 'categoria' : 'conta/banco'}:`);
        if (!name || !name.trim()) return;

        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const emoji = prompt('Emoji (opcional):') || '📦';

        const newItem = {
            id: id,
            name: `${emoji} ${name.trim()}`,
            custom: true
        };

        if (type === 'categoria') {
            if (this.data.categories.find(c => c.id === id)) {
                this.showNotification('Categoria já existe!', 'error');
                return;
            }
            this.data.categories.push(newItem);
        } else {
            if (this.data.banks.find(b => b.id === id)) {
                this.showNotification('Banco já existe!', 'error');
                return;
            }
            this.data.banks.push(newItem);
        }

        this.saveData();
        this.populateSelects();
        this.populateGastoParaSelect();
        this.showNotification(`✅ ${type === 'categoria' ? 'Categoria' : 'Banco'} adicionado!`, 'success');
    }

    populateGastoParaSelect() {
        const gastoParaSelect = document.getElementById('gastoPara');
        if (!gastoParaSelect) return;

        const currentValue = gastoParaSelect.value;
        gastoParaSelect.innerHTML = '<option value="">Gasto pessoal</option>';

        this.data.people.forEach(person => {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = person.name;
            gastoParaSelect.appendChild(option);
        });

        gastoParaSelect.value = currentValue;
    }

    addPersonFromGasto() {
        const name = prompt('Nome da pessoa:');
        if (!name || !name.trim()) return;

        if (this.data.people.find(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
            this.showNotification('Pessoa já existe!', 'error');
            return;
        }

        this.data.people.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            totalOwed: 0,
            transactions: []
        });

        this.saveData();
        this.populateGastoParaSelect();
        
        // Auto-select the new person
        document.getElementById('gastoPara').value = person.id;
        
        this.showNotification('Pessoa adicionada!', 'success');
    }

    updateGastosPorPessoa() {
        const container = document.getElementById('gastosPorPessoa');
        const transactions = this.getCurrentTransactions();
        
        // Calculate spending per person this month
        const gastosPorPessoa = {};
        
        transactions.forEach(t => {
            if (t.gastoPara && t.tipo === 'Saída') {
                const person = this.data.people.find(p => p.id === t.gastoPara);
                if (person) {
                    if (!gastosPorPessoa[person.id]) {
                        gastosPorPessoa[person.id] = {
                            name: person.name,
                            total: 0,
                            count: 0
                        };
                    }
                    gastosPorPessoa[person.id].total += this.parseDecimal(t.valor);
                    gastosPorPessoa[person.id].count++;
                }
            }
        });

        const gastosArray = Object.values(gastosPorPessoa);
        
        if (!gastosArray.length) {
            container.innerHTML = '<p class="text-muted">Nenhum gasto para outras pessoas</p>';
            return;
        }

        // Sort by total spent (highest first)
        gastosArray.sort((a, b) => b.total - a.total);

        container.innerHTML = gastosArray.map(gasto => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
                <div>
                    <span style="font-weight: 600;">${gasto.name}</span>
                    <div style="font-size: 11px; color: var(--text-secondary);">${gasto.count} transaç${gasto.count > 1 ? 'ões' : 'ão'}</div>
                </div>
                <span style="font-weight: bold; color: var(--danger);">
                    ${this.formatCurrency(gasto.total)}
                </span>
            </div>
        `).join('');
    }

    // CARD MANAGEMENT
    openCardModal() {
        document.getElementById('cardModal').classList.add('active');
        this.updateCardList();
        this.updateCardSummaryInModal();
    }

    closeCardModal() {
        document.getElementById('cardModal').classList.remove('active');
        document.getElementById('cardForm').reset();
        document.getElementById('cardId').value = '';
    }

    saveCard() {
        const id = document.getElementById('cardId').value;
        const card = {
            id: id || 'card_' + Date.now(),
            name: document.getElementById('cardName').value,
            limit: this.parseDecimal(document.getElementById('cardLimit').value),
            brand: document.getElementById('cardBrand').value,
            closingDay: parseInt(document.getElementById('cardClosingDay').value),
            dueDay: parseInt(document.getElementById('cardDueDay').value),
            color: document.getElementById('cardColor').value,
        };

        if (!card.name || !card.limit || !card.closingDay || !card.dueDay) {
            this.showNotification('Preencha todos os campos obrigatórios do cartão.', 'error');
            return;
        }

        if (id) {
            const index = this.data.cards.findIndex(c => c.id === id);
            this.data.cards[index] = card;
        } else {
            this.data.cards.push(card);
        }

        this.saveData();
        this.updateCardDashboard();
        this.updateCardList();
        this.closeCardModal();
        this.showNotification('Cartão salvo com sucesso!', 'success');
    }

    editCard(id) {
        const card = this.data.cards.find(c => c.id === id);
        if (!card) return;

        document.getElementById('cardId').value = card.id;
        document.getElementById('cardName').value = card.name;
        document.getElementById('cardLimit').value = card.limit;
        document.getElementById('cardBrand').value = card.brand;
        document.getElementById('cardClosingDay').value = card.closingDay;
        document.getElementById('cardDueDay').value = card.dueDay;
        document.getElementById('cardColor').value = card.color;

        this.openCardModal();
    }

    deleteCard(id) {
        if (!confirm('Tem certeza que deseja excluir este cartão? As transações associadas não serão excluídas.')) return;

        this.data.cards = this.data.cards.filter(c => c.id !== id);
        this.saveData();
        this.updateCardDashboard();
        this.updateCardList();
        this.showNotification('Cartão excluído!', 'warning');
    }

    updateCardList() {
        const container = document.getElementById('cardList');
        if (this.data.cards.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhum cartão cadastrado.</p>';
            return;
        }

        container.innerHTML = this.data.cards.map(card => `
            <div class="goal-card" style="border-left: 5px solid ${card.color};">
                <div class="goal-info">
                    <h4>${card.name} (${card.brand})</h4>
                    <p>Limite: ${this.formatCurrency(card.limit)} | Fecha dia ${card.closingDay} | Vence dia ${card.dueDay}</p>
                </div>
                <div class="goal-actions">
                    <button class="btn btn-sm btn-secondary" onclick="app.editCard('${card.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteCard('${card.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    updateCardSummaryInModal() {
        const container = document.getElementById('cardSummaryInModal');
        if (!this.data.cards || this.data.cards.length === 0) {
            container.innerHTML = '';
            return;
        }

        const totalLimit = this.data.cards.reduce((sum, card) => sum + card.limit, 0);
        const allTransactions = Object.values(this.data.transactions).flat();
        const totalSpent = this.data.cards.reduce((sum, card) => {
            const cardTransactions = allTransactions.filter(t => t.cardId === card.id && t.tipo === 'Saída');
            return sum + cardTransactions.reduce((s, t) => s + this.parseDecimal(t.valor), 0);
        }, 0);

        const usagePercentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

        container.innerHTML = `
            <h4 class="section-title">Resumo Consolidado</h4>
            <div class="goal-card" style="background: var(--bg-secondary);">
                <div class="goal-info">
                    <p><strong>Limite Total:</strong> ${this.formatCurrency(totalLimit)}</p>
                    <p><strong>Gasto Total:</strong> ${this.formatCurrency(totalSpent)}</p>
                </div>
                <div class="goal-status">${usagePercentage.toFixed(1)}%</div>
            </div>
            <div class="goal-progress-bar" style="height: 10px; margin-top: 5px;">
                <div class="goal-progress-fill" style="width: ${usagePercentage}%;"></div>
            </div>
            <div style="text-align: center; font-weight: bold; margin-top: 5px;">${usagePercentage.toFixed(1)}% Utilizado</div>
        `;
    }

    updateCardDashboard() {
        const section = document.getElementById('cardDashboardSection');
        const container = document.getElementById('cardDashboard');
        
        section.style.display = 'block';

        if (!this.data.cards || this.data.cards.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px 0;">Nenhum cartão cadastrado. Adicione um no botão \'Gerenciar Cartões\'.</p>';
            return;
        }

        container.innerHTML = this.data.cards.map(card => {
            const cardTransactions = this.getTransactionsForCard(card.id);
            const totalSpent = cardTransactions.reduce((sum, t) => sum + this.parseDecimal(t.valor), 0);

            return `
                <div class="dashboard-card" style="border-top-color: ${card.color}; cursor: pointer;" onclick="app.openInvoiceDetailModal('${card.id}')">
                    <div class="dashboard-title">${card.name}</div>
                    <div class="dashboard-value">${this.formatCurrency(totalSpent)}</div>
                    <div class="dashboard-subtitle">Limite: ${this.formatCurrency(card.limit)}</div>
                </div>
            `;
        }).join('');
    }

    getTransactionsForCard(cardId) {
        const allTransactions = Object.values(this.data.transactions).flat();
        return allTransactions.filter(t => t.cardId === cardId && t.tipo === 'Saída');
    }

    toggleCardSelect(show) {
        const cardGroup = document.getElementById('cardSelectGroup');
        const installmentsGroup = document.getElementById('installmentsGroup');
        const select = document.getElementById('cardSelect');
        if (show) {
            this.populateCardSelect();
            cardGroup.classList.remove('hidden');
            installmentsGroup.classList.remove('hidden');
            select.required = true;
        } else {
            cardGroup.classList.add('hidden');
            installmentsGroup.classList.add('hidden');
            select.required = false;
        }
    }

    populateCardSelect() {
        const select = document.getElementById('cardSelect');
        select.innerHTML = '<option value="">Selecione o cartão...</option>';
        this.data.cards.forEach(card => {
            const option = document.createElement('option');
            option.value = card.id;
            option.textContent = card.name;
            select.appendChild(option);
        });
    }

    // INVOICE DETAILS
    openInvoiceDetailModal(cardId) {
        const card = this.data.cards.find(c => c.id === cardId);
        if (!card) return;

        const modal = document.getElementById('invoiceDetailModal');
        const title = document.getElementById('invoiceDetailTitle');
        const body = document.getElementById('invoiceDetailBody');
        const payBtn = document.getElementById('payInvoiceBtn');

        title.textContent = `Fatura - ${card.name}`;

        const transactions = this.getTransactionsForCard(card.id);
        const totalSpent = transactions.reduce((sum, t) => sum + this.parseDecimal(t.valor), 0);

        body.innerHTML = `
            <div class="dashboard" style="grid-template-columns: repeat(3, 1fr);">
                <div class="dashboard-card">
                    <div class="dashboard-title">Total da Fatura</div>
                    <div class="dashboard-value saidas">${this.formatCurrency(totalSpent)}</div>
                </div>
                <div class="dashboard-card">
                    <div class="dashboard-title">Limite Disponível</div>
                    <div class="dashboard-value">${this.formatCurrency(card.limit - totalSpent)}</div>
                </div>
                <div class="dashboard-card">
                    <div class="dashboard-title">Melhor dia de compra</div>
                    <div class="dashboard-value">Dia ${card.closingDay + 1}</div>
                </div>
            </div>
            <h4 class="section-title">Transações da Fatura</h4>
            <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr><th>Data</th><th>Descrição</th><th>Valor</th></tr>
                    </thead>
                    <tbody>
                        ${transactions.map(t => `
                            <tr>
                                <td>${new Date(t.data).toLocaleDateString('pt-BR')}</td>
                                <td>${t.descricao}</td>
                                <td class="value-negative">${this.formatCurrency(t.valor)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="3" class="text-muted text-center">Nenhuma transação na fatura.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        payBtn.onclick = () => this.payInvoice(card.id, totalSpent);
        if (totalSpent === 0) {
            payBtn.disabled = true;
        }

        modal.classList.add('active');
    }

    closeInvoiceDetailModal() {
        document.getElementById('invoiceDetailModal').classList.remove('active');
    }

    payInvoice(cardId, amount) {
        if (amount <= 0) return;

        const card = this.data.cards.find(c => c.id === cardId);
        if (!card) return;

        if (!confirm(`Deseja criar uma transação de R$ ${amount.toFixed(2)} para pagar a fatura do cartão ${card.name}?`)) return;

        const transaction = {
            id: Date.now().toString(),
            data: new Date().toISOString().split('T')[0],
            descricao: `Pagamento Fatura - ${card.name}`,
            tipo: 'Saída',
            categoria: 'pagamento_fatura',
            banco: 'default', 
            valor: amount,
            valorPago: amount,
            formaPagamento: 'Débito',
            observacao: `Pagamento referente à fatura do cartão ${card.name}`,
            compartilhada: false,
            divisao: null,
            gastoPara: null,
            createdAt: new Date().toISOString()
        };

        const key = this.getTransactionKey();
        if (!this.data.transactions[key]) {
            this.data.transactions[key] = [];
        }
        this.data.transactions[key].unshift(transaction);

        this.saveData();
        this.updateDisplay();
        this.closeInvoiceDetailModal();
        this.showNotification('Pagamento de fatura registrado com sucesso!', 'success');
    }

    // LOAN MANAGEMENT
    openLoanModal(loanId = null) {
        const modal = document.getElementById('loanModal');
        const title = document.getElementById('loanModalTitle');
        const form = document.getElementById('loanForm');
        form.reset();
        document.getElementById('loanId').value = '';

        if (loanId) {
            const loan = this.data.loans.find(l => l.id === loanId);
            if (loan) {
                title.textContent = 'Editar Empréstimo';
                document.getElementById('loanId').value = loan.id;
                document.getElementById('loanDescription').value = loan.description;
                document.getElementById('loanTotalAmount').value = loan.totalAmount;
                document.getElementById('loanAmountPaid').value = loan.amountPaid;
                document.getElementById('loanInstallmentAmount').value = loan.installmentAmount;
                document.getElementById('loanNextDueDate').value = loan.nextDueDate;
            }
        } else {
            title.textContent = 'Adicionar Empréstimo';
        }

        modal.classList.add('active');
    }

    closeLoanModal() {
        document.getElementById('loanModal').classList.remove('active');
    }

    saveLoan() {
        const id = document.getElementById('loanId').value;
        const loan = {
            id: id || 'loan_' + Date.now(),
            description: document.getElementById('loanDescription').value,
            totalAmount: this.parseDecimal(document.getElementById('loanTotalAmount').value),
            amountPaid: this.parseDecimal(document.getElementById('loanAmountPaid').value),
            installmentAmount: this.parseDecimal(document.getElementById('loanInstallmentAmount').value),
            nextDueDate: document.getElementById('loanNextDueDate').value,
            status: 'active'
        };

        if (!loan.description || !loan.totalAmount) {
            this.showNotification('Descrição e Valor Total são obrigatórios.', 'error');
            return;
        }

        if (id) {
            const index = this.data.loans.findIndex(l => l.id === id);
            this.data.loans[index] = loan;
        } else {
            this.data.loans.push(loan);
        }

        this.saveData();
        this.updateLoanList();
        this.closeLoanModal();
        this.showNotification('Empréstimo salvo com sucesso!', 'success');
    }

    updateLoanList() {
        const container = document.getElementById('loanList');
        if (!this.data.loans || this.data.loans.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px 0;">Nenhum empréstimo registrado.</p>';
            return;
        }

        container.innerHTML = this.data.loans.map(loan => {
            const percentage = (loan.amountPaid / loan.totalAmount) * 100;
            const remaining = loan.totalAmount - loan.amountPaid;

            return `
                <div class="goal-card">
                    <div class="goal-info">
                        <h4>${loan.description}</h4>
                        <p><strong>Parcela:</strong> ${this.formatCurrency(loan.installmentAmount)}</p>
                        <p><strong>Próximo Vencimento:</strong> ${loan.nextDueDate ? new Date(loan.nextDueDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                        <p><strong>Restante:</strong> ${this.formatCurrency(remaining)} de ${this.formatCurrency(loan.totalAmount)}</p>
                        <div class="goal-progress-bar" style="margin-top: 5px;">
                            <div class="goal-progress-fill" style="width: ${percentage}%;"></div>
                        </div>
                    </div>
                    <div class="goal-status">${percentage.toFixed(1)}%</div>
                    <div class="goal-actions">
                        <button class="btn btn-sm btn-success" onclick="app.payLoanInstallment('${loan.id}')">Pagar Parcela</button>
                        <button class="btn btn-sm btn-secondary" onclick="app.openLoanModal('${loan.id}')">✏️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    payLoanInstallment(loanId) {
        const loan = this.data.loans.find(l => l.id === loanId);
        if (!loan) return;

        const interestStr = prompt("Digite o valor dos juros para esta parcela (deixe em branco se não houver):");
        const interestAmount = this.parseDecimal(interestStr);

        const paymentAmount = loan.installmentAmount + interestAmount;

        if (!confirm(`Confirma o pagamento de ${this.formatCurrency(paymentAmount)} (Parcela: ${this.formatCurrency(loan.installmentAmount)} + Juros: ${this.formatCurrency(interestAmount)}) para "${loan.description}"?`)) return;

        loan.amountPaid += paymentAmount;

        // Update next due date (e.g., add one month)
        if (loan.nextDueDate) {
            const currentDate = new Date(loan.nextDueDate);
            currentDate.setMonth(currentDate.getMonth() + 1);
            loan.nextDueDate = currentDate.toISOString().split('T')[0];
        }

        const transaction = {
            id: Date.now().toString(),
            data: new Date().toISOString().split('T')[0],
            descricao: `Pagamento Parcela: ${loan.description}`,
            tipo: 'Saída',
            categoria: 'emprestimos',
            banco: 'default', 
            valor: paymentAmount,
            valorPago: paymentAmount,
            formaPagamento: 'Débito',
            observacao: `Pagamento de parcela do empréstimo ${loan.description} com juros de ${this.formatCurrency(interestAmount)}`,
            compartilhada: false,
            divisao: null,
            gastoPara: null,
            createdAt: new Date().toISOString()
        };

        const key = this.getTransactionKey();
        if (!this.data.transactions[key]) {
            this.data.transactions[key] = [];
        }
        this.data.transactions[key].unshift(transaction);

        this.saveData();
        this.updateDisplay();
        this.showNotification('Pagamento de parcela registrado!', 'success');
    }

    // ANALYSIS SECTION
    updateAnalysisSection() {
        this.updateCardSummary();
        this.updateCategoryChart();
    }

    updateCardSummary() {
        const container = document.getElementById('cardSummarySection');
        if (!this.data.cards || this.data.cards.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhum cartão para analisar.</p>';
            return;
        }

        const totalLimit = this.data.cards.reduce((sum, card) => sum + card.limit, 0);
        const allTransactions = Object.values(this.data.transactions).flat();
        const totalSpent = this.data.cards.reduce((sum, card) => {
            const cardTransactions = allTransactions.filter(t => t.cardId === card.id && t.tipo === 'Saída');
            return sum + cardTransactions.reduce((s, t) => s + this.parseDecimal(t.valor), 0);
        }, 0);

        const usagePercentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

        container.innerHTML = `
            <div class="goal-card">
                <div class="goal-info">
                    <h4>Limite Total</h4>
                    <p>${this.formatCurrency(totalLimit)}</p>
                </div>
                <div class="goal-info">
                    <h4>Gasto Total</h4>
                    <p>${this.formatCurrency(totalSpent)}</p>
                </div>
            </div>
            <div class="goal-progress-bar" style="height: 20px; margin-top: 10px;">
                <div class="goal-progress-fill" style="width: ${usagePercentage}%;"></div>
            </div>
            <div style="text-align: center; font-weight: bold; margin-top: 5px;">${usagePercentage.toFixed(1)}% Utilizado</div>
        `;
    }

    updateCategoryChart() {
        const container = document.getElementById('categoryChartSection');
        const transactions = this.getCurrentTransactions().filter(t => t.tipo === 'Saída');

        if (transactions.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhum gasto este mês para exibir.</p>';
            return;
        }

        const spendingByCategory = transactions.reduce((acc, t) => {
            const categoryName = this.getCategoryName(t.categoria);
            if (!acc[categoryName]) {
                acc[categoryName] = 0;
            }
            acc[categoryName] += this.parseDecimal(t.valor);
            return acc;
        }, {});

        const totalSpent = Object.values(spendingByCategory).reduce((sum, v) => sum + v, 0);

        const sortedCategories = Object.entries(spendingByCategory).sort(([, a], [, b]) => b - a);

        let gradient = `conic-gradient(`;
        let currentPercentage = 0;
        const legend = sortedCategories.map(([category, amount]) => {
            const percentage = (amount / totalSpent) * 100;
            const color = this.getColorForString(category);
            gradient += `${color} ${currentPercentage}% ${currentPercentage + percentage}%`;
            currentPercentage += percentage;
            if (currentPercentage < 100) gradient += ', ';
            return `<div style="display: flex; align-items: center; margin-bottom: 5px;">
                                <div style="width: 15px; height: 15px; background-color: ${color}; margin-right: 10px;"></div>
                                <div>${category}: ${this.formatCurrency(amount)} (${percentage.toFixed(1)}%)</div>
                            </div>`;
        }).join('');
        gradient += ')';

        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <div id="pieChart" style="width: 150px; height: 150px; border-radius: 50%; background: ${gradient};"></div>
                <div id="chartLegend">${legend}</div>
            </div>
        `;
    }

    getColorForString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    // SETTINGS
    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
        this.updateSettingsModal();
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    updateSettingsModal() {
        // Custom categories
        const customCategories = this.data.categories.filter(c => c.custom);
        document.getElementById('customCategories').innerHTML = customCategories.map(cat => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 5px;">
                <span>${cat.name}</span>
                <button class="btn btn-danger btn-small" onclick="app.removeCustomCategory('${cat.id}')">🗑️</button>
            </div>
        `).join('') || '<p class="text-muted">Nenhuma categoria personalizada</p>';

        // Custom banks
        const customBanks = this.data.banks.filter(b => b.custom);
        document.getElementById('customBanks').innerHTML = customBanks.map(bank => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 5px;">
                <span>${bank.name}</span>
                <button class="btn btn-danger btn-small" onclick="app.removeCustomBank('${bank.id}')">🗑️</button>
            </div>
        `).join('') || '<p class="text-muted">Nenhuma conta personalizada</p>';

        // People
        document.getElementById('peopleList').innerHTML = this.data.people.map(person => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 5px;">
                <span>${person.name} (${this.formatCurrency(person.totalOwed)} ${person.totalOwed >= 0 ? 'deve' : 'recebe'})</span>
                <button class="btn btn-danger btn-small" onclick="app.removePerson('${person.id}')">🗑️</button>
            </div>
        `).join('') || '<p class="text-muted">Nenhuma pessoa cadastrada</p>';
    }

    addCustomCategory() {
        this.addCustomOption('categoria');
        this.updateSettingsModal();
    }

    addCustomBank() {
        this.addCustomOption('banco');
        this.updateSettingsModal();
    }

    removeCustomCategory(id) {
        if (!confirm('Tem certeza que deseja remover esta categoria?')) return;
        this.data.categories = this.data.categories.filter(c => c.id !== id);
        this.saveData();
        this.populateSelects();
        this.populateGastoParaSelect();
        this.updateSettingsModal();
        this.showNotification('Categoria removida!', 'success');
    }

    removeCustomBank(id) {
        if (!confirm('Tem certeza que deseja remover esta conta/banco?')) return;
        this.data.banks = this.data.banks.filter(b => b.id !== id);
        this.saveData();
        this.populateSelects();
        this.populateGastoParaSelect();
        this.updateSettingsModal();
        this.showNotification('Conta removida!', 'success');
    }

    addPerson() {
        const name = prompt('Nome da pessoa:');
        if (!name || !name.trim()) return;

        if (this.data.people.find(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
            this.showNotification('Pessoa já existe!', 'error');
            return;
        }

        this.data.people.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            totalOwed: 0,
            transactions: []
        });

        this.saveData();
        this.populateGastoParaSelect();
        this.updateSettingsModal();
        this.showNotification('Pessoa adicionada!', 'success');
    }

    removePerson(id) {
        const person = this.data.people.find(p => p.id === id);
        if (!person) return;

        if (Math.abs(person.totalOwed) > 0.01) {
            if (!confirm(`${person.name} possui dívidas pendentes. Tem certeza que deseja remover?`)) {
                return;
            }
        }

        this.data.people = this.data.people.filter(p => p.id !== id);
        this.saveData();
        this.populateGastoParaSelect();
        this.updateSettingsModal();
        this.updateDisplay();
        this.showNotification('Pessoa removida!', 'success');
    }

    clearAllData() {
        if (!confirm('ATENÇÃO: Esta ação irá apagar TODOS os dados salvos. Tem certeza?')) return;
        if (!confirm('Última confirmação: TODOS os dados serão perdidos permanentemente!')) return;

        localStorage.removeItem('advanced_financial_data');
        
        // Clear data from Firestore if a user ID is set
        if (this.userId) {
            this.showLoading(true);
            this.db.collection('Financeiro').doc(this.userId).delete()
                .then(() => {
                    this.showNotification(`Dados do ID ${this.userId} removidos do Firestore.`, 'success');
                    this.userId = null; // Clear current user ID
                    localStorage.removeItem('financa_user_id');
                    this.data = {};
                    this.initializeDefaults();
                    this.updateDisplay();
                    this.closeSettings();
                    this.showLoading(false);
                })
                .catch(error => {
                    console.error('Erro ao remover dados do Firestore:', error);
                    this.showNotification(`Erro ao remover dados do Firestore: ${error.message}`, 'error');
                    this.showLoading(false);
                });
        } else {
            this.data = {};
            this.userId = null; // Ensure userId is cleared even if no Firestore operation
            localStorage.removeItem('financa_user_id');
            this.initializeDefaults();
            this.updateDisplay();
            this.closeSettings();
            this.showNotification('Todos os dados foram limpos localmente!', 'warning');
        }
    }

    // New method to show current user ID
    showCurrentUserId() {
        if (this.userId) {
            alert('Seu ID atual é: ' + this.userId);
        } else {
            alert('Nenhum ID de usuário ativo. Gere um novo ID ou carregue um existente.');
        }
    }

    // THEME MANAGEMENT
    initializeTheme() {
        const savedTheme = localStorage.getItem('financa_theme') || 'light';
        this.applyTheme(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        localStorage.setItem('financa_theme', newTheme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeButton = document.getElementById('themeToggle');
        if (themeButton) {
            // Mostrar o tema ATUAL, não o próximo
            themeButton.innerHTML = theme === 'light' ? '☀️ Claro' : '🌙 Escuro';
        }
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AdvancedFinancialApp();
});