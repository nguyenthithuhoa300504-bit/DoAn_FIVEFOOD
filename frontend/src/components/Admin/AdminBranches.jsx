import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { MapPin, Plus, Edit2, Trash2, ShieldCheck, ShieldAlert, Navigation, Activity, Crown } from 'lucide-react';

const AdminBranches = ({ apiFetch, API_BASE_URL, fetchBranchesMap }) => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  
  const [formData, setFormData] = useState({
    BranchName: '',
    Latitude: '',
    Longitude: '',
    Address: '',
    CoverageRadius: 5,
    Description: '',
    IsActive: true,
    IsHeadquarters: false
  });

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`${API_BASE_URL}/branches`);
      setBranches(data || []);
      if (fetchBranchesMap) fetchBranchesMap(); // sync map
    } catch (err) {
      toast.error('Lỗi tải danh sách chi nhánh: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({
      BranchName: '',
      Latitude: '',
      Longitude: '',
      Address: '',
      CoverageRadius: 5,
      Description: '',
      IsActive: true,
      IsHeadquarters: false
    });
    setShowModal(true);
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setFormData({
      BranchName: branch.BranchName,
      Latitude: branch.Latitude,
      Longitude: branch.Longitude,
      Address: branch.Address || '',
      CoverageRadius: branch.CoverageRadius || 5,
      Description: branch.Description || '',
      IsActive: branch.IsActive,
      IsHeadquarters: branch.IsHeadquarters || false
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingBranch 
        ? `${API_BASE_URL}/branches/${editingBranch.BranchID}`
        : `${API_BASE_URL}/branches`;
        
      const method = editingBranch ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        Latitude: parseFloat(formData.Latitude),
        Longitude: parseFloat(formData.Longitude),
        CoverageRadius: parseInt(formData.CoverageRadius, 10)
      };

      await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      
      toast.success(editingBranch ? 'Cập nhật chi nhánh thành công!' : 'Thêm chi nhánh thành công!');
      setShowModal(false);
      fetchBranches();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn vô hiệu hóa chi nhánh này?')) return;
    try {
      await apiFetch(`${API_BASE_URL}/branches/${id}`, {
        method: 'DELETE'
      });
      toast.success('Đã vô hiệu hóa chi nhánh!');
      fetchBranches();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="admin-branches-container fade-in" style={{ padding: '0 10px' }}>
      
      <div className="glass-panel" style={{ 
        marginBottom: '24px', 
        padding: '24px', 
        background: 'linear-gradient(135deg, rgba(22, 28, 42, 0.95) 0%, rgba(15, 19, 29, 0.98) 100%)', 
        borderRadius: '24px', 
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MapPin size={28} color="var(--primary-color)" /> Quản Lý Chi Nhánh & Trụ Sở
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
            Thiết lập mạng lưới hoạt động và bán kính giao hàng
          </p>
        </div>
        <button 
          className="btn"
          onClick={openAddModal}
          style={{
            background: 'var(--primary-color)',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '14px',
            fontSize: '15px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(255, 122, 0, 0.3)'
          }}
        >
          <Plus size={20} /> Thêm Chi Nhánh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
          <Activity className="animate-spin" size={40} style={{ margin: '0 auto 15px auto', color: 'var(--primary-color)' }} />
          <p style={{ fontSize: '16px', fontWeight: '600' }}>Đang tải dữ liệu mạng lưới...</p>
        </div>
      ) : (
        <div className="admin-products-table-container glass-panel" style={{ 
          background: 'rgba(15, 23, 42, 0.6)', 
          borderRadius: '24px', 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <div className="table-responsive" style={{ margin: 0 }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '20px 24px', color: '#94a3b8', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>ID</th>
                  <th style={{ padding: '20px 24px', color: '#94a3b8', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Tên Chi Nhánh</th>
                  <th style={{ padding: '20px 24px', color: '#94a3b8', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Khu vực / Tọa độ</th>
                  <th style={{ padding: '20px 24px', color: '#94a3b8', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center' }}>Bán kính</th>
                  <th style={{ padding: '20px 24px', color: '#94a3b8', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ padding: '20px 24px', color: '#94a3b8', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.BranchID} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', transition: 'all 0.2s ease' }}>
                    <td style={{ padding: '20px 24px', color: '#94a3b8', fontWeight: '700' }}>#{b.BranchID}</td>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ fontWeight: '800', color: b.IsHeadquarters ? '#F59E0B' : '#f8fafc', fontSize: '15px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {b.BranchName}
                        {b.IsHeadquarters && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', textTransform: 'uppercase', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            <Crown size={12} /> Trụ Sở Chính
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>{b.Address || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--primary-color)', background: 'rgba(255,122,0,0.1)', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex' }}>
                        <Navigation size={14} /> GPS: {b.Latitude.toFixed(2)}, {b.Longitude.toFixed(2)}
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center', color: '#f8fafc', fontWeight: '700' }}>
                      {b.CoverageRadius} km
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      {b.IsActive ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <ShieldCheck size={14} /> ACTIVE
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          <ShieldAlert size={14} /> OFFLINE
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button 
                          onClick={() => openEditModal(b)} 
                          style={{ background: 'rgba(255, 179, 0, 0.15)', color: '#FFB300', border: '1px solid rgba(255, 179, 0, 0.4)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                          title="Sửa chi nhánh"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(b.BranchID)} 
                          style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.4)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                          title="Vô hiệu hóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {branches.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có dữ liệu mạng lưới chi nhánh.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="modal-content" style={{ 
            background: 'rgba(15, 23, 42, 0.6)', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            width: '100%', maxWidth: '650px', 
            borderRadius: '24px', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            color: '#f8fafc',
            overflow: 'hidden'
          }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '24px 32px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '20px', fontWeight: '800' }}>
                {editingBranch ? 'Sửa Thông Tin Chi Nhánh' : 'Khai Báo Chi Nhánh Mới'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>Tên Chi Nhánh / Bếp (Kèm icon):</label>
                  <input type="text" name="BranchName" value={formData.BranchName} onChange={handleInputChange} required 
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>Vĩ độ (Latitude):</label>
                    <input type="number" step="0.000001" name="Latitude" value={formData.Latitude} onChange={handleInputChange} required 
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#00F2FE', outline: 'none', fontWeight: 'bold' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>Kinh độ (Longitude):</label>
                    <input type="number" step="0.000001" name="Longitude" value={formData.Longitude} onChange={handleInputChange} required 
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#00F2FE', outline: 'none', fontWeight: 'bold' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>Địa chỉ hiển thị:</label>
                    <input type="text" name="Address" value={formData.Address} onChange={handleInputChange} 
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>Bán kính (km):</label>
                    <input type="number" name="CoverageRadius" value={formData.CoverageRadius} onChange={handleInputChange} required 
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#FFB300', outline: 'none', fontWeight: 'bold' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>Mô tả hoạt động:</label>
                  <textarea name="Description" value={formData.Description} onChange={handleInputChange} rows="2"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none', resize: 'none' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <input type="checkbox" name="IsActive" checked={formData.IsActive} onChange={handleInputChange} id="isActiveCheckbox" style={{ width: '20px', height: '20px', accentColor: '#10B981' }} />
                  <label htmlFor="isActiveCheckbox" style={{ margin: 0, color: '#f8fafc', fontWeight: '600', cursor: 'pointer', flex: 1 }}>Chi nhánh đang mở cửa hoạt động</label>
                  
                  <input type="checkbox" name="IsHeadquarters" checked={formData.IsHeadquarters} onChange={handleInputChange} id="isHQCheckbox" style={{ width: '20px', height: '20px', accentColor: '#F59E0B' }} />
                  <label htmlFor="isHQCheckbox" style={{ margin: 0, color: '#F59E0B', fontWeight: '600', cursor: 'pointer' }}>Đánh dấu là Trụ sở chính</label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
                <button type="button" onClick={() => setShowModal(false)} 
                  style={{ background: 'transparent', color: '#94a3b8', border: 'none', padding: '12px 24px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                  Hủy Bỏ
                </button>
                <button type="submit" 
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)' }}>
                  Lưu Dữ Liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBranches;
