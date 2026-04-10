import { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import Sidebar from '../components/Sidebar';
import Topnav from '../components/Topnav';
import LeadTable from '../components/LeadTable';
import { FiDownload, FiPlus } from 'react-icons/fi';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ totalLeads: 0, converted: 0, pending: 0, siteVisits: 0 });
  const [teamStats, setTeamStats] = useState([]);
  const [analytics, setAnalytics] = useState({ sourceDistribution: [], trendData: [] });
  const [daysFilter, setDaysFilter] = useState(30);
  const [viewMode, setViewMode] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [newLead, setNewLead] = useState({ customer_name: '', contact_info: '', property_interest: '', assigned_to: '', source: 'Website' });

  const STATUSES = ['New', 'Contacted', 'Site Visited', 'Negotiation', 'Payment Done', 'Closed / Converted'];

  const updateLeadStatus = async (id, newStatus) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`${import.meta.env.VITE_API_URL}/api/leads/${id}`, { status: newStatus }, config);
      fetchLeadsAndStats(); // Will refresh UI immediately
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const fetchLeadsAndStats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const queryStr = `?days=${daysFilter}`;
      const [leadsRes, statsRes, usersRes, teamStatsRes, analyticsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/leads${queryStr}`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/leads/stats${queryStr}`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/users`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/leads/team-stats${queryStr}`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/leads/analytics${queryStr}`, config)
      ]);
      setLeads(leadsRes.data);
      setStats(statsRes.data);
      setTeamMembers(usersRes.data);
      setTeamStats(teamStatsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLeadsAndStats();

    if (socket) {
      socket.on('SERVER:LEAD_UPDATED', (updatedLead) => {
        fetchLeadsAndStats();
      });
      socket.on('SERVER:LEAD_CREATED', (newLead) => {
        fetchLeadsAndStats();
      });
      socket.on('SERVER:LEAD_DELETED', (deletedLeadId) => {
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
  }, [socket, daysFilter]);

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

  const doughnutData = {
    labels: analytics.sourceDistribution.map(s => s._id),
    datasets: [{
      data: analytics.sourceDistribution.map(s => s.count),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#a855f7'],
    }]
  };

  const lineData = {
    labels: analytics.trendData.map(t => t._id),
    datasets: [{
      label: 'New Leads Found',
      data: analytics.trendData.map(t => t.count),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
                <select value={daysFilter} onChange={e => setDaysFilter(Number(e.target.value))} className="form-select" style={{ width: 'auto', padding: '6px 15px' }}>
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>This Quarter</option>
                  <option value={36500}>All Time</option>
                </select>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Showing {stats.totalLeads} leads.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={handleExport}><FiDownload /> Export CSV</button>
              <button className="btn" onClick={() => setShowAddModal(true)}><FiPlus /> Add Lead</button>
            </div>
          </div>

          {/* Dynamic Content Rendering based on path */}
          {location.pathname === '/admin/leads' ? (
            <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{ margin: 0 }}>All Company Leads</h3>
                <div style={{ display: 'flex' }}>
                   <button className={`btn ${viewMode === 'list' ? '' : 'btn-secondary'}`} onClick={() => setViewMode('list')} style={{ borderRadius: '8px 0 0 8px', width: '80px' }}>List</button>
                   <button className={`btn ${viewMode === 'kanban' ? '' : 'btn-secondary'}`} onClick={() => setViewMode('kanban')} style={{ borderRadius: '0 8px 8px 0', width: '80px' }}>Board</button>
                </div>
              </div>
              
              {viewMode === 'list' ? (
                 <LeadTable leads={leads} role="Admin" onLeadUpdated={fetchLeadsAndStats} />
              ) : (
                 <div className="kanban-board">
                   {STATUSES.map(status => (
                      <div key={status} className="kanban-col">
                        <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                          {status} <span className="badge" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>{leads.filter(l => l.status === status).length}</span>
                        </h4>
                        {leads.filter(l => l.status === status).map(lead => (
                           <div key={lead._id} className="kanban-card">
                             <div style={{ fontWeight: 'bold' }}>{lead.customer_name}</div>
                             <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.property_interest || 'No property specified'}</div>
                             <select className="form-select" value={lead.status} onChange={(e) => updateLeadStatus(lead._id, e.target.value)} style={{ padding: '6px', fontSize: '0.8rem', marginTop: '5px' }}>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                           </div>
                        ))}
                      </div>
                   ))}
                 </div>
              )}
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
              <div className="responsive-grid-cols-2">
                <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)', width: '100%' }}>
                  <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Total Pipeline Health</h3>
                  <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                     <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                </div>
                <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                  <h3 style={{ marginBottom: '20px' }}>Lead Generation Growth Trend</h3>
                  <div style={{ height: '300px' }}>
                     <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                </div>
              </div>
              
              <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)', width: '100%' }}>
                <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Status Distribution</h3>
                <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                   <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                </div>
              </div>

              <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)', overflowX: 'auto', width: '100%' }}>
                <h3 style={{ marginBottom: '20px' }}>Team Member Performance</h3>
                <table className="lead-table">
                  <thead>
                    <tr>
                      <th>MEMBER</th>
                      <th>ASSIGNED</th>
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

              <div className="responsive-grid-sidebar">
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
