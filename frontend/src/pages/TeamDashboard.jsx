import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import Sidebar from '../components/Sidebar';
import Topnav from '../components/Topnav';
import LeadTable from '../components/LeadTable';

const TeamDashboard = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const [leads, setLeads] = useState([]);

  const fetchLeads = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leads`, config);
      setLeads(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLeads();

    if (socket) {
      socket.on('SERVER:LEAD_UPDATED', (updatedLead) => {
         // Update if it belongs to this team member
         if (updatedLead.assigned_to && updatedLead.assigned_to._id === user._id) {
            setLeads(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
         }
      });
      socket.on('SERVER:LEAD_ASSIGNED', (lead) => {
         // In a real app we would check if it was assigned to ME and push to state
         fetchLeads();
      });
    }

    return () => {
      if (socket) {
        socket.off('SERVER:LEAD_UPDATED');
        socket.off('SERVER:LEAD_ASSIGNED');
      }
    };
  }, [socket, user._id]);

  return (
    <div className="app-layout">
      <Sidebar role="Team Member" />
      <div className="main-content">
        <Topnav />
        <div className="dashboard-container">
          
          <div className="dashboard-header-block">
             <div>
                <h1 style={{ marginBottom: '5px' }}>Team Dashboard</h1>
                <p style={{ color: 'var(--text-muted)' }}>Manage your assigned leads.</p>
             </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-title">My Total Leads</div>
              <div className="stat-value">{leads.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">New</div>
              <div className="stat-value" style={{ color: '#2563eb' }}>{leads.filter(l => l.status === 'New').length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">In Negotiation</div>
              <div className="stat-value" style={{ color: '#ca8a04' }}>{leads.filter(l => l.status === 'Negotiation').length}</div>
            </div>
          </div>

          <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
             <h3 style={{ marginBottom: '20px' }}>My Leads</h3>
             <LeadTable leads={leads} role="Team Member" />
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default TeamDashboard;
