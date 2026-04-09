const fetch = require('node-fetch');
const cheerio = require('cheerio');

function detectStore(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('homedepot.com')) return 'homedepot';
    if (hostname.includes('menards.com')) return 'menards';
    return null;
  } catch {
    return null;
  }
}

function parseHomeDepotUrl(url) {
  const parsed = new URL(url);
  const pathParts = parsed.pathname.split('/').filter(Boolean);

  // Pattern: /p/PRODUCT-NAME-SLUG/PRODUCT_ID
  const pIdx = pathParts.indexOf('p');
  if (pIdx === -1) return { url, store: 'homedepot' };

  const slug = pathParts[pIdx + 1] || '';
  const productId = pathParts[pIdx + 2] || '';

  const name = slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  return {
    url,
    store: 'homedepot',
    name: name || null,
    sku: productId || null,
    productId: productId || null,
  };
}

function parseMenardsUrl(url) {
  const parsed = new URL(url);
  const path = parsed.pathname;

  // Extract product ID from p-XXXXX patterns
  const pidMatch = path.match(/p-(\d+)/);
  const productId = pidMatch ? pidMatch[1] : null;

  // Extract product name from URL path segments
  const segments = path.split('/').filter(Boolean);
  // Usually the segment before p-XXXXX is the product name slug
  let nameSlug = '';
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].startsWith('p-')) {
      nameSlug = segments[i - 1] || '';
      break;
    }
  }

  // Clean name: "product-name-slug" -> "Product Name Slug"
  // Also strip trailing sku patterns like "-1234567"
  const name = nameSlug
    .replace(/-c-\d+.*$/, '')
    .replace(/-\d{5,}$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  // Try to extract SKU from URL or query params
  const skuMatch = path.match(/sku[- ]?(\d+)/i);
  const sku = skuMatch ? skuMatch[1] : null;

  return {
    url,
    store: 'menards',
    name: name || null,
    sku: sku || null,
    productId: productId || null,
  };
}

async function attemptScrape(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 8000,
      redirect: 'follow',
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const result = {};

    // Try JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        const product =
          data['@type'] === 'Product'
            ? data
            : Array.isArray(data)
              ? data.find((d) => d['@type'] === 'Product')
              : null;

        if (product) {
          result.name = result.name || product.name;
          result.sku = result.sku || product.sku;
          result.image_url =
            result.image_url || (Array.isArray(product.image) ? product.image[0] : product.image);
          if (product.offers) {
            const offer = Array.isArray(product.offers)
              ? product.offers[0]
              : product.offers;
            result.price = result.price || parseFloat(offer.price);
          }
        }
      } catch {
        // malformed JSON-LD, skip
      }
    });

    // Try Open Graph meta tags
    if (!result.name) {
      result.name = $('meta[property="og:title"]').attr('content') || null;
    }
    if (!result.image_url) {
      result.image_url = $('meta[property="og:image"]').attr('content') || null;
    }

    // Try standard meta tags
    if (!result.name) {
      result.name = $('title').text().split('|')[0].split('-')[0].trim() || null;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

async function scrapeProduct(url) {
  const store = detectStore(url);
  if (!store) {
    throw new Error('URL must be from homedepot.com or menards.com');
  }

  // Parse what we can from the URL structure (always works)
  const urlData =
    store === 'homedepot' ? parseHomeDepotUrl(url) : parseMenardsUrl(url);

  // Attempt real scrape (may fail due to bot protection)
  const scraped = await attemptScrape(url);

  // Merge: scraped data takes priority, URL-parsed data fills gaps
  return {
    url,
    store,
    name: scraped?.name || urlData.name || null,
    sku: scraped?.sku || urlData.sku || null,
    price: scraped?.price || null,
    image_url: scraped?.image_url || null,
    productId: urlData.productId || null,
    source: scraped?.name ? 'scraped' : 'url_parsed',
  };
}

module.exports = { scrapeProduct, detectStore };
