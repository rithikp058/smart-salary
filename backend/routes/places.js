/**
 * /api/places/search?q=Yashoda+Hitech+City
 * Proxies to Nominatim (OpenStreetMap) — no API key required.
 * Returns a clean list of place suggestions with name, area, city, pincode, lat, lon.
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.get('/search', authMiddleware, async (req, res) => {
  const q = req.query.q;
  if (!q || String(q).trim().length < 2) {
    return res.json([]);
  }

  try {
    // Nominatim free geocoding — no key needed, just a User-Agent header
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SmartSalaryProcessor/1.0 (pharma-field-app)',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ message: 'Location search service unavailable' });
    }

    const data = await response.json();

    // Shape the response for the frontend
    const results = data.map(item => {
      const addr = item.address || {};
      const pincode = addr.postcode || '';
      const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.county || '';
      const city = addr.city || addr.town || addr.village || addr.state_district || '';
      const displayName = item.display_name || '';

      return {
        placeId: item.place_id,
        displayName,
        name: item.name || displayName.split(',')[0].trim(),
        area,
        city,
        pincode,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };
    });

    res.json(results);
  } catch (err) {
    // If Nominatim is unreachable, return empty rather than crashing
    console.error('Nominatim error:', err.message);
    res.json([]);
  }
});

module.exports = router;
