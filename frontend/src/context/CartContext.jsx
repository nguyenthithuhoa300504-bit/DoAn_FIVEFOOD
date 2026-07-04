import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [loading, setLoading] = useState(false);

  // 1. Đồng bộ và tải giỏ hàng ban đầu
  useEffect(() => {
    if (token) {
      fetchCartFromServer();
    } else {
      // Nếu chưa đăng nhập -> Đọc từ localStorage
      const localCart = JSON.parse(localStorage.getItem('local_cart')) || [];
      setCart(localCart);
    }
  }, [token]);

  // 2. Tải giỏ hàng từ API Backend
  const fetchCartFromServer = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/cart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      } else if (res.status === 401) {
        logout();
      }
    } catch (err) {
      console.error('Không thể kết nối đến server để tải giỏ hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Đăng ký tài khoản mới
  const registerUser = async (fullName, email, phone, password) => {
    try {
      const res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đăng ký thất bại');
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // 4. Đăng nhập + Đồng bộ hóa giỏ hàng
  const loginUser = async (email, password) => {
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đăng nhập thất bại');

      // Lưu Token và Thông tin User
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.accessToken);
      setUser(data.user);

      // --- ĐỒNG BỘ GIỎ HÀNG LAI (HYBRID CART SYNC) ---
      const localCart = JSON.parse(localStorage.getItem('local_cart')) || [];
      if (localCart.length > 0) {
        const syncRes = await fetch('http://localhost:3000/api/cart/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.accessToken}`
          },
          body: JSON.stringify({
            items: localCart.map(item => ({
              productId: item.ProductID,
              quantity: item.Quantity
            }))
          })
        });
        if (syncRes.ok) {
          const syncedCart = await syncRes.json();
          setCart(syncedCart);
          // Làm sạch giỏ hàng cục bộ
          localStorage.removeItem('local_cart');
        }
      }

      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // 5. Đăng xuất
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('local_cart');
    setToken('');
    setUser(null);
    setCart([]);
  };

  // 6. Thêm/Cập nhật số lượng sản phẩm
  const addToCart = async (product, quantity) => {
    if (token) {
      // Đã đăng nhập -> Gửi request lên API Backend
      try {
        const res = await fetch('http://localhost:3000/api/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productId: product.ProductID,
            quantity: quantity
          })
        });
        if (res.ok) {
          const data = await res.json();
          setCart(data);
        }
      } catch (err) {
        console.error('Lỗi khi thêm giỏ hàng lên server:', err);
      }
    } else {
      // Chưa đăng nhập -> Lưu trữ vào localStorage
      const localCart = JSON.parse(localStorage.getItem('local_cart')) || [];
      const existingIndex = localCart.findIndex(item => item.ProductID === product.ProductID);

      if (existingIndex > 0 || existingIndex === 0) {
        localCart[existingIndex].Quantity += quantity;
        if (localCart[existingIndex].Quantity <= 0) {
          localCart.splice(existingIndex, 1);
        }
      } else {
        if (quantity > 0) {
          localCart.push({
            ProductID: product.ProductID,
            ProductName: product.ProductName,
            Price: product.Price,
            ImageURL: product.ImageURL,
            Inventory: product.Inventory,
            Quantity: quantity
          });
        }
      }

      localStorage.setItem('local_cart', JSON.stringify(localCart));
      setCart([...localCart]);
    }
  };

  // 7. Xóa hẳn sản phẩm khỏi giỏ hàng
  const removeFromCart = async (productId) => {
    if (token) {
      try {
        const res = await fetch(`http://localhost:3000/api/cart/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setCart(data);
        }
      } catch (err) {
        console.error('Lỗi khi xóa giỏ hàng trên server:', err);
      }
    } else {
      const localCart = JSON.parse(localStorage.getItem('local_cart')) || [];
      const updatedCart = localCart.filter(item => item.ProductID !== productId);
      localStorage.setItem('local_cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      user,
      isLoggedIn: !!token,
      registerUser,
      loginUser,
      logout,
      addToCart,
      removeFromCart,
      fetchCartFromServer
    }}>
      {children}
    </CartContext.Provider>
  );
};
