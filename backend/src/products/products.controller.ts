import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  ParseIntPipe, 
  NotFoundException,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // =========================================================================
  // 1. ENDPOINTS CÔNG KHAI (PUBLIC APIS)
  // =========================================================================

  /**
   * Khách hàng lấy danh sách món ăn (hỗ trợ search, filter danh mục, phân trang)
   */
  @Get('products')
  async getProducts(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const catId = categoryId ? parseInt(categoryId, 10) : undefined;
    return await this.productsService.getProducts(search, catId, pageNum, limitNum);
  }

  /**
   * Lấy danh sách danh mục để vẽ menu
   */
  @Get('categories')
  async getCategories() {
    return await this.productsService.getCategories();
  }

  /**
   * Lấy chi tiết một món ăn
   */
  @Get('products/:id')
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productsService.getProductById(id);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID ${id}.`);
    }
    return {
      message: 'Lấy chi tiết món ăn thành công.',
      product
    };
  }

  // =========================================================================
  // 2. ENDPOINTS CHO QUẢN TRỊ VIÊN (ADMIN APIS - YÊU CẦU QUYỀN ADMIN)
  // =========================================================================

  /**
   * Tạo danh mục mới
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() body: any) {
    const { categoryName, description } = body;
    return await this.productsService.createCategory(categoryName, description);
  }

  /**
   * Cập nhật danh mục
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Put('categories/:id')
  async updateCategory(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const { categoryName, description } = body;
    const updated = await this.productsService.updateCategory(id, categoryName, description);
    if (!updated) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID ${id} để cập nhật.`);
    }
    return {
      message: 'Cập nhật danh mục thành công.',
      category: updated
    };
  }

  /**
   * Thêm món ăn mới
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() body: any) {
    const { productName, categoryId, price, inventory, imageUrl } = body;
    return await this.productsService.createProduct(productName, categoryId, price, inventory, imageUrl);
  }

  /**
   * Cập nhật thông tin món ăn
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Put('products/:id')
  async updateProduct(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const { productName, categoryId, price, inventory, imageUrl } = body;
    const updated = await this.productsService.updateProduct(id, productName, categoryId, price, inventory, imageUrl);
    if (!updated) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID ${id} để cập nhật.`);
    }
    return {
      message: 'Cập nhật món ăn thành công.',
      product: updated
    };
  }

  /**
   * Tắt hoạt động (ngừng kinh doanh) hoặc bật lại món ăn
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Put('products/:id/status')
  async toggleProductStatus(@Param('id', ParseIntPipe) id: number, @Body('isActive') isActive: boolean) {
    const updated = await this.productsService.toggleProductStatus(id, isActive);
    if (!updated) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID ${id} để cập nhật trạng thái.`);
    }
    return {
      message: `${isActive ? 'Bật lại' : 'Ngừng bán'} món ăn thành công.`,
      product: updated
    };
  }

  /**
   * Truy vấn lịch sử thay đổi giá và tồn kho của sản phẩm (SQL Server Temporal Tables)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Get('products/:id/history')
  async getProductHistory(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productsService.getProductById(id);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID ${id}.`);
    }
    const history = await this.productsService.getProductHistory(id);
    return {
      message: `Lấy lịch sử biến động giá và tồn kho của món ăn [${product.ProductName}] thành công.`,
      history
    };
  }
}
