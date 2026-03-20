import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import CreateExpense from './CreateExpense';
import api from '../../services/api';

const CATEGORY_ICONS = {
  transportation: '🚗',
  restaurant:     '🍽️',
  trip:           '✈️',
  event:          '🎟️',
  other:          '💰',
};

const CATEGORY_FILTERS = [
  { value: 'all',           label: 'All' },
  { value: 'transportation',label: '🚗 Transportation' },
  { value: 'restaurant',    label: '🍽️ Restaurant' },
  { value: 'trip',          label: '✈️ Trip' },
  { value: 'event',         label: '🎟️ Event' },
  { value: 'other',         label: '💰 Other' },
];

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const ExpenseList = () => {
  const { user } = useAuth();
  const [expenses, setExpenses]     = useState([]);
  const [filter, setFilter]         = useState('all');
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (_) {
      setError('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const flash = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3500);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      flash('Expense deleted.');
      setExpenses((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      flash(err.response?.data?.message ?? 'Could not delete expense.', true);
    }
  };

  const filtered = filter === 'all' ? expenses : expenses.filter((e) => e.category === filter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p>Track and manage all your shared expenses.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Expense
        </button>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Category filter */}
      <div className="filter-chips">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c.value}
            className={`chip ${filter === c.value ? 'active' : ''}`}
            onClick={() => setFilter(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <h3>{filter === 'all' ? 'No expenses yet' : `No ${filter} expenses`}</h3>
          <p>
            {filter === 'all'
              ? 'Create your first shared expense to start tracking costs.'
              : 'Try a different category filter.'}
          </p>
          {filter === 'all' && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
              + New Expense
            </button>
          )}
        </div>
      ) : (
        <div className="expense-list">
          {filtered.map((exp) => {
            const iAmPayer = exp.paidBy._id === user._id;
            const myPart   = exp.participants.find((p) => p.user._id === user._id);
            const settled  = myPart?.paid ?? false;

            return (
              <div className="expense-item" key={exp._id}>
                <div className={`expense-icon ${exp.category}`}>
                  {CATEGORY_ICONS[exp.category] ?? '💰'}
                </div>

                <div className="expense-info">
                  <div className="expense-title">{exp.title}</div>
                  <div className="expense-meta">
                    {iAmPayer ? 'You paid' : `${exp.paidBy.name} paid`}
                    {' '}• {exp.participants.length} people •{' '}
                    {new Date(exp.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </div>
                  {exp.description && (
                    <div className="expense-meta" style={{ marginTop: 2, fontStyle: 'italic' }}>
                      {exp.description}
                    </div>
                  )}
                </div>

                <div className="expense-right">
                  <div className="expense-amount">{fmt(exp.totalAmount)}</div>
                  {myPart && !iAmPayer && (
                    <div className={`expense-status ${settled ? 'paid' : 'pending'}`}>
                      {settled ? '✓ Settled' : `You owe ${fmt(myPart.amount)}`}
                    </div>
                  )}
                  {iAmPayer && (
                    <div className="expense-status" style={{ color: 'var(--primary)' }}>
                      You paid
                    </div>
                  )}
                </div>

                {exp.createdBy._id === user._id && (
                  <button
                    className="btn btn-danger btn-sm btn-icon"
                    onClick={() => handleDelete(exp._id)}
                    title="Delete expense"
                    style={{ marginLeft: 8 }}
                  >
                    🗑
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateExpense
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchExpenses(); flash('Expense created!'); }}
        />
      )}
    </div>
  );
};

export default ExpenseList;
