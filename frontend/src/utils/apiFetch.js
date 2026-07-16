/**
 * Hàm helper apiFetch tự động đính kèm JWT Token và xử lý logout khi Token hết hạn (401)
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  
  // Thiết lập headers mặc định
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Đính kèm token Bearer nếu tồn tại
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, fetchOptions);

    // Xử lý khi Token hết hạn hoặc không hợp lệ (401 Unauthorized)
    if (response.status === 401) {
      console.warn('Phiên đăng nhập đã hết hạn. Đang đăng xuất...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Phát ra sự kiện custom để các component React cập nhật trạng thái ngay lập tức
      window.dispatchEvent(new Event('auth-expired'));
      
      throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Yêu cầu API thất bại');
      }
      return data;
    } else {
      if (!response.ok) {
        throw new Error('Yêu cầu API thất bại');
      }
      return response.text();
    }
  } catch (error) {
    console.error('Lỗi khi gọi apiFetch:', error.message);
    throw error;
  }
}

/**
 * Hàm gửi log hành vi người dùng lên server
 */
export async function logUserAction(actionType, productId = null, searchQuery = null) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return; // Chỉ log khi đã đăng nhập
    
    await apiFetch('http://localhost:3000/api/user-actions/log', {
      method: 'POST',
      body: JSON.stringify({ actionType, productId, searchQuery })
    });
  } catch (err) {
    console.error('Lỗi khi ghi log hành vi:', err);
  }
}
