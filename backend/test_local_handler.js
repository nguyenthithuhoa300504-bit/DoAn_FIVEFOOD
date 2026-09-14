const lastBotResponse = '⚠️ **Món đã có trong giỏ:**\n• **Mì Vàng** (trong giỏ đang có **2** phần. Bạn có chắc muốn thêm **1** nữa không?)\n\n👉 Bạn muốn cộng dồn không? (*"Có"* hoặc *"Không"*)';
const lines = lastBotResponse.split('\n');
const intentItems = [];
for (const line of lines) {
    if (line.includes('muốn thêm') && line.includes('trong giỏ')) {
        const nameMatch = line.match(/•\s*(?:\*\*)?([^*()]+?)(?:\*\*)?\s*\(/);
        const qtyMatch = line.match(/muốn thêm\s*\**(\d+)\**/i);
        console.log('line:', line);
        console.log('nameMatch:', nameMatch ? nameMatch[1] : null);
        console.log('qtyMatch:', qtyMatch ? qtyMatch[1] : null);
        if (nameMatch && qtyMatch) {
            const pName = nameMatch[1].trim();
            const pQty = parseInt(qtyMatch[1], 10);
            
            const pLower = pName.toLowerCase();
            console.log('pLower:', pLower);
            
            // simulate productsResult
            const productsResult = { recordset: [{ ProductName: 'Mì Vàng', ProductID: 15 }] };
            const matchedProd = productsResult.recordset.find(
                (p) => p.ProductName.toLowerCase() === pLower,
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
console.log('intentItems:', intentItems);
