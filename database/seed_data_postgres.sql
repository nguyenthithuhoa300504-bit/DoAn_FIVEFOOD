-- Xóa dữ liệu cũ (TRUNCATE) để tránh trùng lặp
TRUNCATE TABLE Products, Categories CASCADE;

-- SEED CATEGORIES
INSERT INTO Categories (CategoryID, CategoryName, Description, ImageURL) VALUES
(1, 'Bánh Mì', 'Bánh mì giòn rụm với đủ loại nhân tươi ngon', '/images/danhmuc/banhmi.jpg'),
(2, 'Phở & Bún', 'Tinh hoa ẩm thực Việt Nam, nước dùng đậm đà', '/images/danhmuc/pho.jpg'),
(3, 'Pizza', 'Pizza đế mỏng giòn, phô mai kéo sợi thơm lừng', '/images/danhmuc/pizza.jpg'),
(4, 'Trà Sữa', 'Các loại thức uống giải khát mát lạnh, trà đậm vị', '/images/danhmuc/tra.jpeg');

-- Reset SEQUENCE để ProductID tự động tăng đúng
SELECT setval('categories_categoryid_seq', 4, true);

-- SEED PRODUCTS
INSERT INTO Products (ProductName, CategoryID, Price, Inventory, ImageURL, Ingredients, IsActive) VALUES
('Bánh Mì Bì', 1, 37000, 100, '/images/banhmi/banhmibi.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Bánh Mì Bóng Đêm', 1, 38000, 100, '/images/banhmi/banhmibongdem.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Bánh Mì Hấp', 1, 27000, 100, '/images/banhmi/banhmihap.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Bánh Mì Heo Quay', 1, 40000, 100, '/images/banhmi/banhmiheoquay.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Bánh Mì Kem', 1, 32000, 100, '/images/banhmi/banhmikem.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Bánh Mì Pate', 1, 27000, 100, '/images/banhmi/banhmipate.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Bánh Mì Thanh Long', 1, 39000, 100, '/images/banhmi/banhmithanhlong.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Bánh Mì Thịt Nướng', 1, 39000, 100, '/images/banhmi/banhmithitnuong.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Bánh Canh Bột Lọc', 2, 49000, 100, '/images/pho/banhcanhbotloc.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Bánh Canh Chả Cá', 2, 66000, 100, '/images/pho/banhcanhchaca.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Bún Bò Huế', 2, 65000, 100, '/images/pho/bohue.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Bún Bò', 2, 59000, 100, '/images/pho/bunbo.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Mì Quảng', 2, 70000, 100, '/images/pho/miquang.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Mì Quảng Nước', 2, 43000, 100, '/images/pho/miquangnuoc.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Mì Vàng', 2, 57000, 100, '/images/pho/mivang.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('miêng', 2, 57000, 100, '/images/pho/miêng.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Phở Bò', 2, 45000, 100, '/images/pho/phobo.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Phở Chay', 2, 58000, 100, '/images/pho/phochay.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Phở Chiên Phồng', 2, 64000, 100, '/images/pho/phochienphong.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Phở Chua', 2, 42000, 100, '/images/pho/phochua.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Phở Cuốn', 2, 40000, 100, '/images/pho/phocuon.jpeg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Phở Đặc Biệt', 2, 49000, 100, '/images/pho/phodacbiet.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Phở Gạo Lứt', 2, 57000, 100, '/images/pho/phogaoluc.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Phở Heo', 2, 51000, 100, '/images/pho/phoheo.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Phở Trộn', 2, 63000, 100, '/images/pho/photron.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Pizza Bò Texas', 3, 100000, 100, '/images/pizza/PizzaboTexasbeef.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Pizza Chay', 3, 108000, 100, '/images/pizza/Pizzachay.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Pizza Hải Sản', 3, 199000, 100, '/images/pizza/pizzahaisan.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Pizza Hawaiian', 3, 191000, 100, '/images/pizza/pizzaHAWAIIAN.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Pizza Margherita', 3, 135000, 100, '/images/pizza/PizzaMargherita.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Pizza Pepperonis', 3, 133000, 100, '/images/pizza/pizzaPEPPERONIS.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Pizza Phô Mai', 3, 139000, 100, '/images/pizza/pizzaphomai.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Pizza Thập Cẩm', 3, 149000, 100, '/images/pizza/pizzathapcam.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('PizzathịtgàMexico', 3, 90000, 100, '/images/pizza/PizzathịtgàMexico.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Pizza Xúc Xích', 3, 178000, 100, '/images/pizza/pizzaxucxich.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Cam Nha Đam', 4, 47000, 100, '/images/trasua/tracamnhadam.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Chanh', 4, 28000, 100, '/images/trasua/trachanh.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Dâu', 4, 43000, 100, '/images/trasua/tradau.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Hoa Hồng Việt Quất', 4, 48000, 100, '/images/trasua/trahoahongvietquat.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Hoa Quả', 4, 44000, 100, '/images/trasua/trahoaqua.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Sữa Bạc Hà', 4, 39000, 100, '/images/trasua/trasuabacha.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Sữa Caramel', 4, 37000, 100, '/images/trasua/trasuacaramel.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Sữa Đậu Đỏ', 4, 53000, 100, '/images/trasua/trasuadaudo.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Sữa Khoai Môn', 4, 30000, 100, '/images/trasua/trasuakhoaimon.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Sữa Trân Châu Đường Đen', 4, 25000, 100, '/images/trasua/trasuatranchauduongden.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Táo', 4, 51000, 100, '/images/trasua/tratao.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true),
('Trà Vải Hạt Chia', 4, 49000, 100, '/images/trasua/travaihatchia.jpg', 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.', true);
