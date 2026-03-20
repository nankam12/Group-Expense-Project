import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';

const Friends = () => {
  const [friends, setFriends]     = useState([]);
  const [requests, setRequests]   = useState([]);
  const [search, setSearch]       = useState('');
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const fetchFriends = useCallback(async () => {
    try {
      const [frRes, reqRes] = await Promise.all([
        api.get('/friends'),
        api.get('/friends/requests'),
      ]);
      setFriends(frRes.data);
      setRequests(reqRes.data);
    } catch (_) {
      setError('Failed to load friends.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const flash = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3500);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (search.trim().length < 2) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(search.trim())}`);
      setResults(res.data);
    } catch (_) {
      flash('Search failed.', true);
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (userId) => {
    try {
      await api.post(`/friends/request/${userId}`);
      flash('Friend request sent!');
      setResults((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      flash(err.response?.data?.message ?? 'Could not send request.', true);
    }
  };

  const acceptRequest = async (friendshipId) => {
    try {
      await api.put(`/friends/accept/${friendshipId}`);
      flash('Friend request accepted!');
      fetchFriends();
    } catch (_) {
      flash('Could not accept request.', true);
    }
  };

  const removeFriend = async (friendshipId) => {
    if (!window.confirm('Remove this friend?')) return;
    try {
      await api.delete(`/friends/${friendshipId}`);
      flash('Friend removed.');
      fetchFriends();
    } catch (_) {
      flash('Could not remove friend.', true);
    }
  };

  const rejectRequest = async (friendshipId) => {
    try {
      await api.delete(`/friends/${friendshipId}`);
      flash('Request declined.');
      fetchFriends();
    } catch (_) {
      flash('Could not decline request.', true);
    }
  };

  // Determine which search results are already friends/pending
  const friendUserIds = new Set(friends.map((f) => f._id));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Friends</h1>
          <p>Manage your friends and find new ones.</p>
        </div>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Search */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 14 }}>Find People</div>
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setResults([]); }}
            placeholder="Search by name or email…"
          />
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {results.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {results.map((u) => (
              <div className="balance-item" key={u._id} style={{ marginBottom: 8 }}>
                <div className="balance-user">
                  <div className="balance-avatar">{u.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="balance-name">{u.name}</div>
                    <div className="balance-subtext">{u.email}</div>
                  </div>
                </div>
                {friendUserIds.has(u._id) ? (
                  <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>✓ Friend</span>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => sendRequest(u._id)}>
                    Add Friend
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {results.length === 0 && search && !searching && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 8 }}>
            No users found. Try a different name or email.
          </p>
        )}
      </div>

      {/* Pending requests */}
      {requests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">
            Pending Requests <span>({requests.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {requests.map((req) => (
              <div className="request-card" key={req._id}>
                <div className="request-info">
                  <div className="balance-avatar">{req.requester.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="balance-name">{req.requester.name}</div>
                    <div className="balance-subtext">{req.requester.email}</div>
                  </div>
                </div>
                <div className="request-actions">
                  <button className="btn btn-primary btn-sm"  onClick={() => acceptRequest(req._id)}>Accept</button>
                  <button className="btn btn-danger  btn-sm"  onClick={() => rejectRequest(req._id)}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="section-title">
        My Friends <span>({friends.length})</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : friends.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>No friends yet</h3>
          <p>Search for people above to add them as friends and start splitting expenses.</p>
        </div>
      ) : (
        <div className="friends-grid">
          {friends.map((f) => (
            <div className="friend-card" key={f._id}>
              <div className="friend-info">
                <div className="friend-avatar">{f.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="friend-name">{f.name}</div>
                  <div className="friend-email">{f.email}</div>
                </div>
              </div>
              <div className="friend-actions">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => removeFriend(f.friendshipId)}
                  title="Remove friend"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Friends;
