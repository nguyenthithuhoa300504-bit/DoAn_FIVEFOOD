const fs = require('fs');
let content = fs.readFileSync('src/database/database.service.ts', 'utf8');

const mappingCode = `const keyMapping: { [key: string]: string } = {
  productid: 'ProductID',
  productname: 'ProductName',
  categoryid: 'CategoryID',
  categoryname: 'CategoryName',
  price: 'Price',
  inventory: 'Inventory',
  imageurl: 'ImageURL',
  ingredients: 'Ingredients',
  isactive: 'IsActive',
  description: 'Description',
  roleid: 'RoleID',
  rolename: 'RoleName',
  userid: 'UserID',
  fullname: 'FullName',
  email: 'Email',
  passwordhash: 'PasswordHash',
  phone: 'Phone',
  islocked: 'IsLocked',
  createdat: 'CreatedAt',
  orderid: 'OrderID',
  orderdate: 'OrderDate',
  shippingaddress: 'ShippingAddress',
  status: 'Status',
  latitude: 'Latitude',
  longitude: 'Longitude',
  totalamount: 'TotalAmount',
  cartid: 'CartID',
  cartitemid: 'CartItemID',
  quantity: 'Quantity',
  subtotal: 'Subtotal',
  reviewid: 'ReviewID',
  rating: 'Rating',
  comment: 'Comment',
  ishidden: 'IsHidden',
  promocode: 'PromoCode',
  discountpercentage: 'DiscountPercentage',
  maxdiscountamount: 'MaxDiscountAmount',
  minordervalue: 'MinOrderValue',
  usagelimit: 'UsageLimit',
  usedcount: 'UsedCount',
  startdate: 'StartDate',
  enddate: 'EndDate',
  totalcount: 'TotalCount',
  soldcount: 'SoldCount',
  averagerating: 'AverageRating',
  reviewcount: 'ReviewCount',
  messageid: 'MessageID',
  senderid: 'SenderID',
  receiverid: 'ReceiverID',
  messagetext: 'MessageText',
  sentat: 'SentAt',
  isread: 'IsRead',
  actionid: 'ActionID',
  actiontype: 'ActionType',
  searchquery: 'SearchQuery',
  promotionid: 'PromotionID',
  branchid: 'BranchID',
  branchname: 'BranchName',
  sysstarttime: 'SysStartTime',
  sysendtime: 'SysEndTime',
  count: 'count',
  valid: 'valid'
};`;

if (!content.includes('const keyMapping')) {
  // Put keyMapping right before @Injectable()
  content = content.replace('@Injectable()', mappingCode + '\n\n@Injectable()');
}

// Replace the return of result.rows with mappedRows for pgQueryText (first occurrence)
content = content.replace(
  'const result = await this.pool.query(pgQueryText, pgParams);\n      return { recordset: result.rows, rowsAffected: [result.rowCount] };',
  `const result = await this.pool.query(pgQueryText, pgParams);
      const mappedRows = result.rows.map((row: any) => {
        const newRow: any = {};
        for (const key in row) {
          const pascalKey = keyMapping[key] || key;
          newRow[pascalKey] = row[key];
        }
        return newRow;
      });
      return { recordset: mappedRows, rowsAffected: [result.rowCount] };`
);

// Replace the return of result.rows with mappedRows for queryText (second occurrence in executeProcedure)
content = content.replace(
  'const result = await this.pool.query(queryText, pgParams);\n      return { recordset: result.rows, rowsAffected: [result.rowCount] };',
  `const result = await this.pool.query(queryText, pgParams);
      const mappedRows = result.rows.map((row: any) => {
        const newRow: any = {};
        for (const key in row) {
          const pascalKey = keyMapping[key] || key;
          newRow[pascalKey] = row[key];
        }
        return newRow;
      });
      return { recordset: mappedRows, rowsAffected: [result.rowCount] };`
);

fs.writeFileSync('src/database/database.service.ts', content, 'utf8');
console.log('database.service.ts patched with key mapper!');
