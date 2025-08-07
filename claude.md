# 💰 PRD - Sistema Financeiro Avançado

## 📋 **Visão Geral do Produto**

Sistema financeiro completo para controle pessoal com gestão de dívidas compartilhadas, categorias customizáveis e organização temporal avançada.

---

## 🎯 **Objetivos**

- **Controle financeiro completo** com transações categorizadas
- **Gestão de gastos compartilhados** com múltiplas pessoas
- **Rastreamento de dívidas** individuais e em grupo
- **Organização temporal** por mês/ano com navegação fluida
- **Customização total** de categorias, bancos e tipos
- **Interface intuitiva** para uso diário

---

## 👥 **Personas & Casos de Uso**

### **Persona Principal: João (25-35 anos)**
- Profissional que divide gastos com colegas/família
- Precisa controlar finanças pessoais e compartilhadas
- Quer saber quem deve o quê e quanto

### **Casos de Uso:**
1. **Divisão de conta no restaurante** com 3 amigos
2. **Pagamento de aluguel dividido** com roommate
3. **Compra de presente** dividida entre família
4. **Viagem em grupo** com múltiplas despesas compartilhadas
5. **Controle mensal/anual** de todas as finanças

---

## 🔧 **Requisitos Funcionais**

### **RF01 - Gestão Temporal**
- **RF01.1**: Navegação por abas mensais (Jan, Fev, Mar...)
- **RF01.2**: Seletor de anos (2024, 2025, 2026...)
- **RF01.3**: Visualização consolidada anual
- **RF01.4**: Comparação mês-a-mês e ano-a-ano

### **RF02 - Transações Básicas**
- **RF02.1**: Adicionar transação (data, valor, tipo, categoria)
- **RF02.2**: Editar/excluir transações existentes
- **RF02.3**: Filtros por tipo, categoria, banco, período
- **RF02.4**: Busca por descrição/valor

### **RF03 - Gestão de Gastos Compartilhados**
- **RF03.1**: Marcar transação como "compartilhada"
- **RF03.2**: Definir pessoas envolvidas na divisão
- **RF03.3**: Especificar valor pago pelo usuário
- **RF03.4**: Calcular automaticamente valores devidos por pessoa
- **RF03.5**: Definir tipo de divisão (igual, percentual, valor fixo)

### **RF04 - Controle de Dívidas**
- **RF04.1**: Dashboard individual por pessoa
- **RF04.2**: Histórico de dívidas por pessoa
- **RF04.3**: Status: "Deve para mim" / "Devo para ele"
- **RF04.4**: Marcar dívida como "paga"
- **RF04.5**: Notificações de dívidas em aberto

### **RF05 - Customização**
- **RF05.1**: Adicionar/remover categorias personalizadas
- **RF05.2**: Adicionar/remover bancos personalizados
- **RF05.3**: Adicionar/remover tipos de transação
- **RF05.4**: Personalizar cores e ícones

### **RF06 - Relatórios & Analytics**
- **RF06.1**: Dashboard com resumo financeiro
- **RF06.2**: Gráficos por categoria/tempo
- **RF06.3**: Relatório de dívidas consolidado
- **RF06.4**: Exportação para TXT/Excel/PDF

### **RF07 - Persistência & Backup**
- **RF07.1**: Salvar dados localmente (localStorage)
- **RF07.2**: Exportar backup completo (JSON)
- **RF07.3**: Importar dados de backup
- **RF07.4**: Limpar dados com confirmação

---

## 🎨 **Requisitos de Interface**

### **UI01 - Layout Principal**
- **Cabeçalho**: Logo, seletor de ano, ferramentas
- **Abas mensais**: Navegação horizontal por mês
- **Dashboard**: Cards com resumos financeiros
- **Formulário**: Adicionar nova transação
- **Tabela**: Lista de transações com filtros
- **Sidebar**: Painel de dívidas ativo

### **UI02 - Gestão de Compartilhamento**
- **Modal**: Configurar divisão de gastos
- **Seletor de pessoas**: Adicionar/remover envolvidos
- **Calculadora**: Distribuição automática de valores
- **Preview**: Mostrar quanto cada um deve

### **UI03 - Dashboard de Dívidas**
- **Cards por pessoa**: Resumo individual
- **Status visual**: Cores para deve/recebe
- **Histórico expandível**: Lista de transações por pessoa
- **Ações rápidas**: Marcar como pago, lembrar

---

## 📊 **Estrutura de Dados**

