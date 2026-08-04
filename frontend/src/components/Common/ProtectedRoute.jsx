import React, { useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

/**
 * Component Bảo vệ Tuyến đường (Role-based Access Control Guard)
 * Ngăn chặn người dùng chưa đăng nhập hoặc không có vai trò phù hợp truy cập vào khu vực nhạy cảm.
 */
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isLoggedIn, user } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Kiểm tra trạng thái xác thực
  if (!isLoggedIn) {
    // Lưu lại đường dẫn cũ để sau khi log xong quay trở lại đúng trang nếu muốn
    const loginPath = requireAdmin ? '/admin/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Kiểm tra vai trò Admin / Quản trị
  if (requireAdmin && user?.role !== 'Admin') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75vh',
        textAlign: 'center',
        padding: '20px',
        color: '#fff',
        background: '#121218',
        fontFamily: "'Open Sans', sans-serif"
      }}>
        <div style={{
          background: 'rgba(255, 68, 68, 0.1)',
          border: '1px solid rgba(255, 68, 68, 0.3)',
          padding: '40px 30px',
          borderRadius: '16px',
          maxWidth: '500px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '15px' }}>🛡️</div>
          <h2 style={{ color: '#ff4d4f', fontSize: '24px', marginBottom: '10px', fontWeight: 'bold' }}>
            Từ Chối Truy Cập (403 Forbidden)
          </h2>
          <p style={{ color: '#ccc', fontSize: '15px', lineHeight: '1.6', marginBottom: '25px' }}>
            Tài khoản hiện tại (<strong style={{ color: '#f5c518' }}>{user?.fullName || user?.email}</strong>) chỉ có vai trò Khách hàng (<code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{user?.role || 'user'}</code>). <br/>
            Bạn không có thẩm quyền truy cập vào Khu vực Quản Trị Hệ Thống FIVEFOOD.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={() => navigate('/')} 
              style={{
                padding: '12px 24px',
                background: '#ffb300',
                color: '#121218',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(255, 179, 0, 0.3)'
              }}
            >
              🏠 Về Trang Chủ Cửa Hàng
            </button>
            <button 
              onClick={() => navigate('/admin/login')} 
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: '#ffb300',
                border: '1px solid #ffb300',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔑 Đổi Tài Khoản Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Nếu đủ điều kiện, cho phép hiển thị các trang bên trong
  return children;
};

export default ProtectedRoute;
