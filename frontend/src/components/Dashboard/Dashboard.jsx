import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CATEGORY_ICONS = {
  transportation: '🚗',
  restaurant:     '🍽️',
  trip:           '✈️',
  event:          '🎟️',
  other:          '💰',
};

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const Dashboard = () => {
  const { user } = useAuth();
  const [balances, setBalances]   = useState([]);
  const [expenses, setExpenses]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balRes, expRes] = await Promise.all([
        api.get('/balances'),
        api.get('/expenses'),
      ]);
      setBalances(balRes.data);
      setExpenses(expRes.data.slice(0, 6));
    } catch (_) {
      // silently fail — errors shown per section
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalOwed = balances.filter((b) => b.amount > 0).reduce((s, b) => s + b.amount, 0);
  const totalOwe  = balances.filter((b) => b.amount < 0).reduce((s, b) => s + Math.abs(b.amount), 0);

  const hour   = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{greeting}, {user?.name?.split(' ')[0]}! 👋</h1>
          <p>Here's your expense summary at a glance.</p>
        </div>
        <Link to="/expenses" className="btn btn-primary">+ Add Expense</Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#e8f4fd' }}>📋</div>
          <div className="stat-card-label">Total Expenses</div>
          <div className="stat-card-value">{loading ? '—' : expenses.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#e8f5e9' }}>💵</div>
          <div className="stat-card-label">Total Spent</div>
          <div className="stat-card-value">
            {loading ? '—' : fmt(expenses.reduce((s, e) => s + e.totalAmount, 0))}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#fdf2f2' }}>📤</div>
          <div className="stat-card-label">You Owe</div>
          <div className={`stat-card-value ${totalOwe > 0 ? 'negative' : ''}`}>
            {loading ? '—' : fmt(totalOwe)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#f0faf5' }}>📥</div>
          <div className="stat-card-label">Owed to You</div>
          <div className={`stat-card-value ${totalOwed > 0 ? 'positive' : ''}`}>
            {loading ? '—' : fmt(totalOwed)}
          </div>
        </div>
      </div>

      <div className="two-col">
        {/* Balances */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Balances</span>
            <Link to="/payments" className="btn btn-outline btn-sm">Settle Up</Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : balances.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div className="empty-state-icon">🎉</div>
              <h3>All settled up!</h3>
              <p>No outstanding balances with anyone.</p>
            </div>
          ) : (
            <div className="balance-list">
              {balances.map((b) => (
                <div className="balance-item" key={b.user._id}>
                  <div className="balance-user">
                    <div className="balance-avatar">{b.user.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="balance-name">{b.user.name}</div>
                      <div className="balance-subtext">
                        {b.amount > 0 ? 'owes you' : 'you owe'}
                      </div>
                    </div>
                  </div>
                  <div className={`balance-amount ${b.amount > 0 ? 'owed' : 'owe'}`}>
                    {b.amount > 0 ? '+' : '-'}{fmt(Math.abs(b.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Expenses</span>
            <Link to="/expenses" className="btn btn-outline btn-sm">View All</Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : expenses.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div className="empty-state-icon">💳</div>
              <h3>No expenses yet</h3>
              <p>Add your first shared expense to get started.</p>
            </div>
          ) : (
            <div className="expense-list">
              {expenses.map((exp) => {
                const myPart = exp.participants.find(
                  (p) => p.user._id === user?._id
                );
                const iAmPayer = exp.paidBy._id === user?._id;
                return (
                  <div className="expense-item" key={exp._id}>
                    <div className={`expense-icon ${exp.category}`}>
                      {CATEGORY_ICONS[exp.category] ?? '💰'}
                    </div>
                    <div className="expense-info">
                      <div className="expense-title">{exp.title}</div>
                      <div className="expense-meta">
                        {iAmPayer ? 'You paid' : `${exp.paidBy.name} paid`} •{' '}
                        {new Date(exp.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="expense-right">
                      <div className="expense-amount">{fmt(exp.totalAmount)}</div>
                      {myPart && (
                        <div className={`expense-status ${myPart.paid ? 'paid' : 'pending'}`}>
                          {myPart.paid ? '✓ Settled' : `You owe ${fmt(myPart.amount)}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/expenses" className="btn btn-primary">💳 Add Expense</Link>
          <Link to="/friends"  className="btn btn-outline">👥 Manage Friends</Link>
          <Link to="/payments" className="btn btn-outline">💸 Record Payment</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
