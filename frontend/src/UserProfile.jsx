import { useState } from 'react';
import { useAppContext } from './AppContext';
import './UserProfile.css';

function UserProfile() {
  const { currentUser, users, createUser, switchUser } = useAppContext();
  const [isCreating, setIsCreating] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const handleCreateUser = () => {
    if (newUsername.trim()) {
      createUser(newUsername.trim());
      setNewUsername('');
      setIsCreating(false);
    }
  };

  const handleUserChange = (e) => {
    const userId = e.target.value;
    if (userId === '__new__') {
      setIsCreating(true);
    } else {
      switchUser(userId);
    }
  };

  return (
    <div className="user-profile">
      <label htmlFor="user-select">Profile:</label>
      <select 
        id="user-select"
        value={currentUser?.userId || 'guest'}
        onChange={handleUserChange}
        className="user-select"
      >
        {users.map(user => (
          <option key={user.userId} value={user.userId}>
            {user.username}
          </option>
        ))}
        <option value="__new__">+ Create New User</option>
      </select>

      {isCreating && (
        <div className="create-user-modal">
          <div className="modal-content">
            <h3>Create New User</h3>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter username"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={handleCreateUser}>Create</button>
              <button onClick={() => {
                setIsCreating(false);
                setNewUsername('');
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
