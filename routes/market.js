const express = require('express');
const router = express.Router();

// In-memory storage for market data (replace with real market data API in production)
let marketData = {
  prices: {},
  lastUpdated: new Date().toISOString()
};

// Mock market data - in production, this would come from external APIs
const mockPrices = {
  'BINANCE:BTCUSDT': { price: 45000, change: 2.5, volume: 1250000 },
  'BINANCE:ETHUSDT': { price: 2800, change: -1.2, volume: 850000 },
  'BINANCE:BNBUSDT': { price: 320, change: 0.8, volume: 420000 },
  'BINANCE:SOLUSDT': { price: 98.5, change: 3.2, volume: 680000 },
  'BINANCE:XRPUSDT': { price: 0.52, change: -0.8, volume: 920000 },
  'BINANCE:DOGEUSDT': { price: 0.08, change: 1.5, volume: 1100000 },
  'BINANCE:ADAUSDT': { price: 0.45, change: -0.3, volume: 520000 },
  'FX:EURUSD': { price: 1.0850, change: 0.15, volume: 0 },
  'FX:GBPUSD': { price: 1.2750, change: -0.25, volume: 0 },
  'FX:USDJPY': { price: 147.50, change: 0.35, volume: 0 },
  'FX:USDCHF': { price: 0.8920, change: -0.12, volume: 0 },
  'FX:AUDUSD': { price: 0.6580, change: 0.22, volume: 0 },
  'FX:USDCAD': { price: 1.3650, change: 0.08, volume: 0 },
  'FX:NZDUSD': { price: 0.6120, change: -0.18, volume: 0 },
  'NASDAQ:AAPL': { price: 175.50, change: 1.25, volume: 45000000 },
  'NASDAQ:MSFT': { price: 385.20, change: 0.95, volume: 28000000 },
  'NASDAQ:GOOGL': { price: 138.25, change: 0.85, volume: 22000000 },
  'NASDAQ:AMZN': { price: 155.80, change: -0.45, volume: 35000000 },
  'NASDAQ:TSLA': { price: 245.80, change: -2.15, volume: 68000000 },
  'NYSE:BRK.A': { price: 545000, change: 0.12, volume: 850 },
  'NYSE:JPM': { price: 158.75, change: 0.58, volume: 12000000 },
  'NYSE:V': { price: 265.40, change: 0.32, volume: 8500000 },
  'NYSE:UNH': { price: 520.30, change: 1.15, volume: 3200000 },
  'NYSE:HD': { price: 345.60, change: -0.28, volume: 4500000 }
};

// Initialize market data
marketData.prices = { ...mockPrices };

// Simulate real-time price updates
setInterval(() => {
  Object.keys(marketData.prices).forEach(symbol => {
    const currentPrice = marketData.prices[symbol];
    // Random price fluctuation between -2% to +2%
    const fluctuation = (Math.random() - 0.5) * 0.04;
    const newPrice = currentPrice.price * (1 + fluctuation);
    const priceChange = ((newPrice - currentPrice.price) / currentPrice.price) * 100;
    
    marketData.prices[symbol] = {
      ...currentPrice,
      price: Math.round(newPrice * 100) / 100,
      change: Math.round(priceChange * 100) / 100
    };
  });
  marketData.lastUpdated = new Date().toISOString();
}, 5000); // Update every 5 seconds

