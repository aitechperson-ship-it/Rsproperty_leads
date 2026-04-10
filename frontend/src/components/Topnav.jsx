import { useContext, useState } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { FiMoon, FiSun, FiSearch, FiEdit2 } from 'react-icons/fi';

const Topnav = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user, updateProfile } = useContext(AuthContext);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');

  const handleSaveProfile = () => {
     updateProfile(editedName);
     setIsEditingMode(false);
  };

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-muted)' }}>
        <FiSearch />
        <span className="mobile-hidden" style={{ fontSize: '0.9rem' }}>Search leads...</span>
      </div>

      <div className="auth-buttons">
        <button className="icon-btn" onClick={toggleTheme}>
          {theme === 'light' ? <FiMoon /> : <FiSun />}
        </button>
        
        <div className="profile-widget">
          <div className="profile-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
             {isEditingMode ? (
                <div style={{ display: 'flex', gap: '5px' }}>
                   <input type="text" value={editedName} onChange={e => setEditedName(e.target.value)} style={{ padding: '2px', width: '100px' }} autoFocus />
                   <button onClick={handleSaveProfile} style={{ cursor: 'pointer', padding: '2px 5px' }}>Save</button>
                </div>
             ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                   <span>{user?.name}</span>
                   <FiEdit2 style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsEditingMode(true)} />
                </div>
             )}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topnav;
