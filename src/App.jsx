import { useState } from 'react';
import { Home, PlusCircle, MinusCircle, FileEdit, Trash2 } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('main');
  
  const [transactions, setTransactions] = useState([
    { id: 1, name: "Salary", amount: 5000, type: 'add' },
    { id: 2, name: "Groceries", amount: 150, type: 'minus' },
    { id: 3, name: "Electric Bill", amount: 90, type: 'minus' }
  ]);

  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');

  const handleAddTransaction = (e, type) => {
    e.preventDefault(); 
    const amount = parseFloat(itemAmount);
    
    if (itemName.trim() !== '' && !isNaN(amount) && amount > 0) {
      const newTransaction = {
        id: Date.now(), 
        name: itemName,
        amount: amount,
        type: type 
      };

      setTransactions([...transactions, newTransaction]);
      setItemName('');
      setItemAmount('');
      setActiveTab('main'); 
    }
  };

  // NEW: Function to delete a transaction
  const handleDeleteTransaction = (idToDelete) => {
    // This filters the list, keeping only the items that DO NOT match the ID
    const updatedTransactions = transactions.filter(t => t.id !== idToDelete);
    setTransactions(updatedTransactions);
  };

  const totalIncome = transactions
    .filter(t => t.type === 'add')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'minus')
    .reduce((sum, t) => sum + t.amount, 0);

  const leftToSpend = totalIncome - totalExpenses;

  const renderContent = () => {
    if (activeTab === 'main') {
      return (
        <div className="summary-card">
          <div className="balance">
            <h2>Left to Spend</h2>
            <p className="amount-large">${leftToSpend.toFixed(2)}</p>
          </div>
          <div className="metrics">
            <div className="metric">
              <h3>Total Income</h3>
              <p className="amount positive">${totalIncome.toFixed(2)}</p>
            </div>
            <div className="metric">
              <h3>Total Expenses</h3>
              <p className="amount negative">${totalExpenses.toFixed(2)}</p>
            </div>
          </div>
        </div>
      );
    }
    
    if (activeTab === 'add') {
      return (
        <div className="form-card">
          <h2 style={{ color: 'var(--vivid-cyan)' }}>Add Income</h2>
          <form onSubmit={(e) => handleAddTransaction(e, 'add')}>
            <input 
              type="text" 
              placeholder="E.g., Salary, Freelance" 
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="input-field"
            />
            <input 
              type="number" 
              placeholder="Amount ($)" 
              value={itemAmount}
              onChange={(e) => setItemAmount(e.target.value)}
              className="input-field"
            />
            <button type="submit" className="submit-button" style={{ backgroundColor: 'var(--vivid-cyan)' }}>
              Add Income
            </button>
          </form>
        </div>
      );
    }
    
    if (activeTab === 'minus') {
      return (
        <div className="form-card">
          <h2 style={{ color: 'var(--vivid-crimson)' }}>Add Expense</h2>
          <form onSubmit={(e) => handleAddTransaction(e, 'minus')}>
            <input 
              type="text" 
              placeholder="E.g., Groceries, Coffee" 
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="input-field"
            />
            <input 
              type="number" 
              placeholder="Amount ($)" 
              value={itemAmount}
              onChange={(e) => setItemAmount(e.target.value)}
              className="input-field"
            />
            <button type="submit" className="submit-button">
              Add Expense
            </button>
          </form>
        </div>
      );
    }
    
    // NEW: The Update / Manage tab content
    if (activeTab === 'update') {
      return (
        <div className="summary-card">
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Manage Transactions</h2>
          
          {transactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No transactions yet.</p>
          ) : (
            <div className="transaction-list">
              {/* This maps through your list and creates a visual block for each item */}
              {transactions.map((t) => (
                <div key={t.id} className={`transaction-item ${t.type}`}>
                  <div className="transaction-info">
                    <span className="transaction-name">{t.name}</span>
                    <span className={`transaction-amount ${t.type === 'add' ? 'positive' : 'negative'}`}>
                      {t.type === 'add' ? '+' : '-'}${t.amount.toFixed(2)}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeleteTransaction(t.id)} 
                    className="delete-button"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <img src="/wordLogo.png" alt="Akwarts Logo" className="header-logo" />
      </header>
      <main className="dashboard">
        {renderContent()}
      </main>
      <nav className="tab-bar">
        <button className={activeTab === 'main' ? 'active' : ''} onClick={() => setActiveTab('main')}>
          <Home size={28} />
        </button>
        <button className={activeTab === 'add' ? 'active' : ''} onClick={() => setActiveTab('add')}>
          <PlusCircle size={28} />
        </button>
        <button className={activeTab === 'minus' ? 'active' : ''} onClick={() => setActiveTab('minus')}>
          <MinusCircle size={28} />
        </button>
        <button className={activeTab === 'update' ? 'active' : ''} onClick={() => setActiveTab('update')}>
          <FileEdit size={28} />
        </button>
      </nav>
    </div>
  );
}

export default App;