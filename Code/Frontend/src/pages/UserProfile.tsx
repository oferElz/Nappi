import React, { useState, useEffect, useCallback } from 'react';
import type { AuthUser, BabyNote } from '../types/auth';
import { authApi, babiesApi } from '../api/auth';
import { useLayoutContext } from '../components/LayoutContext';
import { fetchVapidKey, fetchPushStatus, subscribeToPush, unsubscribeFromPush } from '../api/alerts';
import { getSession } from '../utils/session';
import { NOTE_TITLE_MAX_LENGTH, PASSWORD_SUCCESS_TIMEOUT_MS } from '../constants';

// Helper function to convert VAPID key to Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Helper function to calculate age from birthdate
const calculateAge = (birthdate: string): string => {
  const birth = new Date(birthdate);
  const today = new Date();
  const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());

  if (months < 1) {
    const days = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  } else if (months < 24) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
};

const UserProfile: React.FC = () => {
  const { setMenuOpen } = useLayoutContext();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Multi-note system state
  const [notes, setNotes] = useState<BabyNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getSession();
    if (stored) {
      const userData = JSON.parse(stored);
      setUser(userData);
    }
  }, []);

  // Fetch notes from server when user loads
  const fetchNotes = useCallback(async () => {
    if (!user?.user_id || !user?.baby?.id) return;
    
    setNotesLoading(true);
    try {
      const { data } = await babiesApi.getNotes(user.baby.id, user.user_id);
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setNotesLoading(false);
    }
  }, [user?.user_id, user?.baby?.id]);

  useEffect(() => {
    if (user?.baby?.id) {
      fetchNotes();
    }
  }, [user?.baby?.id, fetchNotes]);

  // Create a new note
  const handleCreateNote = async () => {
    if (!user?.user_id || !user?.baby?.id) return;
    if (!noteTitle.trim() || !noteContent.trim()) {
      setNoteError('Please fill in both title and content');
      return;
    }
    
    setNotesLoading(true);
    setNoteError(null);
    
    try {
      const { data } = await babiesApi.createNote(user.baby.id, user.user_id, {
        title: noteTitle.trim(),
        content: noteContent.trim(),
      });
      setNotes([data, ...notes]);
      setNoteTitle('');
      setNoteContent('');
      setIsAddingNote(false);
    } catch (err) {
      console.error('Failed to create note:', err);
      setNoteError('Failed to create note');
    } finally {
      setNotesLoading(false);
    }
  };

  // Update an existing note
  const handleUpdateNote = async () => {
    if (!user?.user_id || !user?.baby?.id || !editingNoteId) return;
    if (!noteTitle.trim() || !noteContent.trim()) {
      setNoteError('Please fill in both title and content');
      return;
    }
    
    setNotesLoading(true);
    setNoteError(null);
    
    try {
      const { data } = await babiesApi.updateNote(user.baby.id, editingNoteId, user.user_id, {
        title: noteTitle.trim(),
        content: noteContent.trim(),
      });
      setNotes(notes.map(n => n.id === editingNoteId ? data : n));
      setNoteTitle('');
      setNoteContent('');
      setEditingNoteId(null);
    } catch (err) {
      console.error('Failed to update note:', err);
      setNoteError('Failed to update note');
    } finally {
      setNotesLoading(false);
    }
  };

  // Delete a note
  const handleDeleteNote = async (noteId: number) => {
    if (!user?.user_id || !user?.baby?.id) return;
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    setNotesLoading(true);
    
    try {
      await babiesApi.deleteNote(user.baby.id, noteId, user.user_id);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    } finally {
      setNotesLoading(false);
    }
  };

  // Start editing a note
  const startEditingNote = (note: BabyNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsAddingNote(false);
    setNoteError(null);
  };

  // Cancel editing/adding
  const cancelNoteForm = () => {
    setIsAddingNote(false);
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteError(null);
  };

  // Check push notification status when user loads
  const checkPushStatus = useCallback(async () => {
    if (!user?.user_id) return;
    
    try {
      const [vapidResponse, statusResponse] = await Promise.all([
        fetchVapidKey(),
        fetchPushStatus(user.user_id),
      ]);
      
      setPushConfigured(vapidResponse.configured);
      setNotificationsEnabled(statusResponse.subscribed);
    } catch (err) {
      console.error('Failed to check push status:', err);
    }
  }, [user?.user_id]);

  useEffect(() => {
    if (user?.user_id) {
      checkPushStatus();
    }
  }, [user?.user_id, checkPushStatus]);

  // Handle push notification toggle
  const handlePushToggle = async (enabled: boolean) => {
    if (!user?.user_id || pushLoading) return;
    
    setPushLoading(true);
    setPushError(null);

    try {
      if (enabled) {
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
          setPushError('Please allow notifications in your browser settings');
          setPushLoading(false);
          return;
        }

        const vapidResponse = await fetchVapidKey();
        if (!vapidResponse.public_key) {
          setPushError('Push notifications not configured on server');
          setPushLoading(false);
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidResponse.public_key),
        });

        const subscriptionJson = subscription.toJSON();
        await subscribeToPush(user.user_id, {
          endpoint: subscriptionJson.endpoint!,
          keys: {
            p256dh: subscriptionJson.keys!.p256dh,
            auth: subscriptionJson.keys!.auth,
          },
        });

        setNotificationsEnabled(true);
      } else {
        await unsubscribeFromPush(user.user_id);
        setNotificationsEnabled(false);
      }
    } catch (err) {
      console.error('Failed to toggle push notifications:', err);
      setPushError('Failed to update notification settings');
    } finally {
      setPushLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (!user) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data } = await authApi.changePassword({
        user_id: user.user_id,
        old_password: currentPassword,
        new_password: newPassword,
      });

      if (data.password_changed) {
        setSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        setTimeout(() => {
          setIsChangePasswordOpen(false);
          setSuccess(null);
        }, PASSWORD_SUCCESS_TIMEOUT_MS);
      } else {
        setError('Failed to update password.');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;

      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        const firstError = detail[0];
        const fieldName = firstError.loc?.[1] || 'Field';
        setError(`${fieldName}: ${firstError.msg}`);
      } else {
        setError('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const babyAge = user?.baby?.birthdate ? calculateAge(user.baby.birthdate) : null;

  return (
    <>
      {/* Header Section */}
      <section className="pt-6 px-5 pb-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="cursor-pointer rounded-full hover:bg-gray-50 transition-colors" onClick={() => setMenuOpen(true)}>
              <img className="[border:none] p-0 bg-[transparent] w-12 h-[37px] relative" alt="Menu" src="/hugeicons-menu-02.svg" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold font-[Kodchasan] text-[#000] m-0">Profile</h1>
          </div>

          <img src="/logo.svg" alt="Nappi" className="w-12 h-12" />
        </div>
      </section>

      {/* Main Content */}
      <section className="px-5 pb-8 relative z-10">
        <div className="flex flex-col gap-5">
          {/* User Info Card with Change Password */}
          {user && (
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-[#000] mb-4 font-kodchasan flex items-center gap-2">Account Information</h3>

              <div className="flex flex-col gap-3">
                <ProfileRow label="Full Name" value={`${user.first_name} ${user.last_name}`} />
                <ProfileRow label="User Name" value={user.username || 'Unknown'} />

                {/* Change Password Toggle Section */}
                <div className="border-gray-100 mt-1 pt-1">
                  <button onClick={() => setIsChangePasswordOpen(!isChangePasswordOpen)} className="w-full flex justify-between items-center py-2 text-left rounded-lg">
                    <span className="text-gray-600 text-sm hover:text-gray-900 transition-colors">Change Password</span>
                    <span className={`text-gray-400 text-xs transition-transform duration-300 ${isChangePasswordOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {isChangePasswordOpen && (
                    <div className="flex flex-col gap-3 mt-2 pl-1 pr-1 pb-1" style={{ animation: 'slideDown 0.3s ease-out' }}>
                      {error && <div className="text-red-500 text-xs px-1">{error}</div>}
                      {success && <div className="text-green-500 text-xs px-1">{success}</div>}

                      <input
                        type="password"
                        placeholder="Current Password"
                        className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/50 transition-all placeholder:text-gray-400"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/50 transition-all placeholder:text-gray-400"
                      />
                      <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/50 transition-all placeholder:text-gray-400"
                      />

                      <button
                        onClick={handleUpdatePassword}
                        disabled={loading}
                        className={`w-full mt-2 text-white font-medium py-2.5 rounded-xl shadow-sm transition-all ${
                          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4ECDC4] hover:bg-[#3dbdb5] hover:shadow-md active:scale-[0.98]'
                        }`}
                      >
                        {loading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <style>{`
                @keyframes slideDown {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
          )}

          {/* Baby Info Card */}
          {user?.baby && (
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-[#000] mb-4 font-kodchasan flex items-center gap-2">Baby Information</h3>

              <div className="flex flex-col gap-3">
                <ProfileRow label="Name" value={`${user.baby.first_name} ${user.baby.last_name}`} />
                <ProfileRow label="Age" value={babyAge || 'Unknown'} />
                <ProfileRow label="Birthdate" value={new Date(user.baby.birthdate).toLocaleDateString()} />
              </div>
            </div>
          )}

          {/* Baby Notes Card - Multi-Note System */}
          {user?.baby && (
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#000] font-kodchasan">Notes about {user.baby.first_name}</h3>
                  <p className="text-xs text-gray-400 mt-1">Allergies, health conditions, or anything the AI should know</p>
                </div>
                {!isAddingNote && !editingNoteId && (
                  <button
                    onClick={() => { setIsAddingNote(true); setNoteError(null); }}
                    className="px-3 py-1.5 bg-[#4ECDC4] hover:bg-[#3dbdb5] text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
                  >
                    + Add Note
                  </button>
                )}
              </div>

              {/* Add/Edit Note Form */}
              {(isAddingNote || editingNoteId) && (
                <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200" style={{ animation: 'slideDown 0.3s ease-out' }}>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    {editingNoteId ? 'Edit Note' : 'Add New Note'}
                  </h4>
                  
                  {noteError && (
                    <div className="text-red-500 text-xs mb-3">{noteError}</div>
                  )}
                  
                  <input
                    type="text"
                    placeholder="Title (e.g., Allergies, Health Conditions)"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    maxLength={NOTE_TITLE_MAX_LENGTH}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/50 transition-all placeholder:text-gray-400 mb-3"
                  />
                  
                  <textarea
                    placeholder="Content (e.g., Lactose intolerant, avoid dairy products...)"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[#4ECDC4]/50 resize-none placeholder:text-gray-400"
                  />
                  
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={editingNoteId ? handleUpdateNote : handleCreateNote}
                      disabled={notesLoading}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                        notesLoading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[#4ECDC4] hover:bg-[#3dbdb5] text-white shadow-sm hover:shadow-md active:scale-[0.98]'
                      }`}
                    >
                      {notesLoading ? 'Saving...' : (editingNoteId ? 'Update' : 'Save')}
                    </button>
                    <button
                      onClick={cancelNoteForm}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Notes List */}
              {notesLoading && notes.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">Loading notes...</div>
              ) : notes.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  No notes yet. Add your first note to help the AI understand your baby better.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-800 text-sm truncate">{note.title}</h4>
                          <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap break-words">
                            {note.content}
                          </p>
                          {note.updated_at && (
                            <p className="text-xs text-gray-400 mt-2">
                              Updated: {new Date(note.updated_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEditingNote(note)}
                            className="p-1.5 text-gray-400 hover:text-[#4ECDC4] hover:bg-[#4ECDC4]/10 rounded-lg transition-all"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-[#000] mb-4 font-kodchasan flex items-center gap-2">Settings</h3>

            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <p className="m-0 font-medium text-gray-700">Push Notifications</p>
                <p className="m-0 mt-1 text-xs text-gray-400">
                  {!pushConfigured 
                    ? 'Not configured on server'
                    : notificationsEnabled 
                    ? 'Enabled - get alerts when baby wakes up'
                    : 'Disabled - tap to enable alerts'}
                </p>
                {pushError && (
                  <p className="m-0 mt-1 text-xs text-red-500">{pushError}</p>
                )}
              </div>
              <ToggleSwitch 
                enabled={notificationsEnabled} 
                onChange={handlePushToggle}
                disabled={pushLoading || !pushConfigured}
              />
            </div>
            
            {pushLoading && (
              <p className="text-xs text-gray-400 mt-2">Updating notification settings...</p>
            )}
          </div>

          {/* App Info */}
        </div>
      </section>
    </>
  );
};

const ProfileRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
    <span className="text-gray-600 text-sm">{label}</span>
    <span className="text-[#000] font-medium text-sm">{value}</span>
  </div>
);

const ToggleSwitch: React.FC<{
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}> = ({ enabled, onChange, disabled }) => (
  <button
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`w-[50px] h-7 rounded-full border-none relative transition-all ${enabled ? 'bg-green-500' : 'bg-gray-300'} ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    }`}
  >
    <div className={`w-[22px] h-[22px] rounded-full bg-white absolute top-[3px] transition-all shadow-md ${enabled ? 'left-[25px]' : 'left-[3px]'}`} />
  </button>
);

export default UserProfile;
