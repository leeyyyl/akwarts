import { useState, useEffect, useRef } from 'react';
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

  // Factory Reset State
  const [resetClicks, setResetClicks] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const resetButtonRef = useRef(null); // Used to identify the reset button

  // Listen for clicks anywhere on the screen
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // If the tap was NOT on the reset button, restart the count
      if (resetButtonRef.current && !resetButtonRef.current.contains(e.target)) {
        setResetClicks(0);
      }
    };
    
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick); // For mobile swipes/taps
    
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, []);

  const handleResetClick = () => {
    if (resetClicks + 1 >= 5) {
      setShowResetConfirm(true);
      setResetClicks(0); 
    } else {
      setResetClicks(prev => prev + 1);
    }
  };

  const executeFactoryReset = () => {
    localStorage.clear(); 
    window.location.reload(); 
  };

  const [deleteCatConfirm, setDeleteCatConfirm] = useState({ isOpen: false, catId: null, catName: '' });

  const handleConfirmDeleteCategory = () => {
    // Removes the category
    setCategories(categories.filter(c => c.id !== deleteCatConfirm.catId));
    // Removes all transactions tied to that category to prevent ghost data
    setTransactions(transactions.filter(t => t.categoryId !== deleteCatConfirm.catId));
    setDeleteCatConfirm({ isOpen: false, catId: null, catName: '' });
  };

  // Global Savings State
  const [savingsData, setSavingsData] = useState(() => {
    const saved = localStorage.getItem('akwartsSavings');
    return saved ? JSON.parse(saved) : { current: 0, goal: 0 };
  });
  const [savingsModal, setSavingsModal] = useState({ isOpen: false, mode: 'deposit' }); // 'deposit', 'withdraw', 'goal'
  const [savingsInput, setSavingsInput] = useState('');
  const [savingsError, setSavingsError] = useState('');
  const [selectedIncomeId, setSelectedIncomeId] = useState('');

  // Save global savings to local storage
  useEffect(() => {
    localStorage.setItem('akwartsSavings', JSON.stringify(savingsData));
  }, [savingsData]);

  // Process Savings Deposits, Withdrawals, and Goals
  const handleSavingsSubmit = () => {
    const amount = parseFloat(savingsInput);
    if (isNaN(amount) || amount <= 0) {
      setSavingsError('Enter a valid amount!');
      setSavingsInput('');
      return;
    }

    if (savingsModal.mode === 'goal') {
      setSavingsData({ ...savingsData, goal: amount });
    } else {
      if (!selectedIncomeId) {
        setSavingsError('Select an income source!');
        return;
      }

      const targetTxnIndex = transactions.findIndex(t => t.id.toString() === selectedIncomeId);
      if (targetTxnIndex === -1) return;
      
      const targetTxn = transactions[targetTxnIndex];
      const updatedTransactions = [...transactions];

      if (savingsModal.mode === 'withdraw') {
        if (amount > savingsData.current) {
          setSavingsError('Exceeds current savings!');
          setSavingsInput('');
          return;
        }
        setSavingsData({ ...savingsData, current: savingsData.current - amount });
        updatedTransactions[targetTxnIndex] = { ...targetTxn, amount: targetTxn.amount + amount };
        
      } else if (savingsModal.mode === 'deposit') {
        if (amount > targetTxn.amount) {
          setSavingsError('Exceeds item balance!');
          setSavingsInput('');
          return;
        }
        setSavingsData({ ...savingsData, current: savingsData.current + amount });
        updatedTransactions[targetTxnIndex] = { ...targetTxn, amount: targetTxn.amount - amount };
      }
      
      setTransactions(updatedTransactions);
    }

    if (navigator.vibrate) navigator.vibrate(50);
    
    setSavingsError('');
    setSavingsModal({ isOpen: false, mode: '' });
    setSavingsInput('');
    setSelectedIncomeId('');
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

    if (isLeftSwipe && canGoNext) {
      handleNextMonth(); 
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]); // <-- ADD THIS
    }
    if (isRightSwipe && canGoPrev) {
      handlePrevMonth(); 
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]); // <-- ADD THIS
    }
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
      { id: 'c1', name: 'Weekly Income', type: 'add', expected: 0 },
      { id: 'c2', name: 'Bills', type: 'minus', expected: 0 },
      { id: 'c3', name: 'Other Expenses', type: 'minus', expected: 0 },
      { id: 'c4', name: 'Debt', type: 'minus', expected: 0 }
    ]);

    if (savedTxns) setTransactions(JSON.parse(savedTxns));
    else setTransactions([]);
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
    if (navigator.vibrate) navigator.vibrate(50);
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
    if (navigator.vibrate) navigator.vibrate(50);
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
    if (navigator.vibrate) navigator.vibrate(50);
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
              {combinedTxns.length === 0 ? (
                <tr>
                  <td colSpan={isUpdateMode ? "3" : "2"} style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontStyle: 'italic' }}>
                    No logs yet! Add your first item.
                  </td>
                </tr>
              ) : (
                combinedTxns.map(item => (
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
                ))
              )}
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

  // Generates the Savings Card with optional action buttons
  const renderSavingsCard = (showActions) => (
    <div className="summary-card" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ color: 'var(--dark-magenta)', margin: 0 }}>Savings Goal</h3>
        
        {/* Only show the Edit Goal button if showActions is true */}
        {showActions && (
          <button 
            onClick={() => setSavingsModal({ isOpen: true, mode: 'goal' })}
            style={{ background: 'none', border: 'none', color: 'var(--dark-magenta)', cursor: 'pointer' }}
          >
            <Edit2 size={18} />
          </button>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--vivid-cyan)' }}>
          ₱{savingsData.current.toFixed(2)}
        </span>
        <span style={{ fontSize: '1rem', color: '#888', fontWeight: 'bold' }}>
          / ₱{savingsData.goal.toFixed(2)}
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '12px', backgroundColor: '#e5e5ea', borderRadius: '6px', margin: '15px 0', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min((savingsData.current / savingsData.goal) * 100, 100)}%`, height: '100%', backgroundColor: 'var(--vivid-cyan)', transition: 'width 0.3s ease' }}></div>
      </div>
      
      {/* Only show the Deposit and Withdraw buttons if showActions is true */}
      {showActions && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setSavingsModal({ isOpen: true, mode: 'deposit' })}
            className="submit-button" 
            style={{ backgroundColor: 'var(--vivid-cyan)', padding: '10px', fontSize: '0.9rem', flex: 1 }}
          >
            + Deposit
          </button>
          <button 
            onClick={() => setSavingsModal({ isOpen: true, mode: 'withdraw' })}
            className="submit-button" 
            style={{ backgroundColor: '#e5e5ea', color: '#333', padding: '10px', fontSize: '0.9rem', flex: 1 }}
          >
            - Withdraw
          </button>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'main') {
      return (
        <div className="budget-dashboard">
          
          {/* 1. MAIN SUMMARY CARD (Left to Spend) */}
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

          {/* Render Savings Card WITHOUT buttons */}
          {renderSavingsCard(false)}

          {/* 3. CATEGORY TABLES */}
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
                className={`input-field ${formErrors.category ? 'shake-error' : ''}`}
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
                className={`input-field ${formErrors.name ? 'shake-error' : ''}`}
                style={formErrors.name ? { borderColor: 'var(--vivid-crimson)' } : {}}
              />

              <input 
                type="number" 
                placeholder={formErrors.amount || "Amount (₱)"} 
                value={itemAmount}
                onChange={(e) => { setItemAmount(e.target.value); setFormErrors({...formErrors, amount: ''}); }}
                className={`input-field ${formErrors.amount ? 'shake-error' : ''}`}
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
              {historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontStyle: 'italic' }}>
                  No logs yet!
                </div>
              ) : (
                historyLogs.map(t => (
                  <div key={t.id} className={`transaction-item ${t.type}`}>
                    <div className="transaction-info">
                      <span className="transaction-name">{t.name}</span>
                      <span style={{ fontSize: '0.8rem', color: '#999' }}>
                        {new Date(t.id).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="transaction-amount">₱{t.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }
    
    if (activeTab === 'update') {
      return (
        <div className="budget-dashboard">

          {/* Render Savings Card WITH buttons */}
          {renderSavingsCard(true)}
          
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
                    if (navigator.vibrate) navigator.vibrate(50);
                    setShowAddCategory(false);
                  }} className="submit-button" style={{width: 'auto'}}>Add</button>
                </div>
              </>
            )}
          </div>

          {getCategoryTables('add', true)}
          {getCategoryTables('minus', true)}

          {/* Hidden Factory Reset Button */}
          <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '20px' }}>
            <button 
              ref={resetButtonRef} 
              onClick={handleResetClick}
              style={{ background: 'none', border: 'none', color: '#ccc', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Reset App Data
            </button>
          </div>

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
        <img 
          src="/wordLogo.png" 
          alt="Akwarts Logo" 
          className="header-logo" 
          onClick={() => { 
            setActiveTab('main');
            // Scroll both the window and the dashboard container just to be safe
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const dashboard = document.querySelector('.dashboard');
            if (dashboard) dashboard.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        />
        
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

      {/* Savings Action Modal */}
      {savingsModal.isOpen && (
        <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100}}>
          <div style={{backgroundColor: 'var(--white)', padding: '25px', borderRadius: '15px', width: '85%', maxWidth: '320px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'}}>
            <h3 style={{color: 'var(--dark-magenta)', marginBottom: '15px'}}>
              {savingsModal.mode === 'goal' ? 'Set Savings Goal' : savingsModal.mode === 'deposit' ? 'Deposit to Savings' : 'Withdraw from Savings'}
            </h3>
            
            {/* Show income dropdown for deposits and withdrawals */}
            {savingsModal.mode !== 'goal' && (
              <select 
                value={selectedIncomeId} 
                onChange={(e) => { setSelectedIncomeId(e.target.value); setSavingsError(''); }}
                className="input-field"
                style={{ marginBottom: '10px', ...(savingsError === 'Select an income source!' ? { borderColor: 'var(--vivid-crimson)' } : {}) }}
              >
                <option value="" disabled>Select Income Item...</option>
                {transactions.filter(t => t.type === 'add').map(t => (
                  <option key={t.id} value={t.id}>{t.name} (₱{t.amount.toFixed(2)})</option>
                ))}
              </select>
            )}

            <input 
              type="number" 
              placeholder={savingsError || "Amount (₱)"} 
              value={savingsInput}
              onChange={(e) => { setSavingsInput(e.target.value); setSavingsError(''); }}
              className={`input-field ${savingsError && savingsError !== 'Select an income source!' ? 'shake-error' : ''}`}
              style={{ marginBottom: '15px', ...(savingsError && savingsError !== 'Select an income source!' ? { borderColor: 'var(--vivid-crimson)' } : {}) }}
              autoFocus={savingsModal.mode === 'goal'}
            />

            <div style={{display: 'flex', gap: '15px'}}>
              <button onClick={handleSavingsSubmit} className="submit-button" style={{backgroundColor: 'var(--vivid-cyan)', flex: 1}}>Confirm</button>
              <button onClick={() => { setSavingsModal({isOpen: false, mode: ''}); setSavingsInput(''); setSavingsError(''); setSelectedIncomeId(''); }} className="submit-button" style={{backgroundColor: '#e5e5ea', color: '#333', flex: 1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Factory Reset Confirmation Modal */}
      {showResetConfirm && (
        <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200}}>
          <div style={{backgroundColor: 'var(--white)', padding: '25px', borderRadius: '15px', width: '85%', maxWidth: '320px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'}}>
            <h3 style={{color: 'var(--vivid-crimson)', marginBottom: '15px'}}>WARNING</h3>
            
            <p style={{marginBottom: '25px', color: '#333', fontWeight: 'bold', fontSize: '1.1rem'}}>
              Are you sure? All data will be lost.
            </p>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              {/* Highlighted NO button */}
              <button 
                onClick={() => { setShowResetConfirm(false); setResetClicks(0); }} 
                className="submit-button" 
                style={{backgroundColor: 'var(--vivid-cyan)', color: 'var(--dark-magenta)', padding: '15px', fontSize: '1.1rem', fontWeight: '800'}}
              >
                NO, KEEP MY DATA
              </button>
              
              {/* Muted YES button */}
              <button 
                onClick={executeFactoryReset} 
                className="submit-button" 
                style={{backgroundColor: '#ffe5e5', color: 'var(--vivid-crimson)', padding: '10px'}}
              >
                Yes, delete everything
              </button>
            </div>
          </div>
        </div>
      )}

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