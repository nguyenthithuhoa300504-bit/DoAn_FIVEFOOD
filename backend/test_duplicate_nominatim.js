const address = '12 trần hưng đạo Bình Thuận, Việt Nam';
const searchQuery = `${address}, Bình Thuận, Việt Nam`;
const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;

fetch(url, { headers: { 'User-Agent': 'FiveFood-DoAn/1.0' } })
  .then(res => res.json())
  .then(data => console.log('Data:', data))
  .catch(err => console.error(err));
