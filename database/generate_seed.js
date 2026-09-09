const fs = require('fs');
const path = require('path');

const namesMap = {
    'banhmibi.jpg': 'Bánh Mì Bì',
    'banhmibongdem.jpg': 'Bánh Mì Bóng Đêm',
    'banhmihap.jpg': 'Bánh Mì Hấp',
    'banhmiheoquay.jpg': 'Bánh Mì Heo Quay',
    'banhmikem.jpg': 'Bánh Mì Kem',
    'banhmipate.jpg': 'Bánh Mì Pate',
    'banhmithanhlong.jpg': 'Bánh Mì Thanh Long',
    'banhmithitnuong.jpg': 'Bánh Mì Thịt Nướng',
    'banhcanhbotloc.jpg': 'Bánh Canh Bột Lọc',
    'banhcanhchaca.jpg': 'Bánh Canh Chả Cá',
    'bohue.jpg': 'Bún Bò Huế',
    'bunbo.jpg': 'Bún Bò',
    'miquang.jpg': 'Mì Quảng',
    'miquangnuoc.jpg': 'Mì Quảng Nước',
    'mivang.jpg': 'Mì Vàng',
    'miống.jpg': 'Mì Ống',
    'phobo.jpg': 'Phở Bò',
    'phochay.jpg': 'Phở Chay',
    'phochienphong.jpg': 'Phở Chiên Phồng',
    'phochua.jpg': 'Phở Chua',
    'phocuon.jpeg': 'Phở Cuốn',
    'phodacbiet.jpg': 'Phở Đặc Biệt',
    'phogaoluc.jpg': 'Phở Gạo Lứt',
    'phoheo.jpg': 'Phở Heo',
    'photron.jpg': 'Phở Trộn',
    'PizzaboTexasbeef.jpg': 'Pizza Bò Texas',
    'Pizzachay.jpg': 'Pizza Chay',
    'pizzahaisan.jpg': 'Pizza Hải Sản',
    'pizzaHAWAIIAN.jpg': 'Pizza Hawaiian',
    'PizzaMargherita.jpg': 'Pizza Margherita',
    'pizzaPEPPERONIS.jpg': 'Pizza Pepperonis',
    'pizzaphomai.jpg': 'Pizza Phô Mai',
    'pizzathapcam.jpg': 'Pizza Thập Cẩm',
    'PizzathịtGàMexico.jpg': 'Pizza Thịt Gà Mexico',
    'pizzaxucxich.jpg': 'Pizza Xúc Xích',
    'tracamnhadam.jpg': 'Trà Cam Nha Đam',
    'trachanh.jpg': 'Trà Chanh',
    'tradau.jpg': 'Trà Dâu',
    'trahoahongvietquat.jpg': 'Trà Hoa Hồng Việt Quất',
    'trahoaqua.jpg': 'Trà Hoa Quả',
    'trasuabacha.jpg': 'Trà Sữa Bạc Hà',
    'trasuacaramel.jpg': 'Trà Sữa Caramel',
    'trasuadaudo.jpg': 'Trà Sữa Đậu Đỏ',
    'trasuakhoaimon.jpg': 'Trà Sữa Khoai Môn',
    'trasuatranchauduongden.jpg': 'Trà Sữa Trân Châu Đường Đen',
    'tratao.jpg': 'Trà Táo',
    'travaihatchia.jpg': 'Trà Vải Hạt Chia'
};

const categoryMap = {
    'banhmi': 1,
    'pho': 2,
    'pizza': 3,
    'trasua': 4
};

const priceRanges = {
    'banhmi': { min: 25, max: 40 },
    'pho': { min: 40, max: 70 },
    'pizza': { min: 90, max: 200 },
    'trasua': { min: 25, max: 55 }
};

let sql = '';
sql += '-- Xóa dữ liệu cũ (TRUNCATE) để tránh trùng lặp\n';
sql += 'TRUNCATE TABLE Products, Categories CASCADE;\n\n';

sql += '-- SEED CATEGORIES\n';
sql += 'INSERT INTO Categories (CategoryID, CategoryName, Description, ImageURL) VALUES\n';
sql += "(1, 'Bánh Mì', 'Bánh mì giòn rụm với đủ loại nhân tươi ngon', '/images/danhmuc/banhmi.jpg'),\n";
sql += "(2, 'Phở & Bún', 'Tinh hoa ẩm thực Việt Nam, nước dùng đậm đà', '/images/danhmuc/pho.jpg'),\n";
sql += "(3, 'Pizza', 'Pizza đế mỏng giòn, phô mai kéo sợi thơm lừng', '/images/danhmuc/pizza.jpg'),\n";
sql += "(4, 'Trà Sữa', 'Các loại thức uống giải khát mát lạnh, trà đậm vị', '/images/danhmuc/tra.jpeg');\n\n";

sql += '-- Reset SEQUENCE để ProductID tự động tăng đúng\n';
sql += 'SELECT setval(\'categories_categoryid_seq\', 4, true);\n\n';

sql += '-- SEED PRODUCTS\n';
sql += 'INSERT INTO Products (ProductName, CategoryID, Price, Inventory, ImageURL, Ingredients, IsActive) VALUES\n';

const baseDir = path.join(process.cwd(), 'frontend', 'public', 'images');
const folders = ['banhmi', 'pho', 'pizza', 'trasua'];
let products = [];

folders.forEach(folder => {
    const dir = path.join(baseDir, folder);
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'));
        files.forEach(file => {
            let catId = categoryMap[folder];
            let name = namesMap[file] || file.replace(/\.[^/.]+$/, "");
            let price = Math.floor(Math.random() * (priceRanges[folder].max - priceRanges[folder].min + 1) + priceRanges[folder].min) * 1000;
            let imgUrl = `/images/${folder}/${file}`;
            let ingredients = 'Nguyên liệu tươi ngon, chế biến đậm đà, đảm bảo vệ sinh an toàn thực phẩm.';
            products.push(`('${name}', ${catId}, ${price}, 100, '${imgUrl}', '${ingredients}', true)`);
        });
    }
});

sql += products.join(',\n') + ';\n';

fs.writeFileSync('database/seed_data_postgres.sql', sql, 'utf8');
console.log('Generated database/seed_data_postgres.sql with ' + products.length + ' products.');
