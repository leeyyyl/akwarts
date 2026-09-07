import { useState } from 'react';
import { Home, PlusCircle, MinusCircle, FileEdit, Trash2 } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('main');
  
  // Categories have the expected budget
  const [categories, setCategories] = useState([
    { id: 'c1', name: 'Monthly Income', type: 'add', expected: 5000 },
    { id: 'c2', name: 'Bills', type: 'minus', expected: 1500 },
    { id: 'c3', name: 'Other Expenses', type: 'minus', expected: 500 }
  ]);
  
  // Transactions are just individual logs
  const [transactions, setTransactions] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const handleAddTransaction = (e, type) => {
    e.preventDefault(); 
    const amount = parseFloat(itemAmount);
    
    if (itemName.trim() !== '' && !isNaN(amount) && amount > 0 && selectedCategory) {
      const newTransaction = {
        id: Date.now(),
        categoryId: selectedCategory,
        name: itemName.trim(),
        amount: amount,
        type: type 
      };
      setTransactions([...transactions, newTransaction]);
      setItemName('');
      setItemAmount('');
    }
  };

  const handleDeleteTransaction = (idToDelete) => {
    setTransactions(transactions.filter(t => t.id !== idToDelete));
  };

  const updateCategoryBudget = (catId, newBudget) => {
    setCategories(categories.map(c => c.id === catId ? { ...c, expected: parseFloat(newBudget) || 0 } : c));
  };
  
  const handleAddCategory = (name, type) => {
    if(name.trim()) setCategories([...categories, { id: Date.now().toString(), name, type, expected: 0 }]);
  };
  
  const totalIncome = transactions.filter(t => t.type === 'add').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'minus').reduce((sum, t) => sum + t.amount, 0);
  const leftToSpend = totalIncome - totalExpenses;

  // Reusable function to generate tables for Main and Update tabs
  const getCategoryTables = (type, isUpdateMode = false) => {
    return categories.filter(c => c.type === type).map(cat => {
      const catTxns = transactions.filter(t => t.categoryId === cat.id);
      const actualTotal = catTxns.reduce((sum, t) => sum + t.amount, 0);
      
      // Combine identical transaction names within the category
      const combinedTxns = Object.values(catTxns.reduce((acc, t) => {
        if (!acc[t.name]) acc[t.name] = { ...t, amount: 0, ids: [] };
        acc[t.name].amount += t.amount;
        acc[t.name].ids.push(t.id);
        return acc;
      }, {}));

      return (
        <div key={cat.id} className="table-container" style={{marginBottom: '20px'}}>
          <div className="table-title">{cat.name.toUpperCase()}</div>
          <table className="budget-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th className="number-col">ACTUAL</th>
                {isUpdateMode && <th>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {combinedTxns.map(item => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td className="number-col">${item.amount.toFixed(2)}</td>
                  {isUpdateMode && (
                    <td style={{textAlign: 'center'}}>
                      <button onClick={() => item.ids.forEach(id => handleDeleteTransaction(id))} className="delete-button" style={{padding: '4px'}}><Trash2 size={16} /></button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="total-row">
                <td>TOTAL (Budget: ${cat.expected.toFixed(2)})</td>
                <td className="number-col">${actualTotal.toFixed(2)}</td>
                {isUpdateMode && <td></td>}
              </tr>
            </tbody>
          </table>
          {isUpdateMode && (
            <div style={{padding: '10px', display: 'flex', gap: '10px', background: '#f8f8f8'}}>
              <input type="number" placeholder="Edit Budget" className="input-field" style={{marginBottom: 0, padding: '8px'}} onBlur={(e) => updateCategoryBudget(cat.id, e.target.value)} defaultValue={cat.expected} />
            </div>
          )}
        </div>
      );
    });
  };

  const renderContent = () => {
    if (activeTab === 'main') {
      return (
        <div className="budget-dashboard">
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
          {getCategoryTables('add')}
          {getCategoryTables('minus')}
        </div>
      );
    }
    
    if (activeTab === 'add' || activeTab === 'minus') {
      const isAdd = activeTab === 'add';
      const typeCats = categories.filter(c => c.type === activeTab);
      const historyLogs = transactions.filter(t => t.type === activeTab).reverse();
      
      return (
        <div className="budget-dashboard">
          <div className="form-card">
            <h2 style={{ color: isAdd ? 'var(--vivid-cyan)' : 'var(--vivid-crimson)' }}>
              {isAdd ? 'Add Income' : 'Add Expense'}
            </h2>
            <form onSubmit={(e) => handleAddTransaction(e, activeTab)}>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="input-field">
                <option value="" disabled>Select a Category...</option>
                {typeCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" placeholder="Transaction Name (e.g., Salary, Coffee)" value={itemName} onChange={(e) => setItemName(e.target.value)} className="input-field" />
              <input type="number" placeholder="Amount ($)" value={itemAmount} onChange={(e) => setItemAmount(e.target.value)} className="input-field" />
              <button type="submit" className="submit-button" style={{ backgroundColor: isAdd ? 'var(--vivid-cyan)' : 'var(--vivid-crimson)' }}>
                Record {isAdd ? 'Income' : 'Expense'}
              </button>
            </form>
          </div>
          
          <div className="summary-card">
            <h3>History Logs</h3>
            <div className="transaction-list" style={{marginTop: '15px'}}>
              {historyLogs.map(t => (
                <div key={t.id} className={`transaction-item ${t.type}`}>
                  <div className="transaction-info">
                    <span className="transaction-name">{t.name}</span>
                    <span className="transaction-amount">${t.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    if (activeTab === 'update') {
      return (
        <div className="budget-dashboard">
          <div className="form-card" style={{marginBottom: '20px'}}>
            <h2>Add New Category</h2>
            <div style={{display: 'flex', gap: '10px'}}>
              <input type="text" id="newCatName" placeholder="Category Name" className="input-field" style={{marginBottom: 0}} />
              <select id="newCatType" className="input-field" style={{marginBottom: 0}}>
                <option value="minus">Expense</option>
                <option value="add">Income</option>
              </select>
              <button onClick={() => {
                handleAddCategory(document.getElementById('newCatName').value, document.getElementById('newCatType').value);
                document.getElementById('newCatName').value = '';
              }} className="submit-button" style={{width: 'auto'}}>Add</button>
            </div>
          </div>
          {getCategoryTables('add', true)}
          {getCategoryTables('minus', true)}
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