### **Transação**
```json
{
  "id": "uuid",
  "data": "2025-01-15",
  "descricao": "Jantar pizzaria",
  "valor": 120.00,
  "valor_pago": 120.00,
  "tipo": "Saída",
  "categoria": "Alimentação",
  "banco": "Nubank",
  "forma_pagamento": "PIX",
  "observacao": "",
  "compartilhada": true,
  "divisao": {
    "tipo": "igual", // igual, percentual, fixo
    "pessoas": [
      {
        "nome": "João",
        "valor_devido": 30.00,
        "percentual": 25,
        "pago": false
      },
      {
        "nome": "Maria", 
        "valor_devido": 30.00,
        "percentual": 25,
        "pago": true
      }
    ]
  }
}
```

### **Pessoa**
```json
{
  "id": "uuid",
  "nome": "João Silva",
  "email": "joao@email.com",
  "telefone": "(11) 99999-9999",
  "saldo_total": -150.00, // negativo = deve para mim
  "transacoes": ["trans_id1", "trans_id2"]
}
```

### **Configurações**
```json
{
  "categorias_custom": ["Pets", "Hobbies"],
  "bancos_custom": ["Neon", "C6 Bank"],
  "tipos_custom": ["Empréstimo", "Reembolso"],
  "theme": "dark",
  "moeda": "BRL"
}
```

---

## 🎯 **Funcionalidades Prioritárias (MVP)**

### **🚀 Fase 1 - Core**
1. ✅ Sistema de abas mensais/anos
2. ✅ Transações básicas (CRUD)
3. ✅ Categorias e bancos customizáveis
4. ✅ Dashboard financeiro básico
5. ✅ Exportação TXT/JSON

### **🔥 Fase 2 - Compartilhamento**
1. 🆕 Modal de divisão de gastos
2. 🆕 Gestão de pessoas (adicionar/editar)
3. 🆕 Cálculo automático de dívidas
4. 🆕 Dashboard individual por pessoa
5. 🆕 Histórico de dívidas

### **⭐ Fase 3 - Avançado**
1. 🔮 Gráficos interativos
2. 🔮 Notificações de dívidas
3. 🔮 Relatórios avançados
4. 🔮 Sincronização em nuvem
5. 🔮 App mobile

---

## 📱 **Fluxos de Usuário**

### **Fluxo 1: Gasto Compartilhado**
1. Usuário clica "Nova Transação"
2. Preenche dados básicos (valor, categoria, etc.)
3. Marca checkbox "Compartilhar gasto"
4. Modal abre para configurar divisão
5. Seleciona pessoas envolvidas
6. Define tipo de divisão (igual/percentual/fixo)
7. Sistema calcula automaticamente quanto cada um deve
8. Usuário confirma e salva
9. Transação aparece na tabela
10. Dívidas são atualizadas no painel lateral

### **Fluxo 2: Navegação Temporal**
1. Usuário vê abas dos meses na tela
2. Clica em "Março" → Dados de março carregam
3. Clica no seletor de ano "2024"
4. Dados mudam para 2024, mantendo mês atual
5. Dashboard atualiza com estatísticas do período

### **Fluxo 3: Gestão de Dívidas**
1. Painel lateral mostra "João deve R$ 150"
2. Usuário clica no card do João
3. Modal abre com histórico de dívidas
4. Lista todas as transações pendentes
5. Usuário marca uma dívida como "Paga"
6. Saldo do João é atualizado automaticamente

---

## 🎨 **Design System**

### **Cores**
- **Primary**: #7c3aed (Roxo)
- **Success**: #10b981 (Verde) - Entradas
- **Danger**: #ef4444 (Vermelho) - Saídas
- **Warning**: #f59e0b (Amarelo) - Pendências
- **Info**: #3b82f6 (Azul) - Informações

### **Tipografia**
- **Heading**: System fonts (-apple-system, Roboto)
- **Body**: 14px regular
- **Small**: 12px para detalhes

### **Componentes**
- **Cards**: Border-radius 12px, shadow sutil
- **Buttons**: Height 44px, border-radius 8px
- **Forms**: Padding 12px, border 1px
- **Modals**: Backdrop blur, animação suave

---

## 📊 **Métricas de Sucesso**

1. **Usabilidade**: Usuário consegue adicionar transação compartilhada em < 30s
2. **Performance**: Carregar 1000+ transações em < 2s
3. **Precisão**: 0 erros de cálculo nas divisões
4. **Adoção**: 90% das transações usam categorias personalizadas

---

## 🚀 **Próximos Passos**

1. **Aprovação do PRD** ✅
2. **Design detalhado** (wireframes/mockups)
3. **Desenvolvimento MVP** (Fases 1 e 2)
4. **Testes com usuários**
5. **Iterações baseadas em feedback**
6. **Release Fase 3**

---

## ❓ **Perguntas Abertas**

1. Limite máximo de pessoas por divisão?
2. Integração com bancos/APIs?
3. Notificações push/email?
4. Modo offline obrigatório?
5. Suporte a múltiplas moedas?

---

**Aprovado por**: [Seu nome]  
**Data**: Janeiro 2025  
**Versão**: 1.0