const lastBotResponse = '⚠️ **Món đã có trong giỏ:**\n• **Bún Bò** (trong giỏ đang có **1** phần. Bạn có chắc muốn thêm **1** nữa không?)\n\n👉 Bạn muốn cộng dồn không? (*"Có"* hoặc *"Không"*)';
const lines = lastBotResponse.split('\n');
for (const line of lines) {
  if (line.includes('muốn thêm') && line.includes('trong giỏ')) {
    const nameMatch = line.match(/•\s*(?:\*\*)?([^*()]+?)(?:\*\*)?\s*\(/);
    const qtyMatch = line.match(/muốn thêm\s*\**(\d+)\**/i);
    console.log('line:', line);
    console.log('nameMatch:', nameMatch ? nameMatch[1] : 'null');
    console.log('qtyMatch:', qtyMatch ? qtyMatch[1] : 'null');
  }
}
