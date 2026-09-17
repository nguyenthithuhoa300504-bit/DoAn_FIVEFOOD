const address = '123 Bùi Viện, Hồ Chí Minh';
const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
fetch(url, { headers: { 'User-Agent': 'FiveFood-DoAn/1.0' } })
  .then(res => res.json())
  .then(data => {
    if (data && data.length > 0) {
      console.log('Lat:', parseFloat(data[0].lat));
      console.log('Lng:', parseFloat(data[0].lon));
    } else {
      console.log('Not found');
    }
  })
  .catch(err => console.error(err));
