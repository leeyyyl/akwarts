import { useState, useEffect, useRef } from 'react';
import { Home, PlusCircle, MinusCircle, FileEdit, Trash2, Edit2, Check, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import './App.css';
import UpdatePrompt from './UpdatePrompt';
import { supabase } from './supabaseClient';

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

  // CSV Export & Backup System
  const handleExportCSV = () => {
    // 1. Setup CSV Headers
    let csvContent = "Month,Date,Time,Type,Category,Item,Amount,Recurring\n";

    // 2. Loop through all local storage keys to find every saved month
    const storageKeys = Object.keys(localStorage);
    const txnKeys = storageKeys.filter(key => key.startsWith('akwartsTxns_'));

    txnKeys.forEach(txnKey => {
      const monthStr = txnKey.replace('akwartsTxns_', '');
      const catKey = `akwartsCats_${monthStr}`;
      
      const monthTxns = JSON.parse(localStorage.getItem(txnKey) || '[]');
      const monthCats = JSON.parse(localStorage.getItem(catKey) || '[]');

      // 3. Create a map of category ID to Name for quick lookup
      const catMap = {};
      monthCats.forEach(c => { catMap[c.id] = c.name; });

      // 4. Append each transaction to the CSV string
      monthTxns.forEach(t => {
        const dateObj = new Date(t.id); // Using the ID which is Date.now()
        const dateString = dateObj.toLocaleDateString();
        const timeString = dateObj.toLocaleTimeString();
        const catName = catMap[t.categoryId] || 'Unknown';
        const typeStr = t.type === 'add' ? 'Income' : 'Expense';
        const recurringStr = t.isRecurring ? 'Yes' : 'No';
        
        // Escape quotes to prevent spreadsheet formatting errors
        const safeItemName = `"${t.name.replace(/"/g, '""')}"`;
        const safeCatName = `"${catName.replace(/"/g, '""')}"`;

        const row = `${monthStr},${dateString},${timeString},${typeStr},${safeCatName},${safeItemName},${t.amount},${recurringStr}`;
        csvContent += row + "\n";
      });
    });

    // 5. Generate the Filename: aKwartsData_YYYY-MM-DD.csv
    const today = new Date();
    // Format date as YYYY-MM-DD for a clean filename
    const dateFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const fileName = `aKwartsData_${dateFormatted}.csv`;

    // 6. Trigger native download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
    }
    if (isRightSwipe && canGoPrev) {
      handlePrevMonth();
    }
  };

  const [activeTab, setActiveTab] = useState('main');
  
  // Start with empty arrays; the useEffect below will load the correct month's data
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // 1. Load data from Supabase whenever the viewed month changes
  useEffect(() => {
    const fetchCloudData = async () => {
      // Securely identify the logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Categories for this specific month
      const { data: cloudCats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .eq('month_key', viewedMonthStr)
        .eq('user_id', user.id);

      if (cloudCats && cloudCats.length > 0) {
        setCategories(cloudCats);
      } else {
        // Apply defaults if the cloud is completely empty for this month
        setCategories([
          { id: 'c1', name: 'Income', type: 'add', expected: 0 },
          { id: 'c2', name: 'Bills', type: 'minus', expected: 0 },
          { id: 'c3', name: 'Other Expenses', type: 'minus', expected: 0 },
          { id: 'c4', name: 'Debt', type: 'minus', expected: 0 }
        ]);
      }

      // Fetch Transactions for this specific month
      const { data: cloudTxns, error: txnErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('month_key', viewedMonthStr)
        .eq('user_id', user.id);

      setTransactions(
        (cloudTxns || []).map(t => ({
          ...t,
          categoryId: t.category_id,
          isRecurring: t.is_recurring
        }))
      );
    };

    fetchCloudData();
  }, [viewedMonthStr]);

  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formErrors, setFormErrors] = useState({ category: '', name: '', amount: '' });
  const [isRecurring, setIsRecurring] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    setIsRecurring(false);
    setSearchQuery('');
  };

  const handleAddTransaction = async (e, type) => {
    e.preventDefault(); 
    const amount = parseFloat(itemAmount);
    let errors = { category: '', name: '', amount: '' };
    let hasError = false;
    
    if (!selectedCategory) { errors.category = 'Select a category!'; hasError = true; }
    if (itemName.trim() === '') { errors.name = 'Enter transaction name!'; hasError = true; }
    if (isNaN(amount) || amount <= 0) { errors.amount = 'Enter valid amount!'; hasError = true; }

    if (hasError) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({ category: '', name: '', amount: '' });
    
    // 1. Get the current secure user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newId = Date.now().toString(); // Supabase uses TEXT for IDs

    // 2. Format for React (Keeps the UI instant)
    const uiTransaction = {
      id: newId,
      categoryId: selectedCategory,
      name: itemName.trim(),
      amount: amount,
      type: type,
      isRecurring: isRecurring
    };
    
    // 3. Format for Supabase Database
    const dbTransaction = {
      id: newId,
      user_id: user.id,
      month_key: viewedMonthStr,
      category_id: selectedCategory,
      name: itemName.trim(),
      amount: amount,
      type: type,
      is_recurring: isRecurring
    };
    
    // Optimistic Update: Paint the screen immediately
    setTransactions([...transactions, uiTransaction]);
    setItemName('');
    setItemAmount('');
    setSelectedCategory('');
    setIsRecurring(false);

    // Push to cloud in the background
    const { error } = await supabase.from('transactions').insert([dbTransaction]);
    if (error) console.error("Error saving to cloud:", error);
  };

  const handleDeleteTransaction = async (idToDelete) => {
    // Optimistic Update: Instantly remove it from the screen
    setTransactions(transactions.filter(t => t.id !== idToDelete));

    // Delete it permanently from the cloud
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', idToDelete);

    if (error) console.error("Error deleting from cloud:", error);
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

  // Generates a zero-dependency SVG Donut Chart for Expenses
  const renderExpenseChart = () => {
    // 1. Gather and sort the expense data
    const expenseCats = categories.filter(c => c.type === 'minus');
    const colors = ['var(--vivid-crimson)', 'var(--vivid-cyan)', 'var(--dark-magenta)', '#ffaa00', '#9d02d7', '#00bfa5', '#ff8c00']; 
    
    const chartData = expenseCats.map((cat, index) => {
      const catTotal = transactions.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
      return { 
        name: cat.name, 
        amount: catTotal, 
        color: colors[index % colors.length] 
      };
    }).filter(d => d.amount > 0).sort((a, b) => b.amount - a.amount); // Hide empty categories & sort by largest

    // 2. Handle empty states
    if (chartData.length === 0 || totalExpenses === 0) {
      return null; // Don't show the chart if there are no expenses yet
    }

    let cumulativePercent = 0;

    // 3. Render the SVG and Legend
    return (
      <div className="summary-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h3 style={{ width: '100%', marginBottom: '15px', color: 'var(--dark-magenta)', fontWeight: '600' }}>Expense Breakdown</h3>
        
        <div style={{ position: 'relative', width: '160px', height: '160px' }}>
          <svg width="100%" height="100%" viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background ring */}
            <circle cx="21" cy="21" r="15.91549431" fill="transparent" stroke="var(--bg-gray)" strokeWidth="6" />
            
            {/* Dynamic data rings */}
            {chartData.map((data) => {
              const percent = (data.amount / totalExpenses) * 100;
              const dashArray = `${percent} ${100 - percent}`;
              const dashOffset = -cumulativePercent;
              cumulativePercent += percent;
              
              return (
                <circle
                  key={data.name}
                  cx="21"
                  cy="21"
                  r="15.91549431"
                  fill="transparent"
                  stroke={data.color}
                  strokeWidth="6"
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
                />
              );
            })}
          </svg>
          
          {/* Center Text */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>Total</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--dark-magenta)' }}>₱{totalExpenses.toFixed(0)}</span>
          </div>
        </div>
        
        {/* Dynamic Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '20px', width: '100%' }}>
          {chartData.map((data) => (
            <div key={data.name} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#555' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: data.color, borderRadius: '50%', marginRight: '6px' }}></span>
              {data.name} ({((data.amount / totalExpenses) * 100).toFixed(0)}%)
            </div>
          ))}
        </div>
      </div>
    );
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

          {renderExpenseChart()}

          {/* 3. CATEGORY TABLES */}
          {getCategoryTables('add')}
          {getCategoryTables('minus')}
          
        </div>
      );
    }
    
    if (activeTab === 'add' || activeTab === 'minus') {
      const isAdd = activeTab === 'add';
      const typeCats = categories.filter(c => c.type === activeTab);
      const historyLogs = transactions
        .filter(t => t.type === activeTab)
        .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .reverse();
      
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

              {/* NEW RECURRING CHECKBOX */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px', padding: '0 5px' }}>
                <input 
                  type="checkbox" 
                  id="recurring-check"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: isAdd ? 'var(--vivid-cyan)' : 'var(--vivid-crimson)' }}
                />
                <label htmlFor="recurring-check" style={{ color: 'var(--dark-magenta)', fontSize: '0.95rem', cursor: 'pointer' }}>
                  Make this a recurring monthly item
                </label>
              </div>
              
              <button type="submit" className="submit-button" style={{ backgroundColor: isAdd ? 'var(--vivid-cyan)' : 'var(--vivid-crimson)' }}>
                Record {isAdd ? 'Income' : 'Expense'}
              </button>
            </form>
          </div>
          
          <div className="summary-card">
            <h3>History Logs</h3>

            {/* SEARCH BAR WITH EMBEDDED TEXT CLEAR */}
            <div style={{ position: 'relative', marginTop: '15px', marginBottom: '5px' }}>
              <input 
                type="text" 
                placeholder="Search history by name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ marginBottom: 0, paddingRight: '80px', width: '100%' }}
              />
              
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{ 
                    position: 'absolute',
                    right: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent', 
                    color: 'var(--vivid-crimson)', 
                    border: 'none', 
                    fontSize: '0.9rem',
                    fontWeight: 'bold', 
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  X Clear
                </button>
              )}
            </div>

            <div className="transaction-list" style={{marginTop: '15px'}}>
              {historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontStyle: 'italic' }}>
                  No logs yet!
                </div>
              ) : (
                historyLogs.map(t => (
                  <div key={t.id} className={`transaction-item ${t.type}`}>
                    <div className="transaction-info">
                      <span className="transaction-name">
                        {t.name}
                        {t.isRecurring && (
                          <span style={{ fontSize: '0.7rem', color: t.type === 'add' ? 'var(--vivid-cyan)' : 'var(--vivid-crimson)', marginLeft: '8px', verticalAlign: 'middle', border: `1px solid ${t.type === 'add' ? 'var(--vivid-cyan)' : 'var(--vivid-crimson)'}`, borderRadius: '4px', padding: '2px 4px' }}>
                            RECURRING
                          </span>
                        )}
                      </span>
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
                    setShowAddCategory(false);
                  }} className="submit-button" style={{width: 'auto'}}>Add</button>
                </div>
              </>
            )}
          </div>

          {getCategoryTables('add', true)}
          {getCategoryTables('minus', true)}

          {/* Data Export / Backup Button */}
          <div style={{ padding: '0 20px', marginTop: '30px' }}>
            <button 
              onClick={handleExportCSV}
              className="submit-button" 
              style={{ backgroundColor: 'var(--vivid-cyan)', color: 'var(--dark-magenta)' }}
            >
              Export Data Backup (CSV)
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', marginTop: '10px' }}>
              Downloads your complete history to your device.
            </p>
          </div>

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