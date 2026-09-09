const lastBotResponse = `⚠️ **Món đã có trong giỏ:**
• **Mì Vàng** (trong giỏ đang có **2** phần. Bạn có chắc muốn thêm **1** nữa không?)

👉 Bạn muốn cộng dồn không? (*"Có"* hoặc *"Không"*)`;

const productsResult = {
  recordset: [
    { ProductID: 1, ProductName: 'Mì Vàng' }
  ]
};

let intentItems = [];

const lines = lastBotResponse.split('\n');
for (const line of lines) {
  if (line.includes('muốn thêm') && line.includes('trong giỏ')) {
    const nameMatch = line.match(/•\s*\**([^*]+)\**/);
    const qtyMatch = line.match(/muốn thêm\s*\**(\d+)\**/i);
    if (nameMatch && qtyMatch) {
      const pName = nameMatch[1].trim();
      const pQty = parseInt(qtyMatch[1], 10);
      const matchedProd = productsResult.recordset.find(
        (p) => p.ProductName.toLowerCase() === pName.toLowerCase()
      );
      if (matchedProd) {
        intentItems.push({
          id: matchedProd.ProductID,
          qty: pQty || 1,
        });
      }
    }
  }
}

if (intentItems.length === 0) {
   for (const prod of productsResult.recordset) {
     if (lastBotResponse.includes(prod.ProductName)) {
       const fallbackMatch = lastBotResponse.match(/muốn thêm\s*\**(\d+)\**/i);
       intentItems.push({
         id: prod.ProductID,
         qty: fallbackMatch ? parseInt(fallbackMatch[1], 10) : 1
       });
     }
   }
}

console.log("IntentItems:", intentItems);
