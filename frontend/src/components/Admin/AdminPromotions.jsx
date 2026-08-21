import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

function AdminPromotions({ apiFetch, API_BASE_URL }) {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    PromotionID: null,
    PromoCode: '',
    Description: '',
    DiscountPercentage: 0,
    MaxDiscountAmount: '',
    MinOrderValue: 0,
    UsageLimit: '',
    StartDate: '',
    EndDate: ''
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`${API_BASE_URL}/admin/promotions`);
      setPromotions(data);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách mã giảm giá');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      PromotionID: null,
      PromoCode: '',
      Description: '',
      DiscountPercentage: 0,
      MaxDiscountAmount: '',
      MinOrderValue: 0,
      UsageLimit: '',
      StartDate: '',
      EndDate: ''
    });
    setIsEditing(false);
  };

  const handleOpenModal = (promo = null) => {
    if (promo) {
      setFormData({
        ...promo,
        StartDate: new Date(promo.StartDate).toISOString().slice(0, 16),
        EndDate: new Date(promo.EndDate).toISOString().slice(0, 16)
      });
      setIsEditing(true);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.PromoCode || !formData.StartDate || !formData.EndDate) {
      toast.error('Vui lòng điền các trường bắt buộc');
      return;
    }

    try {
      const payload = {
        ...formData,
        DiscountPercentage: formData.DiscountPercentage ? parseFloat(formData.DiscountPercentage) : 0,
        MaxDiscountAmount: formData.MaxDiscountAmount ? parseFloat(formData.MaxDiscountAmount) : null,
        MinOrderValue: formData.MinOrderValue ? parseFloat(formData.MinOrderValue) : 0,
        UsageLimit: formData.UsageLimit ? parseInt(formData.UsageLimit, 10) : null
      };

      if (isEditing) {
        await apiFetch(`${API_BASE_URL}/admin/promotions/${formData.PromotionID}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Cập nhật mã giảm giá thành công');
      } else {
        await apiFetch(`${API_BASE_URL}/admin/promotions`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Thêm mã giảm giá thành công');
      }
      fetchPromotions();
      handleCloseModal();
    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mã giảm giá này?')) return;
    try {
      await apiFetch(`${API_BASE_URL}/admin/promotions/${id}`, { method: 'DELETE' });
      toast.success('Xóa mã giảm giá thành công');
      fetchPromotions();
    } catch (error) {
      toast.error(error.message || 'Lỗi khi xóa mã giảm giá');
    }
  };

  const now = new Date();
  const activeCount = promotions.filter(p => new Date(p.StartDate) <= now && new Date(p.EndDate) >= now && (p.UsageLimit === null || p.UsedCount < p.UsageLimit)).length;
  const expiredCount = promotions.length - activeCount;

  return (
    <div className="admin-grid fade-in">
      {/* KPI Stats section */}
      <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
        <div className="admin-stat-chip" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '15px 20px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '28px', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '10px' }}>🎟</div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng chiến dịch</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginTop: '3px' }}>{promotions.length} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal' }}>mã</span></div>
          </div>
        </div>

        <div className="admin-stat-chip" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(5, 150, 105, 0.3)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '10px' }}>🔥</div>
          <div>
            <div style={{ color: '#d1fae5', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Đang kích hoạt</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginTop: '3px' }}>{activeCount} <span style={{ fontSize: '14px', color: '#a7f3d0', fontWeight: 'normal' }}>mã</span></div>
          </div>
        </div>

        <div className="admin-stat-chip" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '10px' }}>⏳</div>
          <div>
            <div style={{ color: '#fee2e2', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hết hạn / Hết lượt</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginTop: '3px' }}>{expiredCount} <span style={{ fontSize: '14px', color: '#fca5a5', fontWeight: 'normal' }}>mã</span></div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '25px', gridColumn: '1 / -1', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#f97316' }}>Danh sách Voucher</span>
            </h2>
            <p style={{ color: '#94a3b8', margin: '5px 0 0 0', fontSize: '13px' }}>Quản lý các chương trình ưu đãi giảm giá dành cho khách hàng</p>
          </div>
          <button 
            className="action-btn" 
            onClick={() => handleOpenModal()}
            style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 'bold', background: 'linear-gradient(45deg, #f97316, #ea580c)', color: 'white', borderRadius: '25px', border: 'none', boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)', transition: 'all 0.3s', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            + TẠO MÃ MỚI
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 20px auto' }}></div>
            <p>Đang tải dữ liệu mã giảm giá...</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
            <table className="admin-table">
              <thead style={{ background: 'rgba(0,0,0,0.4)' }}>
                <tr>
                  <th style={{ padding: '15px 20px', color: '#cbd5e1' }}>Mã Voucher</th>
                  <th style={{ color: '#cbd5e1' }}>Ưu đãi</th>
                  <th style={{ color: '#cbd5e1' }}>Điều kiện</th>
                  <th style={{ color: '#cbd5e1' }}>Trạng thái</th>
                  <th style={{ color: '#cbd5e1' }}>Đã dùng</th>
                  <th style={{ color: '#cbd5e1' }}>Thời hạn</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px', color: '#cbd5e1' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map(p => {
                  const isExpired = new Date(p.EndDate) < now;
                  const isOutOfStock = p.UsageLimit !== null && p.UsedCount >= p.UsageLimit;
                  const isNotStarted = new Date(p.StartDate) > now;
                  const isActive = !isExpired && !isOutOfStock && !isNotStarted;

                  return (
                    <tr key={p.PromotionID} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '20px' }}>
                        <div style={{ display: 'inline-block', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', padding: '6px 12px', borderRadius: '8px', border: '1px dashed #f97316', fontWeight: 'bold', fontSize: '15px', letterSpacing: '1px' }}>
                          {p.PromoCode}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff' }}>Giảm {p.DiscountPercentage}%</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{p.MaxDiscountAmount ? `Tối đa ${p.MaxDiscountAmount.toLocaleString()}đ` : 'Không giới hạn tối đa'}</div>
                      </td>
                      <td>
                        <div style={{ color: '#e2e8f0' }}>Đơn từ <span style={{ color: '#10b981', fontWeight: 'bold' }}>{p.MinOrderValue.toLocaleString()}đ</span></div>
                      </td>
                      <td>
                        {isActive && <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid rgba(16, 185, 129, 0.3)' }}>ĐANG CHẠY</span>}
                        {isNotStarted && <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid rgba(59, 130, 246, 0.3)' }}>CHƯA BẮT ĐẦU</span>}
                        {isExpired && <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid rgba(239, 68, 68, 0.3)' }}>ĐÃ HẾT HẠN</span>}
                        {isOutOfStock && !isExpired && <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid rgba(245, 158, 11, 0.3)' }}>HẾT LƯỢT</span>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{p.UsedCount} <span style={{ color: '#64748b', fontWeight: 'normal' }}>/ {p.UsageLimit || '∞'}</span></div>
                        {p.UsageLimit && (
                          <div style={{ width: '100%', height: '4px', background: '#334155', borderRadius: '2px', marginTop: '5px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: (p.UsedCount / p.UsageLimit) > 0.8 ? '#ef4444' : '#10b981', width: `${Math.min(100, (p.UsedCount / p.UsageLimit) * 100)}%` }}></div>
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: '#cbd5e1' }}>{new Date(p.StartDate).toLocaleDateString('vi-VN')}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>đến {new Date(p.EndDate).toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button onClick={() => handleOpenModal(p)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} title="Sửa">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button onClick={() => handleDelete(p.PromotionID)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} title="Xóa">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {promotions.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}>🎫</div>
                      <h3 style={{ margin: 0, color: '#e2e8f0' }}>Chưa có mã giảm giá nào</h3>
                      <p style={{ color: '#94a3b8', marginTop: '10px' }}>Hãy tạo mã giảm giá đầu tiên để thu hút khách hàng!</p>
                      <button onClick={() => handleOpenModal()} style={{ marginTop: '15px', background: 'transparent', color: '#f97316', border: '1px solid #f97316', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Tạo ngay</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 100000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', padding: 0, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ background: 'linear-gradient(135deg, #f97316, #c2410c)', padding: '25px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px', display: 'flex' }}><svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg></span>
                {isEditing ? 'Cập nhật Mã Khuyến Mãi' : 'Tạo Mã Khuyến Mãi Mới'}
              </h2>
              <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '5px' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '30px', background: '#0f172a' }}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ color: '#cbd5e1', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Mã Voucher (Code) <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" name="PromoCode" value={formData.PromoCode} onChange={handleChange} required className="form-control" placeholder="VD: SIEUSALE, GIAM50K..." style={{ textTransform: 'uppercase', fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px', background: 'rgba(255,255,255,0.05)', border: '1px dashed #475569', color: '#f97316' }} />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ color: '#cbd5e1', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Mô tả chương trình</label>
                <textarea name="Description" value={formData.Description} onChange={handleChange} className="form-control" rows="2" placeholder="Hiển thị cho khách hàng biết lợi ích của mã này..." style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155' }}></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ color: '#cbd5e1', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Mức giảm (%) <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" name="DiscountPercentage" value={formData.DiscountPercentage} onChange={handleChange} required min="0" max="100" className="form-control" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', paddingRight: '40px' }} />
                    <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 'bold' }}>%</span>
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ color: '#cbd5e1', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Giảm tối đa (VNĐ)</label>
                  <input type="number" name="MaxDiscountAmount" value={formData.MaxDiscountAmount} onChange={handleChange} min="0" className="form-control" placeholder="Để trống nếu không giới hạn" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ color: '#cbd5e1', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Giá trị đơn tối thiểu (VNĐ)</label>
                  <input type="number" name="MinOrderValue" value={formData.MinOrderValue} onChange={handleChange} min="0" className="form-control" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155' }} />
                </div>
                <div className="form-group">
                  <label style={{ color: '#cbd5e1', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Số lượng phát hành</label>
                  <input type="number" name="UsageLimit" value={formData.UsageLimit} onChange={handleChange} min="1" className="form-control" placeholder="VD: 100 (để trống: vô hạn)" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155' }} />
                </div>
              </div>

              <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Thời gian áp dụng</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '5px', display: 'block' }}>Bắt đầu từ <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="datetime-local" name="StartDate" value={formData.StartDate} onChange={handleChange} required className="form-control" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '5px', display: 'block' }}>Kết thúc lúc <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="datetime-local" name="EndDate" value={formData.EndDate} onChange={handleChange} required className="form-control" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button type="button" onClick={handleCloseModal} style={{ padding: '12px 25px', background: 'transparent', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>Hủy Bỏ</button>
                <button type="submit" style={{ padding: '12px 25px', background: 'linear-gradient(45deg, #f97316, #ea580c)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)' }}>
                  {isEditing ? 'Lưu Thay Đổi' : 'Tạo Khuyến Mãi Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPromotions;
