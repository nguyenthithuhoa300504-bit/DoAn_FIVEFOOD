import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { loginUser, logout } = useCart();
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsLoading(true);

    const res = await loginUser(email, password);
    setIsLoading(false);

    if (res.success) {
      // Kiểm tra vai trò ngay lập tức sau khi có token
      const loggedInUser = JSON.parse(localStorage.getItem('user'));
      if (loggedInUser?.role !== 'Admin') {
        logout(); // Tự động đăng xuất nếu cố tình dùng tài khoản khách
        setAuthError('Cảnh báo Bảo Mật: Tài khoản này không thuộc ban Quản trị (Role: Admin). Quyền truy cập bị từ chối!');
        toast.error('Không có quyền truy cập Quản trị!');
        return;
      }

      setAuthSuccess('Xác thực Admin thành công! Đang vào Trang Quản Trị...');
      toast.success('Xin chào Quản trị viên!');
      setTimeout(() => {
        navigate('/admin/dashboard', { replace: true });
      }, 1000);
    } else {
      setAuthError(res.message || 'Email hoặc mật khẩu không chính xác');
      toast.error('Đăng nhập quản trị thất bại');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '85vh',
      background: 'radial-gradient(circle at center, #1f1f2e 0%, #0d0d12 100%)',
      padding: '20px',
      color: '#fff',
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(25, 25, 38, 0.8)',
        border: '1px solid rgba(255, 179, 0, 0.3)',
        borderRadius: '16px',
        padding: '40px 32px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        backdropFilter: 'blur(12px)',
        position: 'relative'
      }}>
        {/* Nút trở về trang chủ khách hàng */}
        <button 
          onClick={() => navigate('/')}
          style={{ 
            position: 'absolute', 
            top: '16px', 
            right: '16px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            padding: '6px 12px',
            borderRadius: '6px',
            color: '#bbb',
            fontSize: '13px',
            cursor: 'pointer',
            transition: '0.2s'
          }}
          title="Về Cửa Hàng"
        >
          🏠 Về Cửa Hàng
        </button>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px', display: 'inline-block' }}>🛡️</div>
          <h2 style={{ color: '#ffb300', margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
            FIVESTAR FOOD
          </h2>
          <div style={{ fontSize: '14px', color: '#999', fontWeight: '500' }}>
            HỆ THỐNG QUẢN TRỊ TRUNG TÂM (ADMIN PORTAL)
          </div>
        </div>

        {authError && (
          <div style={{ 
            background: 'rgba(244, 67, 54, 0.15)', 
            border: '1px solid #f44336', 
            color: '#ff7961', 
            padding: '12px 14px', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            fontSize: '14px',
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            {authError}
          </div>
        )}
        
        {authSuccess && (
          <div style={{ 
            background: 'rgba(76, 175, 80, 0.15)', 
            border: '1px solid #4caf50', 
            color: '#81c784', 
            padding: '12px 14px', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {authSuccess}
          </div>
        )}

        <form onSubmit={handleAdminLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#ccc', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tài Khoản Quản Trị
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@fivefood.com" 
              required 
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#ccc', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Mật Khẩu Bảo Mật
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••" 
              required 
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #ffb300 0%, #f57f17 100%)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(255, 179, 0, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? '⏳ Đang kiểm tra thẩm quyền...' : '🔓 Đăng Nhập Quản Trị'}
          </button>
        </form>

        <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#777', lineHeight: '1.5' }}>
            ⚠️ <strong>Cảnh báo bảo mật:</strong> Đây là hệ thống nội bộ dành riêng cho Ban Quản Lý & Nhân Viên FIVESTAR FOOD. Mọi nỗ lực truy cập trái phép hoặc dò quét mật khẩu sẽ bị ghi nhật ký truy vết (Audit Log) theo tiêu chuẩn bảo mật.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
