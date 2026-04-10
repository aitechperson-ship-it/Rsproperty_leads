import { NavLink } from 'react-router-dom';
import { FiHome, FiUsers, FiPieChart, FiLogOut } from 'react-icons/fi';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Sidebar = ({ role }) => {
  const { logout } = useContext(AuthContext);

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
        <img src="/logo.png" alt="RS Properties" style={{ maxHeight: '50px', width: 'auto' }} />
      </div>

      <div className="nav-links">
        <NavLink to={role === 'Admin' ? '/admin' : '/team'} end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FiHome /> Dashboard
        </NavLink>
        
        {role === 'Admin' && (
          <>
            <NavLink to="/admin/leads" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FiUsers /> All Leads
            </NavLink>
            <NavLink to="/admin/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FiPieChart /> Reports
            </NavLink>
          </>
        )}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div className="nav-link" onClick={logout}>
          <FiLogOut /> Logout
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
