import { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import Sidebar from '../components/Sidebar';
import Topnav from '../components/Topnav';
import LeadTable from '../components/LeadTable';
import { FiDownload, FiPlus } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ totalLeads: 0, converted: 0, pending: 0, siteVisits: 0 });
  const [teamStats, setTeamStats] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [newLead, setNewLead] = useState({ customer_name: '', contact_info: '', property_interest: '', assigned_to: '', source: 'Website' });

  const fetchLeadsAndStats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const [leadsRes, statsRes, usersRes, teamStatsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/leads`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/leads/stats`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/users`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/leads/team-stats`, config)
      ]);
      setLeads(leadsRes.data);
      setStats(statsRes.data);
      setTeamMembers(usersRes.data);
      setTeamStats(teamStatsRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLeadsAndStats();

    if (socket) {
      socket.on('SERVER:LEAD_UPDATED', (updatedLead) => {
        setLeads(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
        fetchLeadsAndStats(); // Refresh stats easily
      });
      socket.on('SERVER:LEAD_CREATED', (newLead) => {
        setLeads(prev => [newLead, ...prev]);
        fetchLeadsAndStats();
      });
      socket.on('SERVER:LEAD_DELETED', (deletedLeadId) => {
        setLeads(prev => prev.filter(l => l._id !== deletedLeadId));
        fetchLeadsAndStats();
      });
    }

    return () => {
      if (socket) {
        socket.off('SERVER:LEAD_UPDATED');
        socket.off('SERVER:LEAD_CREATED');
        socket.off('SERVER:LEAD_DELETED');
      }
    };
  }, [socket]);

  const handleExport = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` }, responseType: 'blob' };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leads/export`, config);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'leads.csv');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    }
  }

  const handleAddLead = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${import.meta.env.VITE_API_URL}/api/leads`, newLead, config);
      setShowAddModal(false);
      setNewLead({ customer_name: '', contact_info: '', property_interest: '', assigned_to: '', source: 'Website' });
    } catch (err) {
      alert("Failed to add lead");
    }
  };

  const chartData = {
    labels: ['Converted', 'Pending', 'Site Visits'],
    datasets: [
      {
        label: 'Lead Status Overview',
        data: [stats.converted, stats.pending, stats.siteVisits],
        backgroundColor: ['rgba(34, 197, 94, 0.6)', 'rgba(234, 179, 8, 0.6)', 'rgba(59, 130, 246, 0.6)'],
      },
    ],
  };

  return (
    <div className="app-layout">
      <Sidebar role="Admin" />
      <div className="main-content">
        <Topnav />
        <div className="dashboard-container">

          <div className="dashboard-header-block">
            <div>
              <h1 style={{ marginBottom: '5px' }}>Admin Dashboard</h1>
              <p style={{ color: 'var(--text-muted)' }}>Welcome back, overseeing {stats.totalLeads} total leads.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={handleExport}><FiDownload /> Export CSV</button>
              <button className="btn" onClick={() => setShowAddModal(true)}><FiPlus /> Add Lead</button>
            </div>
          </div>

          {/* Dynamic Content Rendering based on path */}
          {location.pathname === '/admin/leads' ? (
            <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
              <h3 style={{ marginBottom: '20px' }}>All Company Leads</h3>
              <LeadTable leads={leads} role="Admin" onLeadUpdated={fetchLeadsAndStats} />
            </div>
          ) : location.pathname === '/admin/reports' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-title">Total Leads</div>
                  <div className="stat-value">{stats.totalLeads}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Converted</div>
                  <div className="stat-value" style={{ color: '#16a34a' }}>{stats.converted}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Pending Action</div>
                  <div className="stat-value" style={{ color: '#ca8a04' }}>{stats.pending}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Site Visits</div>
                  <div className="stat-value" style={{ color: '#2563eb' }}>{stats.siteVisits}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)', width: '100%' }}>
                  <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Total Pipeline Health</h3>
                  <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                </div>
                <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)', overflowX: 'auto' }}>
                  <h3 style={{ marginBottom: '20px' }}>Team Member Performance</h3>
                  <table className="lead-table">
                    <thead>
                      <tr>
                        <th>MEMBER</th>
                        <th>TOTAL ASSIGNED</th>
                        <th>CLOSED</th>
                        <th>REJECTED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamStats.map(member => (
                        <tr key={member._id}>
                          <td style={{ fontWeight: 500 }}>{member.name}</td>
                          <td>{member.totalAssigned}</td>
                          <td style={{ color: '#16a34a' }}>{member.closed}</td>
                          <td style={{ color: '#dc2626' }}>{member.rejected}</td>
                        </tr>
                      ))}
                      {teamStats.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No team performance data yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-title">Total Leads</div>
                  <div className="stat-value">{stats.totalLeads}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Converted</div>
                  <div className="stat-value" style={{ color: '#16a34a' }}>{stats.converted}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Pending Action</div>
                  <div className="stat-value" style={{ color: '#ca8a04' }}>{stats.pending}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Site Visits</div>
                  <div className="stat-value" style={{ color: '#2563eb' }}>{stats.siteVisits}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                  <h3 style={{ marginBottom: '20px' }}>Recent Leads</h3>
                  <LeadTable leads={leads.slice(0, 5)} role="Admin" onLeadUpdated={fetchLeadsAndStats} />
                </div>
                <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                  <h3 style={{ marginBottom: '20px' }}>Status Distribution</h3>
                  <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                </div>
              </div>
            </>
          )}


        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Lead</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddLead}>
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input type="text" className="form-input" required value={newLead.customer_name} onChange={e => setNewLead({ ...newLead, customer_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Info (Phone/Email)</label>
                <input type="text" className="form-input" required value={newLead.contact_info} onChange={e => setNewLead({ ...newLead, contact_info: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Property Interest</label>
                <input type="text" className="form-input" value={newLead.property_interest} onChange={e => setNewLead({ ...newLead, property_interest: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Assign To</label>
                <select className="form-select" value={newLead.assigned_to} onChange={e => setNewLead({ ...newLead, assigned_to: e.target.value })}>
                  <option value="">-- Unassigned --</option>
                  {teamMembers.map(tm => (
                    <option key={tm._id} value={tm._id}>{tm.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn">Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
