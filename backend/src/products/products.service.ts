import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';

@Injectable()
export class ProductsService {
  constructor(private dbService: DatabaseService) {}

  // =========================================================================
  // 1. NGHIỆP VỤ DANH MỤC (CATEGORIES)
  // =========================================================================

  /**
   * Lấy danh sách toàn bộ danh mục sản phẩm
   */
  async getCategories() {
    const result = await this.dbService.query('SELECT * FROM Categories ORDER BY CategoryName ASC');
    return result.recordset;
  }

  /**
   * Lấy chi tiết danh mục theo ID
   */
  async getCategoryById(id: number) {
    const result = await this.dbService.query(
      'SELECT * FROM Categories WHERE CategoryID = @CategoryID',
      [{ name: 'CategoryID', type: sql.Int, value: id }]
    );
    return result.recordset[0] || null;
  }

  /**
   * Tạo danh mục mới (Chỉ dành cho Admin)
   */
  async createCategory(categoryName: string, description: string, imageUrl?: string) {
    const result = await this.dbService.query(
      `INSERT INTO Categories (CategoryName, Description, ImageURL) 
       OUTPUT inserted.* 
       VALUES (@CategoryName, @Description, @ImageURL)`,
      [
        { name: 'CategoryName', type: sql.NVarChar(100), value: categoryName },
        { name: 'Description', type: sql.NVarChar(255), value: description },
        { name: 'ImageURL', type: sql.VarChar(255), value: imageUrl || null }
      ]
    );
    return result.recordset[0];
  }

  /**
   * Cập nhật thông tin danh mục (Chỉ dành cho Admin)
   */
  async updateCategory(id: number, categoryName: string, description: string, imageUrl?: string) {
    const result = await this.dbService.query(
      `UPDATE Categories 
       SET CategoryName = @CategoryName, Description = @Description, ImageURL = @ImageURL 
       OUTPUT inserted.* 
       WHERE CategoryID = @CategoryID`,
      [
        { name: 'CategoryID', type: sql.Int, value: id },
        { name: 'CategoryName', type: sql.NVarChar(100), value: categoryName },
        { name: 'Description', type: sql.NVarChar(255), value: description },
        { name: 'ImageURL', type: sql.VarChar(255), value: imageUrl || null }
      ]
    );
    return result.recordset[0] || null;
  }

  // =========================================================================
  // 2. NGHIỆP VỤ MÓN ĂN / SẢN PHẨM (PRODUCTS)
  // =========================================================================

  /**
   * Lấy danh sách món ăn đang hoạt động (Public) có tìm kiếm, lọc danh mục, phân trang
   */
  async getProducts(search?: string, categoryId?: number, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    
    let queryStr = `
      SELECT p.*, c.CategoryName, COUNT(*) OVER() as TotalCount,
             ISNULL((
                SELECT SUM(od.Quantity) 
                FROM OrderDetails od 
                INNER JOIN Orders o ON od.OrderID = o.OrderID 
                WHERE od.ProductID = p.ProductID AND o.Status <> N'Đã hủy'
             ), 0) AS SoldCount,
             ISNULL((SELECT AVG(CAST(Rating AS FLOAT)) FROM Reviews WHERE ProductID = p.ProductID AND IsHidden = 0), 0) AS AverageRating,
             ISNULL((SELECT COUNT(ReviewID) FROM Reviews WHERE ProductID = p.ProductID AND IsHidden = 0), 0) AS ReviewCount
      FROM Products p
      INNER JOIN Categories c ON p.CategoryID = c.CategoryID
      WHERE p.IsActive = 1
    `;
    
    const params: { name: string; type: any; value: any }[] = [];

    if (search) {
      queryStr += ` AND p.ProductName LIKE @Search`;
      params.push({ name: 'Search', type: sql.NVarChar(150), value: `%${search}%` });
    }

    if (categoryId) {
      queryStr += ` AND p.CategoryID = @CategoryID`;
      params.push({ name: 'CategoryID', type: sql.Int, value: categoryId });
    }

    queryStr += `
      ORDER BY p.ProductID DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
    `;
    
    params.push({ name: 'Offset', type: sql.Int, value: offset });
    params.push({ name: 'Limit', type: sql.Int, value: limit });

    const result = await this.dbService.query(queryStr, params);
    
    const products = result.recordset;
    const totalCount = products.length > 0 ? products[0].TotalCount : 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      products,
      pagination: {
        totalItems: totalCount,
        totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    };
  }

