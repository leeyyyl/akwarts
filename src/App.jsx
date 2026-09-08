import { useState, useEffect } from 'react';
import { Home, PlusCircle, MinusCircle, FileEdit, Trash2, Edit2, Check, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import './App.css';
import UpdatePrompt from './UpdatePrompt';

function App() {
  // Date Navigation State
  const [viewDate, setViewDate] = useState(new Date());
  const viewedMonthStr = viewDate.toLocaleString('default', { month: 'short', year: '2-digit' });
  
  // Boundary Checks
  const actualDate = new Date();
  const isCurrentMonth = viewDate.getMonth() === actualDate.getMonth() && viewDate.getFullYear() === actualDate.getFullYear();
  const canGoNext = !isCurrentMonth; // Disables Next if it's the current month (no future)
  
  const prevDate = new Date(viewDate);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonthStr = prevDate.toLocaleString('default', { month: 'short', year: '2-digit' });
  // Disables Prev if there's no data saved for the previous month
  const canGoPrev = localStorage.getItem(`akwartsTxns_${prevMonthStr}`) !== null || localStorage.getItem(`akwartsCats_${prevMonthStr}`) !== null;

  const handlePrevMonth = () => { if (canGoPrev) setViewDate(prevDate); };
  const handleNextMonth = () => {
    if (canGoNext) {
      const nextDate = new Date(viewDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      setViewDate(nextDate);
    }
  };

  const [deleteCatConfirm, setDeleteCatConfirm] = useState({ isOpen: false, catId: null, catName: '' });

  const handleConfirmDeleteCategory = () => {
    // Removes the category
    setCategories(categories.filter(c => c.id !== deleteCatConfirm.catId));
    // Removes all transactions tied to that category to prevent ghost data
    setTransactions(transactions.filter(t => t.categoryId !== deleteCatConfirm.catId));
    setDeleteCatConfirm({ isOpen: false, catId: null, catName: '' });
  };

  // Swipe Gesture State
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEndX(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && canGoNext) handleNextMonth(); // Swipe left -> Next Month
    if (isRightSwipe && canGoPrev) handlePrevMonth(); // Swipe right -> Prev Month
  };

  const [activeTab, setActiveTab] = useState('main');
  
  // Start with empty arrays; the useEffect below will load the correct month's data
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // 1. Load data whenever the viewed month changes
  useEffect(() => {
    const savedCats = localStorage.getItem(`akwartsCats_${viewedMonthStr}`);
    const savedTxns = localStorage.getItem(`akwartsTxns_${viewedMonthStr}`);
    
    if (savedCats) setCategories(JSON.parse(savedCats));
    else setCategories([
      { id: 'c1', name: 'Monthly Income', type: 'add', expected: 5000 },
      { id: 'c2', name: 'Bills', type: 'minus', expected: 1500 },
      { id: 'c3', name: 'Other Expenses', type: 'minus', expected: 500 },
      { id: 'c4', name: 'Debt', type: 'minus', expected: 300 }
    ]);

    if (savedTxns) setTransactions(JSON.parse(savedTxns));
    else setTransactions([
      { id: 1, categoryId: 'c2', name: 'Electricity', amount: 0, type: 'minus' },
      { id: 2, categoryId: 'c2', name: 'Water', amount: 0, type: 'minus' },
      { id: 3, categoryId: 'c2', name: 'Internet', amount: 0, type: 'minus' }
    ]);
  }, [viewedMonthStr]);

  // 2. Save data automatically to the SPECIFIC month's storage key
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem(`akwartsCats_${viewedMonthStr}`, JSON.stringify(categories));
      localStorage.setItem(`akwartsTxns_${viewedMonthStr}`, JSON.stringify(transactions));
    }
  }, [transactions, categories, viewedMonthStr]);

  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formErrors, setFormErrors] = useState({ category: '', name: '', amount: '' });

  // NEW STATES for UI management
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingBudgets, setEditingBudgets] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, catId: null, newBudget: '' });

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, itemIds: [], itemName: '' });

  const handleConfirmDelete = () => {
    deleteConfirm.itemIds.forEach(id => handleDeleteTransaction(id));
    setDeleteConfirm({ isOpen: false, itemIds: [], itemName: '' });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setItemName('');
    setItemAmount('');
    setSelectedCategory('');
    setFormErrors({ category: '', name: '', amount: '' });
    setEditingBudgets({});
    setShowAddCategory(false);
  };

  const handleAddTransaction = (e, type) => {
    e.preventDefault(); 
    const amount = parseFloat(itemAmount);
    let errors = { category: '', name: '', amount: '' };
    let hasError = false;
    
    // Check each field and set its specific error
    if (!selectedCategory) {
      errors.category = 'Select a category!';
      hasError = true;
    }
    if (itemName.trim() === '') {
      errors.name = 'Enter transaction name!';
      hasError = true;
    }
    if (isNaN(amount) || amount <= 0) {
      errors.amount = 'Enter valid amount!';
      hasError = true;
    }

    if (hasError) {
      setFormErrors(errors);
      return;
    }

    // If everything passes, clear errors and save
    setFormErrors({ category: '', name: '', amount: '' });
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
    setSelectedCategory('');
  };

  const handleDeleteTransaction = (idToDelete) => {
    setTransactions(transactions.filter(t => t.id !== idToDelete));
  };

  const handleEditClick = (cat) => {
    setEditingBudgets({ ...editingBudgets, [cat.id]: { value: cat.expected } });
  };

  const handleCancelEdit = (catId) => {
    const newEdits = { ...editingBudgets };
    delete newEdits[catId];
    setEditingBudgets(newEdits);
  };

  const handleSaveClick = (catId) => {
    setConfirmDialog({ isOpen: true, catId, newBudget: editingBudgets[catId].value });
  };

  const handleConfirmSave = () => {
    updateCategoryBudget(confirmDialog.catId, confirmDialog.newBudget);
    handleCancelEdit(confirmDialog.catId);
    setConfirmDialog({ isOpen: false, catId: null, newBudget: '' });
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
    const isIncome = type === 'add';
    const themeColor = isIncome ? 'var(--vivid-cyan)' : 'var(--vivid-crimson)';
    const textColor = isIncome ? '#028e96' : 'var(--vivid-crimson)'; // Darker cyan for text readability

    return categories.filter(c => c.type === type).map(cat => {
      const catTxns = transactions.filter(t => t.categoryId === cat.id);
      const actualTotal = catTxns.reduce((sum, t) => sum + t.amount, 0);
      
      const combinedTxns = Object.values(catTxns.reduce((acc, t) => {
        if (!acc[t.name]) acc[t.name] = { ...t, amount: 0, ids: [] };
        acc[t.name].amount += t.amount;
        acc[t.name].ids.push(t.id);
        return acc;
      }, {}));

      return (
        <div key={cat.id} className="table-container" style={{marginBottom: '20px'}}>
          <div className="table-title" style={{ borderBottom: `2px solid ${themeColor}`, display: 'flex', alignItems: 'center', position: 'relative' }}>
            <span style={{ width: '100%', textAlign: 'center' }}>{cat.name.toUpperCase()}</span>
            
            {isUpdateMode && (
              <button 
                onClick={() => setDeleteCatConfirm({ isOpen: true, catId: cat.id, catName: cat.name })}
                className="delete-button" 
                style={{ position: 'absolute', right: '10px', padding: '4px', color: 'var(--vivid-crimson)' }}
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
          <table className="budget-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th className="number-col">ACTUAL</th>
                {isUpdateMode && <th style={{ width: '50px', textAlign: 'center' }}>ACT</th>}
              </tr>
            </thead>
            <tbody>
              {combinedTxns.map(item => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td className="number-col" style={{ color: textColor, fontWeight: '500' }}>
                    ₱{item.amount.toFixed(2)}
                  </td>
                  {isUpdateMode && (
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <button 
                        onClick={() => setDeleteConfirm({ isOpen: true, itemIds: item.ids, itemName: item.name })} 
                        className="delete-button" 
                        style={{ padding: '6px', margin: '0 auto', display: 'flex' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className={`total-row ${isIncome ? 'income-total' : 'expense-total'}`}>
                <td>BUDGET: ₱{cat.expected.toFixed(2)}</td>
                <td className="number-col">₱{actualTotal.toFixed(2)}</td>
                {isUpdateMode && <td></td>}
              </tr>
            </tbody>
          </table>
          
          {isUpdateMode && (
            <div style={{padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f8f8', borderTop: '1px solid #eaeaea'}}>
              <label style={{fontWeight: '600', color: 'var(--dark-magenta)'}}>Target Budget: </label>
              
              {!editingBudgets[cat.id] ? (
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <span style={{fontSize: '1.1rem', fontWeight: 'bold'}}>₱{cat.expected.toFixed(2)}</span>
                  <button onClick={() => handleEditClick(cat)} className="delete-button" style={{color: 'var(--dark-magenta)'}}>
                    <Edit2 size={20} />
                  </button>
                </div>
              ) : (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input 
                    type="number" 
                    className="input-field" 
                    style={{marginBottom: 0, padding: '8px', width: '100px'}} 
                    value={editingBudgets[cat.id].value} 
                    onChange={(e) => setEditingBudgets({...editingBudgets, [cat.id]: { value: e.target.value }})} 
                  />
                  <button onClick={() => handleSaveClick(cat.id)} className="delete-button" style={{color: 'var(--vivid-cyan)'}}><Check size={24} /></button>
                  <button onClick={() => handleCancelEdit(cat.id)} className="delete-button" style={{color: 'var(--vivid-crimson)'}}><X size={24} /></button>
                </div>
              )}
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
              <p className="amount-large">₱{leftToSpend.toFixed(2)}</p>
            </div>
            <div className="metrics">
              <div className="metric">
                <h3>Total Income</h3>
                <p className="amount positive">₱{totalIncome.toFixed(2)}</p>
              </div>
              <div className="metric">
                <h3>Total Expenses</h3>
                <p className="amount negative">₱{totalExpenses.toFixed(2)}</p>
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
              <select 
                value={selectedCategory} 
                onChange={(e) => { setSelectedCategory(e.target.value); setFormErrors({...formErrors, category: ''}); }} 
                className="input-field"
                style={formErrors.category ? { borderColor: 'var(--vivid-crimson)', color: 'var(--vivid-crimson)' } : {}}
              >
                <option value="" disabled>{formErrors.category || "Select a Category..."}</option>
                {typeCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <input 
                type="text" 
                placeholder={formErrors.name || (isAdd ? "E.g., Salary, Freelance" : "E.g., Groceries, Rent")} 
                value={itemName}
                onChange={(e) => { setItemName(e.target.value); setFormErrors({...formErrors, name: ''}); }}
                className="input-field"
                style={formErrors.name ? { borderColor: 'var(--vivid-crimson)' } : {}}
              />

              <input 
                type="number" 
                placeholder={formErrors.amount || "Amount (₱)"} 
                value={itemAmount}
                onChange={(e) => { setItemAmount(e.target.value); setFormErrors({...formErrors, amount: ''}); }}
                className="input-field"
                style={formErrors.amount ? { borderColor: 'var(--vivid-crimson)' } : {}}
              />
              
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
                    <span style={{ fontSize: '0.8rem', color: '#999' }}>
                      {new Date(t.id).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="transaction-amount">₱{t.amount.toFixed(2)}</span>
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
            {!showAddCategory ? (
              <button onClick={() => setShowAddCategory(true)} className="submit-button" style={{backgroundColor: 'var(--dark-magenta)'}}>
                + Add New Category
              </button>
            ) : (
              <>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <h2 style={{marginBottom: 0}}>Add New Category</h2>
                  <button onClick={() => setShowAddCategory(false)} className="delete-button"><X size={24} /></button>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input type="text" id="newCatName" placeholder="Category Name" className="input-field" style={{marginBottom: 0}} />
                  <select id="newCatType" className="input-field" style={{marginBottom: 0}}>
                    <option value="minus">Expense</option>
                    <option value="add">Income</option>
                  </select>
                  <button onClick={() => {
                    handleAddCategory(document.getElementById('newCatName').value, document.getElementById('newCatType').value);
                    document.getElementById('newCatName').value = '';
                    setShowAddCategory(false);
                  }} className="submit-button" style={{width: 'auto'}}>Add</button>
                </div>
              </>
            )}
          </div>

          {getCategoryTables('add', true)}
          {getCategoryTables('minus', true)}

          {/* Custom Confirmation Modal */}
          {confirmDialog.isOpen && (
            <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100}}>
              <div style={{backgroundColor: 'var(--white)', padding: '25px', borderRadius: '15px', width: '85%', maxWidth: '320px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'}}>
                <h3 style={{color: 'var(--dark-magenta)', marginBottom: '10px'}}>Are you sure?</h3>
                <p style={{marginBottom: '20px', color: '#555'}}>Update this budget to <strong>₱{parseFloat(confirmDialog.newBudget || 0).toFixed(2)}</strong>?</p>
                <div style={{display: 'flex', gap: '15px'}}>
                  <button onClick={handleConfirmSave} className="submit-button" style={{backgroundColor: 'var(--vivid-cyan)', flex: 1}}>Yes</button>
                  <button onClick={() => setConfirmDialog({ isOpen: false, catId: null, newBudget: '' })} className="submit-button" style={{backgroundColor: 'var(--vivid-crimson)', flex: 1}}>No</button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Category Confirmation Modal */}
          {deleteCatConfirm.isOpen && (
            <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100}}>
              <div style={{backgroundColor: 'var(--white)', padding: '25px', borderRadius: '15px', width: '85%', maxWidth: '320px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'}}>
                <h3 style={{color: 'var(--vivid-crimson)', marginBottom: '10px'}}>Delete Category?</h3>
                <p style={{marginBottom: '20px', color: '#555'}}>Are you sure you want to delete <strong>{deleteCatConfirm.catName}</strong>? This will also remove all its transactions for this month.</p>
                <div style={{display: 'flex', gap: '15px'}}>
                  <button onClick={handleConfirmDeleteCategory} className="submit-button" style={{backgroundColor: 'var(--vivid-crimson)', flex: 1}}>Yes</button>
                  <button onClick={() => setDeleteCatConfirm({ isOpen: false, catId: null, catName: '' })} className="submit-button" style={{backgroundColor: '#e5e5ea', color: '#333', flex: 1}}>No</button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm.isOpen && (
            <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100}}>
              <div style={{backgroundColor: 'var(--white)', padding: '25px', borderRadius: '15px', width: '85%', maxWidth: '320px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'}}>
                <h3 style={{color: 'var(--vivid-crimson)', marginBottom: '10px'}}>Delete Item?</h3>
                <p style={{marginBottom: '20px', color: '#555'}}>Are you sure you want to delete <strong>{deleteConfirm.itemName}</strong>?</p>
                <div style={{display: 'flex', gap: '15px'}}>
                  <button onClick={handleConfirmDelete} className="submit-button" style={{backgroundColor: 'var(--vivid-crimson)', flex: 1}}>Yes</button>
                  <button onClick={() => setDeleteConfirm({ isOpen: false, itemIds: [], itemName: '' })} className="submit-button" style={{backgroundColor: '#e5e5ea', color: '#333', flex: 1}}>No</button>
                </div>
              </div>
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
        
        <div className="month-pill">
          <Calendar size={16} color="var(--dark-magenta)" />
          <span className="month-pill-text">
            {viewedMonthStr}
          </span>
        </div>
      </header>

      <UpdatePrompt />

      {/* Added touch events here for swiping */}
      <main 
        className="dashboard"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {renderContent()}
      </main>
      <nav className="tab-bar">
        <button className={activeTab === 'main' ? 'active' : ''} onClick={() => handleTabChange('main')}>
          <Home size={28} />
        </button>
        <button className={activeTab === 'add' ? 'active' : ''} onClick={() => handleTabChange('add')}>
          <PlusCircle size={28} />
        </button>
        <button className={activeTab === 'minus' ? 'active' : ''} onClick={() => handleTabChange('minus')}>
          <MinusCircle size={28} />
        </button>
        <button className={activeTab === 'update' ? 'active' : ''} onClick={() => handleTabChange('update')}>
          <FileEdit size={28} />
        </button>
      </nav>
    </div>
  );
}

export default App;