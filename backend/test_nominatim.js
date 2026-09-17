const address = '12 trần hưng đạo';
const searchQuery = `${address}, Bình Thuận, Việt Nam`;
const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;

fetch(url, { headers: { 'User-Agent': 'FiveFood-DoAn/1.0' } })
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => console.error(err));
