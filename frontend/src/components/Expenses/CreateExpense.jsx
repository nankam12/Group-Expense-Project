import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CATEGORIES = [
  { value: 'transportation', label: '🚗 Transportation' },
  { value: 'restaurant',     label: '🍽️ Restaurant' },
  { value: 'trip',           label: '✈️ Trip' },
  { value: 'event',          label: '🎟️ Event' },
  { value: 'other',          label: '💰 Other' },
];

const CreateExpense = ({ onClose, onCreated }) => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    title:       '',
    description: '',
    category:    'other',
    totalAmount: '',
    paidBy:      user._id,
    splitType:   'equal',
  });

  const [friends, setFriends]         = useState([]);
  const [selected, setSelected]       = useState([user._id]);
  const [customAmts, setCustomAmts]   = useState({});
  const [error, setError]             = useState('');
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    api.get('/friends').then((r) => setFriends(r.data)).catch(() => {});
  }, []);

  const allParticipants = [
    { _id: user._id, name: `${user.name} (You)`, email: user.email },
    ...friends,
  ];

  const toggleParticipant = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (selected.length === 0) {
      setError('Select at least one participant.');
      return;
    }
    if (!form.totalAmount || parseFloat(form.totalAmount) <= 0) {
      setError('Enter a valid total amount.');
      return;
    }

    if (form.splitType === 'custom') {
      const sum = selected.reduce((acc, id) => acc + parseFloat(customAmts[id] || 0), 0);
      const diff = Math.abs(sum - parseFloat(form.totalAmount));
      if (diff > 0.02) {
        setError(`Custom amounts sum to $${sum.toFixed(2)} but total is $${parseFloat(form.totalAmount).toFixed(2)}. They must match.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const participants = selected.map((id) => ({
        user: id,
        amount: form.splitType === 'custom' ? parseFloat(customAmts[id] || 0) : 0,
      }));

      await api.post('/expenses', {
        ...form,
        totalAmount: parseFloat(form.totalAmount),
        participants,
      });

      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to create expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const equalShare =
    selected.length > 0 && form.totalAmount
      ? (parseFloat(form.totalAmount) / selected.length).toFixed(2)
      : '—';

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Expense</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Dinner at Mario's"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Total Amount ($) *</label>
              <input
                type="number" min="0.01" step="0.01"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes…"
            />
          </div>

          <div className="form-group">
            <label>Paid By *</label>
            <select
              value={form.paidBy}
              onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
            >
              {allParticipants.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Split Type</label>
            <select
              value={form.splitType}
              onChange={(e) => setForm({ ...form, splitType: e.target.value })}
            >
              <option value="equal">Equal Split</option>
              <option value="custom">Custom Amounts</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              Participants *
              {form.splitType === 'equal' && form.totalAmount && selected.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                  — ${equalShare}/person
                </span>
              )}
            </label>

            {allParticipants.map((p) => (
              <div
                key={p._id}
                className={`participant-option ${selected.includes(p._id) ? 'selected' : ''}`}
                onClick={() => toggleParticipant(p._id)}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(p._id)}
                  onChange={() => {}}
                />
                <span className="participant-option-name">{p.name}</span>

                {form.splitType === 'custom' && selected.includes(p._id) && (
                  <input
                    type="number"
                    className="participant-amount-input"
                    min="0" step="0.01"
                    value={customAmts[p._id] ?? ''}
                    placeholder="0.00"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setCustomAmts({ ...customAmts, [p._id]: e.target.value })
                    }
                  />
                )}
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExpense;
