const productsResult = {
  recordset: [
    { ProductID: 1, ProductName: 'Phở Bò' },
    { ProductID: 2, ProductName: 'Trà Sữa' },
  ]
};

const singleKeywords = ['phở', 'bò'];

const phraseSet = new Set();
for (const prod of productsResult.recordset) {
  const pName = prod.ProductName.toLowerCase().trim();
  phraseSet.add(pName);

  const words = pName.split(/\s+/);
  for (let len = words.length - 1; len >= 1; len--) {
    const prefix = words.slice(0, len).join(' ');
    if (len >= 2 || singleKeywords.includes(prefix)) {
      phraseSet.add(prefix);
    }
  }
}
for (const kw of singleKeywords) {
  phraseSet.add(kw);
}

const sortedPhrases = Array.from(phraseSet).sort(
  (a, b) => b.length - a.length,
);

let tempMsg = 'mua 2 phở bò'.toLowerCase();

const foundTerms = [];
const notLetterBefore =
  '(?:^|[^a-zA-ZàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ])';
const notLetterAfter =
  '(?:$|[^a-zA-ZàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ])';

for (const phrase of sortedPhrases) {
  if (
    phrase.length < 2 &&
    !['mì', 'gà', 'bò', ' trà', 'chè', 'kem'].includes(phrase)
  )
    continue;

  const regex = new RegExp(
    `${notLetterBefore}${phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}${notLetterAfter}`,
    'i',
  );
  if (regex.test(tempMsg)) {
    const matchIdx = tempMsg.indexOf(phrase);
    if (matchIdx !== -1) {
      let qty = 1;
      const beforeStr = tempMsg.substring(0, matchIdx).trim();
      const afterStr = tempMsg
        .substring(matchIdx + phrase.length)
        .trim();

      const beforeRegex =
        /(\d+)\s*(?:phần|tô|ly|cốc|cái|suất|dĩa|đĩa|hộp|túi|combo|chai|lon|món|chiếc|bát)?\s*$/i;
      const afterRegex =
        /^(\d+)\s*(?:phần|tô|ly|cốc|cái|suất|dĩa|đĩa|hộp|túi|combo|chai|lon|món|chiếc|bát)?/i;

      const bMatch = beforeStr.match(beforeRegex);
      const aMatch = afterStr.match(afterRegex);

      if (bMatch) {
        qty = parseInt(bMatch[1], 10);
      } else if (aMatch && !afterStr.match(/^[đd\.,000]/)) {
        qty = parseInt(aMatch[1], 10);
      } else {
        continue;
      }

      if (qty <= 0) qty = 1;

      foundTerms.push({ keyword: phrase, qty: qty, idx: matchIdx });

      tempMsg =
        tempMsg.substring(0, matchIdx) +
        ' '.repeat(phrase.length) +
        tempMsg.substring(matchIdx + phrase.length);
    }
  }
}

console.log(JSON.stringify(foundTerms, null, 2));
