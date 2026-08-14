export const getDiscountForPrice = (price) => {
  if (price >= 100000) return 25;
  if (price >= 60000) return 20;
  if (price >= 30000) return 15;
  return 10;
};

export const getMockProductData = (id) => {
  const numId = typeof id === 'number' ? id : parseInt(id) || 0;
  // Rating between 4.2 and 4.9
  const rating = (4.2 + (numId % 8) * 0.1).toFixed(1);
  // Reviews between 15 and 214
  const reviews = (numId * 7 % 200) + 15;
  // Sold count
  const rawSold = (numId * 13 % 1500) + 10;
  const sold = rawSold >= 1000 ? (rawSold / 1000).toFixed(1) + 'k' : rawSold.toString();
  return { rating, reviews, sold };
};