  /**
   * Lấy chi tiết món ăn theo ID (Public)
   */
  async getProductById(id: number) {
    const result = await this.dbService.query(
      `SELECT p.*, c.CategoryName,
              ISNULL((SELECT AVG(CAST(Rating AS FLOAT)) FROM Reviews WHERE ProductID = p.ProductID AND IsHidden = 0), 0) AS AverageRating,
              ISNULL((SELECT COUNT(ReviewID) FROM Reviews WHERE ProductID = p.ProductID AND IsHidden = 0), 0) AS ReviewCount
       FROM Products p 
       INNER JOIN Categories c ON p.CategoryID = c.CategoryID 
       WHERE p.ProductID = @ProductID`,
      [{ name: 'ProductID', type: sql.Int, value: id }]
    );
    return result.recordset[0] || null;
  }

  /**
   * Tạo món ăn mới (Chỉ dành cho Admin)
   */
  async createProduct(productName: string, categoryId: number, price: number, inventory: number, imageUrl: string, ingredients?: string) {
    const result = await this.dbService.query(
      `INSERT INTO Products (ProductName, CategoryID, Price, Inventory, ImageURL, Ingredients, IsActive) 
       OUTPUT inserted.* 
       VALUES (@ProductName, @CategoryID, @Price, @Inventory, @ImageURL, @Ingredients, 1)`,
      [
        { name: 'ProductName', type: sql.NVarChar(150), value: productName },
        { name: 'CategoryID', type: sql.Int, value: categoryId },
        { name: 'Price', type: sql.Decimal(18, 2), value: price },
        { name: 'Inventory', type: sql.Int, value: inventory },
        { name: 'ImageURL', type: sql.VarChar(255), value: imageUrl },
        { name: 'Ingredients', type: sql.NVarChar(500), value: ingredients || null }
      ]
    );
    return result.recordset[0];
  }

  /**
   * Cập nhật món ăn (Chỉ dành cho Admin)
   */
  async updateProduct(id: number, productName: string, categoryId: number, price: number, inventory: number, imageUrl: string, ingredients?: string) {
    const result = await this.dbService.query(
      `UPDATE Products 
       SET ProductName = @ProductName, CategoryID = @CategoryID, Price = @Price, Inventory = @Inventory, ImageURL = @ImageURL, Ingredients = @Ingredients
       OUTPUT inserted.* 
       WHERE ProductID = @ProductID`,
      [
        { name: 'ProductID', type: sql.Int, value: id },
        { name: 'ProductName', type: sql.NVarChar(150), value: productName },
        { name: 'CategoryID', type: sql.Int, value: categoryId },
        { name: 'Price', type: sql.Decimal(18, 2), value: price },
        { name: 'Inventory', type: sql.Int, value: inventory },
        { name: 'ImageURL', type: sql.VarChar(255), value: imageUrl },
        { name: 'Ingredients', type: sql.NVarChar(500), value: ingredients || null }
      ]
    );
    return result.recordset[0] || null;
  }

  /**
   * Đóng/Mở trạng thái kinh doanh của món ăn (Chỉ dành cho Admin)
   */
  async toggleProductStatus(id: number, isActive: boolean) {
    const result = await this.dbService.query(
      `UPDATE Products 
       SET IsActive = @IsActive 
       OUTPUT inserted.* 
       WHERE ProductID = @ProductID`,
      [
        { name: 'ProductID', type: sql.Int, value: id },
        { name: 'IsActive', type: sql.Bit, value: isActive }
      ]
    );
    return result.recordset[0] || null;
  }

  /**
   * Truy vấn lịch sử thay đổi giá và tồn kho sử dụng System-Versioned Temporal Tables của SQL Server 2022
   */
  async getProductHistory(id: number) {
    const result = await this.dbService.query(
      `SELECT ProductID, ProductName, Price, Inventory, IsActive, SysStartTime, SysEndTime 
       FROM Products FOR SYSTEM_TIME ALL 
       WHERE ProductID = @ProductID 
       ORDER BY SysStartTime DESC`,
      [{ name: 'ProductID', type: sql.Int, value: id }]
    );
    return result.recordset;
  }
}