// Get real-time market prices
router.post('/prices', async (req, res) => {
  try {
    const { symbols } = req.body;

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        message: 'Symbols array is required'
      });
    }

    const prices = {};
    symbols.forEach(symbol => {
      if (marketData.prices[symbol]) {
        prices[symbol] = marketData.prices[symbol];
      }
    });

    res.json({
      success: true,
      data: {
        prices,
        lastUpdated: marketData.lastUpdated,
        requestedSymbols: symbols.length,
        foundSymbols: Object.keys(prices).length
      }
    });

  } catch (error) {
    console.error('Error fetching market prices:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching market prices',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all available market prices
router.get('/prices/all', async (req, res) => {
  try {
    const { category } = req.query;

    let filteredPrices = { ...marketData.prices };

    // Filter by category if provided
    if (category) {
      const categoryPrefix = category.toLowerCase() === 'crypto' ? 'BINANCE:' :
                           category.toLowerCase() === 'forex' ? 'FX:' :
                           category.toLowerCase() === 'stocks' ? ['NASDAQ:', 'NYSE:'] : null;

      if (categoryPrefix) {
        filteredPrices = {};
        Object.keys(marketData.prices).forEach(symbol => {
          if (Array.isArray(categoryPrefix)) {
            if (categoryPrefix.some(prefix => symbol.startsWith(prefix))) {
              filteredPrices[symbol] = marketData.prices[symbol];
            }
          } else {
            if (symbol.startsWith(categoryPrefix)) {
              filteredPrices[symbol] = marketData.prices[symbol];
            }
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        prices: filteredPrices,
        lastUpdated: marketData.lastUpdated,
        totalSymbols: Object.keys(filteredPrices).length,
        category: category || 'all'
      }
    });

  } catch (error) {
    console.error('Error fetching all market prices:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching market prices',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get specific symbol price
router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!marketData.prices[symbol]) {
      return res.status(404).json({
        success: false,
        message: `Price data not found for symbol: ${symbol}`
      });
    }

    res.json({
      success: true,
      data: {
        symbol,
        price: marketData.prices[symbol],
        lastUpdated: marketData.lastUpdated
      }
    });

  } catch (error) {
    console.error('Error fetching symbol price:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching symbol price',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get market overview/ticker data
router.get('/ticker', async (req, res) => {
  try {
    // Select key symbols for ticker display
    const tickerSymbols = [
      'BINANCE:BTCUSDT',
      'BINANCE:ETHUSDT',
      'FX:EURUSD',
      'NASDAQ:AAPL',
      'NASDAQ:TSLA'
    ];

    const tickerData = tickerSymbols.map(symbol => {
      const priceData = marketData.prices[symbol];
      if (!priceData) return null;

      let displayName = symbol;
      if (symbol.startsWith('BINANCE:')) {
        displayName = symbol.replace('BINANCE:', '').replace('USDT', '/USDT');
      } else if (symbol.startsWith('FX:')) {
        displayName = symbol.replace('FX:', '').replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2');
      } else if (symbol.startsWith('NASDAQ:') || symbol.startsWith('NYSE:')) {
        displayName = symbol.split(':')[1];
      }

      return {
        symbol,
        displayName,
        name: displayName,
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.change,
        volume: priceData.volume
      };
    }).filter(Boolean);

    res.json({
      success: true,
      data: tickerData,
      lastUpdated: marketData.lastUpdated
    });

  } catch (error) {
    console.error('Error fetching ticker data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching ticker data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get historical chart data (mock data)
router.get('/chart/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = 100 } = req.query;

    if (!marketData.prices[symbol]) {
      return res.status(404).json({
        success: false,
        message: `Chart data not found for symbol: ${symbol}`
      });
    }

    const currentPrice = marketData.prices[symbol].price;
    
    // Generate mock historical data
    const chartData = [];
    const now = Date.now();
    const intervalMs = interval === '1m' ? 60000 :
                     interval === '5m' ? 300000 :
                     interval === '15m' ? 900000 :
                     interval === '1h' ? 3600000 :
                     interval === '4h' ? 14400000 :
                     interval === '1d' ? 86400000 : 3600000;

    for (let i = parseInt(limit); i >= 0; i--) {
      const timestamp = now - (i * intervalMs);
      const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const price = currentPrice * (1 + randomVariation);
      const volume = Math.floor(Math.random() * 1000000) + 100000;

      chartData.push({
        timestamp,
        time: new Date(timestamp).toISOString(),
        open: Math.round(price * 0.998 * 100) / 100,
        high: Math.round(price * 1.005 * 100) / 100,
        low: Math.round(price * 0.995 * 100) / 100,
        close: Math.round(price * 100) / 100,
        volume
      });
    }

    res.json({
      success: true,
      data: {
        symbol,
        interval,
        chartData,
        dataPoints: chartData.length
      }
    });

  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching chart data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Market statistics endpoint
router.get('/stats', async (req, res) => {
  try {
    const totalSymbols = Object.keys(marketData.prices).length;
    
    // Calculate market statistics
    const allPrices = Object.values(marketData.prices);
    const gainers = allPrices.filter(p => p.change > 0).length;
    const losers = allPrices.filter(p => p.change < 0).length;
    const unchanged = allPrices.filter(p => p.change === 0).length;
    
    const avgChange = allPrices.reduce((sum, p) => sum + p.change, 0) / allPrices.length;
    const totalVolume = allPrices.reduce((sum, p) => sum + (p.volume || 0), 0);

    // Top gainers and losers
    const topGainers = allPrices
      .filter(p => p.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 5);
      
    const topLosers = allPrices
      .filter(p => p.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        overview: {
          totalSymbols,
          gainers,
          losers,
          unchanged,
          avgChange: Math.round(avgChange * 100) / 100,
          totalVolume: Math.round(totalVolume)
        },
        topGainers,
        topLosers,
        lastUpdated: marketData.lastUpdated
      }
    });

  } catch (error) {
    console.error('Error fetching market stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching market stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check for market service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Market service is operational',
    data: {
      totalSymbols: Object.keys(marketData.prices).length,
      lastPriceUpdate: marketData.lastUpdated,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;