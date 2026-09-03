import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
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
    const result = await this.dbService.query(
      'SELECT * FROM Categories ORDER BY CategoryName ASC',
    );
    return result.recordset;
  }

  /**
   * Lấy chi tiết danh mục theo ID
   */
  async getCategoryById(id: number) {
    const result = await this.dbService.query(
      'SELECT * FROM Categories WHERE CategoryID = @CategoryID',
      [{ name: 'CategoryID',  value: id }],
    );
    return result.recordset[0] || null;
  }

  /**
   * Tạo danh mục mới (Chỉ dành cho Admin)
   */
  async createCategory(
    categoryName: string,
    description: string,
    imageUrl?: string,
  ) {
    const result = await this.dbService.query(
      `INSERT INTO Categories (CategoryName, Description, ImageURL) 
       RETURNING * 
       VALUES (@CategoryName, @Description, @ImageURL)`,
      [
        { name: 'CategoryName',  value: categoryName },
        { name: 'Description',  value: description },
        { name: 'ImageURL',  value: imageUrl || null },
      ],
    );
    return result.recordset[0];
  }

  /**
   * Cập nhật thông tin danh mục (Chỉ dành cho Admin)
   */
  async updateCategory(
    id: number,
    categoryName: string,
    description: string,
    imageUrl?: string,
  ) {
    const result = await this.dbService.query(
      `UPDATE Categories 
       SET CategoryName = @CategoryName, Description = @Description, ImageURL = @ImageURL 
       RETURNING * 
       WHERE CategoryID = @CategoryID`,
      [
        { name: 'CategoryID',  value: id },
        { name: 'CategoryName',  value: categoryName },
        { name: 'Description',  value: description },
        { name: 'ImageURL',  value: imageUrl || null },
      ],
    );
    return result.recordset[0] || null;
  }

  // =========================================================================
  // 2. NGHIỆP VỤ MÓN ĂN / SẢN PHẨM (PRODUCTS)
  // =========================================================================

  /**
   * Lấy danh sách món ăn đang hoạt động (Public) có tìm kiếm, lọc danh mục, phân trang
   */
  async getProducts(
    search?: string,
    categoryId?: number,
    page: number = 1,
    limit: number = 10,
  ) {
    const offset = (page - 1) * limit;

    let queryStr = `
      SELECT p.*, c.CategoryName, COUNT(*) OVER() as TotalCount,
             COALESCE((
                SELECT SUM(od.Quantity) 
                FROM OrderDetails od 
                INNER JOIN Orders o ON od.OrderID = o.OrderID 
                WHERE od.ProductID = p.ProductID AND o.Status <> N'Đã hủy'
             ), 0) AS SoldCount,
             COALESCE((SELECT AVG(CAST(Rating AS FLOAT)) FROM Reviews WHERE ProductID = p.ProductID AND IsHidden = 0), 0) AS AverageRating,
             COALESCE((SELECT COUNT(ReviewID) FROM Reviews WHERE ProductID = p.ProductID AND IsHidden = 0), 0) AS ReviewCount
      FROM Products p
      INNER JOIN Categories c ON p.CategoryID = c.CategoryID
      WHERE p.IsActive = 1
    `;

    const params: { name: string; type: any; value: any }[] = [];

    if (search) {
      queryStr += ` AND p.ProductName LIKE @Search`;
      params.push({
        name: 'Search',
        
        value: `%${search}%`,
      });
    }

    if (categoryId) {
      queryStr += ` AND p.CategoryID = @CategoryID`;
      params.push({ name: 'CategoryID',  value: categoryId });
    }

    queryStr += `
      ORDER BY p.ProductID DESC
      LIMIT @ OFFSET @
    `;

    params.push({ name: 'Offset',  value: offset });
    params.push({ name: 'Limit',  value: limit });

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
        itemsPerPage: limit,
      },
    };
  }

  /**
   * Lấy chi tiết món ăn theo ID (Public)
   */
  async getProductById(id: number) {
    const result = await this.dbService.query(
      `SELECT p.*, c.CategoryName,
              COALESCE((SELECT AVG(CAST(Rating AS FLOAT)) FROM Reviews WHERE ProductID = p.ProductID AND IsHidden = 0), 0) AS AverageRating,
              COALESCE((SELECT COUNT(ReviewID) FROM Reviews WHERE ProductID = p.ProductID AND IsHidden = 0), 0) AS ReviewCount
       FROM Products p 
       INNER JOIN Categories c ON p.CategoryID = c.CategoryID 
       WHERE p.ProductID = @ProductID`,
      [{ name: 'ProductID',  value: id }],
    );
    return result.recordset[0] || null;
  }

  /**
   * Tạo món ăn mới (Chỉ dành cho Admin)
   */
  async createProduct(
    productName: string,
    categoryId: number,
    price: number,
    inventory: number,
    imageUrl: string,
    ingredients?: string,
    description?: string,
  ) {
    const result = await this.dbService.query(
      `INSERT INTO Products (ProductName, CategoryID, Price, Inventory, ImageURL, Ingredients, Description, IsActive) 
       RETURNING * 
       VALUES (@ProductName, @CategoryID, @Price, @Inventory, @ImageURL, @Ingredients, @Description, 1)`,
      [
        { name: 'ProductName',  value: productName },
        { name: 'CategoryID',  value: categoryId },
        { name: 'Price',  value: price },
        { name: 'Inventory',  value: inventory },
        { name: 'ImageURL',  value: imageUrl },
        {
          name: 'Ingredients',
          
          value: ingredients || null,
        },
        {
          name: 'Description',
          
          value: description || null,
        },
      ],
    );
    return result.recordset[0];
  }

  /**
   * Cập nhật món ăn (Chỉ dành cho Admin)
   */
  async updateProduct(
    id: number,
    productName: string,
    categoryId: number,
    price: number,
    inventory: number,
    imageUrl: string,
    ingredients?: string,
    description?: string,
  ) {
    const result = await this.dbService.query(
      `UPDATE Products 
       SET ProductName = @ProductName, CategoryID = @CategoryID, Price = @Price, Inventory = @Inventory, ImageURL = @ImageURL, Ingredients = @Ingredients, Description = @Description
       RETURNING * 
       WHERE ProductID = @ProductID`,
      [
        { name: 'ProductID',  value: id },
        { name: 'ProductName',  value: productName },
        { name: 'CategoryID',  value: categoryId },
        { name: 'Price',  value: price },
        { name: 'Inventory',  value: inventory },
        { name: 'ImageURL',  value: imageUrl },
        {
          name: 'Ingredients',
          
          value: ingredients || null,
        },
        {
          name: 'Description',
          
          value: description || null,
        },
      ],
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
       RETURNING * 
       WHERE ProductID = @ProductID`,
      [
        { name: 'ProductID',  value: id },
        { name: 'IsActive',  value: isActive },
      ],
    );
    return result.recordset[0] || null;
  }

  /**
   * Truy vấn lịch sử thay đổi giá và tồn kho sử dụng System-Versioned Temporal Tables của SQL Server 2022
   */
  async getProductHistory(id: number) {
    const result = await this.dbService.query(
      `SELECT ProductID, ProductName, Price, Inventory, IsActive, SysStartTime, SysEndTime 
       FROM (SELECT * FROM Products UNION ALL SELECT * FROM ProductsHistory) as p_all 
       WHERE ProductID = @ProductID 
       ORDER BY SysStartTime DESC`,
      [{ name: 'ProductID',  value: id }],
    );
    return result.recordset;
  }
}
