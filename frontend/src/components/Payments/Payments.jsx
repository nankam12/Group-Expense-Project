import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const RecordPaymentModal = ({ onClose, onRecorded }) => {
  const { user }  = useAuth();
  const [friends, setFriends]     = useState([]);
  const [expenses, setExpenses]   = useState([]);
  const [form, setForm]           = useState({ payee: '', amount: '', expense: '', note: '' });
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/friends'), api.get('/expenses')]).then(([fr, exp]) => {
      setFriends(fr.data);
      // Only show expenses where current user owes something
      const pending = exp.data.filter((e) => {
        const part = e.participants.find((p) => p.user._id === user._id);
        return part && !part.paid && e.paidBy._id !== user._id;
      });
      setExpenses(pending);
    });
  }, [user._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.payee) { setError('Select who you are paying.'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Enter a valid amount.'); return; }

    setSubmitting(true);
    try {
      await api.post('/payments', {
        payee:   form.payee,
        amount:  parseFloat(form.amount),
        expense: form.expense || undefined,
        note:    form.note,
      });
      onRecorded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to record payment.');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Record Payment</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Paying To *</label>
            <select
              value={form.payee}
              onChange={(e) => setForm({ ...form, payee: e.target.value })}
              required
            >
              <option value="">— Select person —</option>
              {friends.map((f) => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Amount ($) *</label>
            <input
              type="number" min="0.01" step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label>Linked Expense (optional)</label>
            <select
              value={form.expense}
              onChange={(e) => setForm({ ...form, expense: e.target.value })}
            >
              <option value="">— None —</option>
              {expenses.map((exp) => (
                <option key={exp._id} value={exp._id}>
                  {exp.title} — {fmt(exp.totalAmount)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Note (optional)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. Venmo transfer"
              maxLength={200}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ */

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [filter, setFilter]         = useState('all'); // all | sent | received
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments');
      setPayments(res.data);
    } catch (_) {
      setError('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const flash = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3500);
  };

  const filtered = payments.filter((p) => {
    if (filter === 'sent')     return p.payer._id === user._id;
    if (filter === 'received') return p.payee._id === user._id;
    return true;
  });

  const totalSent     = payments.filter((p) => p.payer._id === user._id).reduce((s, p) => s + p.amount, 0);
  const totalReceived = payments.filter((p) => p.payee._id === user._id).reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>History of all payments you've sent or received.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Record Payment
        </button>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Summary */}
      {!loading && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#e8f5e9' }}>📊</div>
            <div className="stat-card-label">Total Transactions</div>
            <div className="stat-card-value">{payments.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#fdf2f2' }}>📤</div>
            <div className="stat-card-label">Total Sent</div>
            <div className="stat-card-value negative">{fmt(totalSent)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#f0faf5' }}>📥</div>
            <div className="stat-card-label">Total Received</div>
            <div className="stat-card-value positive">{fmt(totalReceived)}</div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="filter-chips">
        {[['all','All'],['sent','Sent'],['received','Received']].map(([v, l]) => (
          <button key={v} className={`chip ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💸</div>
          <h3>No payments {filter !== 'all' ? filter : 'yet'}</h3>
          <p>Record a payment whenever you settle up with a friend.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
            + Record Payment
          </button>
        </div>
      ) : (
        <div className="payment-list">
          {filtered.map((p) => {
            const isSent = p.payer._id === user._id;
            const other  = isSent ? p.payee : p.payer;
            return (
              <div className="payment-item" key={p._id}>
                <div className={`payment-direction ${isSent ? 'sent' : 'received'}`}>
                  {isSent ? '↑' : '↓'}
                </div>
                <div className="payment-info">
                  <div className="payment-desc">
                    {isSent ? `You paid ${other.name}` : `${other.name} paid you`}
                  </div>
                  <div className="payment-meta">
                    {p.expense ? `For: ${p.expense.title} • ` : ''}
                    {p.note ? `"${p.note}" • ` : ''}
                    {new Date(p.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </div>
                </div>
                <div className={`payment-amount ${isSent ? 'sent' : 'received'}`}>
                  {isSent ? '-' : '+'}{fmt(p.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <RecordPaymentModal
          onClose={() => setShowModal(false)}
          onRecorded={() => { fetchPayments(); flash('Payment recorded!'); }}
        />
      )}
    </div>
  );
};

export default Payments;
