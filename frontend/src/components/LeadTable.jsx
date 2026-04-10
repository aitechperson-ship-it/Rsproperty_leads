import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FiMessageSquare, FiEdit, FiClock, FiTrash2 } from 'react-icons/fi';

const LeadTable = ({ leads, role, onLeadUpdated }) => {
  const { user } = useContext(AuthContext);
  const [editingId, setEditingId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const statusOptions = ['New', 'Contacted', 'Site Visited', 'Negotiation', 'Payment Done', 'Closed / Converted'];

  const getStatusClass = (status) => {
    switch (status) {
      case 'New': return 'status-new';
      case 'Contacted': return 'status-contacted';
      case 'Site Visited': return 'status-site';
      case 'Negotiation': return 'status-negotiation';
      case 'Payment Done': return 'status-payment';
      case 'Closed / Converted': return 'status-closed';
      default: return '';
    }
  };
  
  const handleStatusChange = async (leadId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`${import.meta.env.VITE_API_URL}/api/leads/${leadId}`, { status: selectedStatus }, config);
      setEditingId(null);
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleAddNote = async (leadId) => {
    if (!noteInput.trim()) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${import.meta.env.VITE_API_URL}/api/leads/${leadId}/notes`, { text: noteInput }, config);
      setNoteInput('');
      setEditingId(null); // Close active row expansion
    } catch (err) {
      alert('Error adding note');
    }
  }

  const handleDelete = async (leadId) => {
    // Removed window.confirm because embedded browser environments frequently auto-block native javascript alerts and silently return false.
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/leads/${leadId}`, config);
      if (onLeadUpdated) {
        onLeadUpdated();
      } else {
        window.location.reload();
      }
    } catch (err) {
      alert('Error deleting lead');
    }
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Contact</th>
            <th className="mobile-hide-col">Property Interest</th>
            <th>Status</th>
            {role === 'Admin' && <th className="mobile-hide-col">Assigned To</th>}
            <th className="mobile-hide-col">Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead._id}>
              <td>
                <div style={{ fontWeight: '500', color: 'var(--text-color)' }}>{lead.customer_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Source: {lead.source}</div>
              </td>
              <td>{lead.contact_info}</td>
              <td className="mobile-hide-col">{lead.property_interest || 'N/A'}</td>
              <td>
                {editingId === lead._id ? (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <select 
                      className="form-select" 
                      value={selectedStatus} 
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      style={{ padding: '8px' }}
                    >
                      {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <button className="btn" style={{ padding: '8px 12px' }} onClick={() => handleStatusChange(lead._id)}>Save</button>
                  </div>
                ) : (
                  <span className={`badge ${getStatusClass(lead.status)}`}>{lead.status}</span>
                )}
              </td>
              {role === 'Admin' && <td className="mobile-hide-col">{lead.assigned_to ? lead.assigned_to.name : 'Unassigned'}</td>}
              <td className="mobile-hide-col">
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}>
                   <FiClock color="var(--text-muted)" />
                   {new Date(lead.updatedAt).toLocaleDateString()}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="icon-btn" title="Edit Lead" onClick={() => { setEditingId(editingId === lead._id ? null : lead._id); setSelectedStatus(lead.status); }}>
                     <FiEdit />
                  </button>
                  {role === 'Admin' && (
                    <button className="icon-btn" title="Delete Lead" onClick={() => handleDelete(lead._id)}>
                       <FiTrash2 color="#dc2626" />
                    </button>
                  )}
                </div>
                {/* Expand row for notes if editing */}
                {editingId === lead._id && (
                  <div style={{ marginTop: '10px', background: 'var(--bg-color)', padding: '10px', borderRadius: '8px' }}>
                     <h4 style={{ fontSize: '0.85rem', marginBottom: '8px' }}>Notes</h4>
                     <ul style={{ marginBottom: '10px', fontSize: '0.85rem', maxHeight: '100px', overflowY: 'auto' }}>
                        {lead.notes && lead.notes.length > 0 ? lead.notes.map((n, i) => (
                           <li key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                              <span style={{ fontWeight: '500' }}>{n.addedBy?.name || 'User'}:</span> {n.text}
                           </li>
                        )) : <li style={{ color: 'var(--text-muted)' }}>No notes yet.</li>}
                     </ul>
                     <div style={{ display: 'flex', gap: '5px' }}>
                        <input type="text" className="form-input" style={{ padding: '8px' }} placeholder="Add note..." value={noteInput} onChange={e => setNoteInput(e.target.value)} />
                        <button className="btn" style={{ padding: '8px' }} onClick={() => handleAddNote(lead._id)}><FiMessageSquare /></button>
                     </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={role === 'Admin' ? 7 : 6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No leads found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LeadTable;
