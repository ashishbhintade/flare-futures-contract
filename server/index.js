const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;

app.get('/:commodity', async (req, res) => {
    const { commodity } = req.params;
    const url = `https://tradingeconomics.com/commodity/${commodity}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; scraper/1.0)' // mimic browser
            }
        });

        const $ = cheerio.load(response.data);

        // Select the first table with class "table" (same as you showed)
        const table = $('table.table').first();

        if (!table.length) {
            return res.status(404).json({ error: 'Commodity table not found.' });
        }

        const actualPriceText = table.find('tbody tr td').eq(1).text().trim();

        if (!actualPriceText) {
            return res.status(404).json({ error: 'Price not found.' });
        }

        const actualPrice = parseFloat(actualPriceText.replace(/[^0-9.-]+/g, ''));

        return res.json({
            name: commodity.replace(/-/g, ' '),
            price: actualPrice
        });
    } catch (error) {
        console.error(error.message);
        return res.status(404).json({ error: 'Commodity not found or error fetching page.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
