import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Simple in-memory cache for Baidu Baike image URLs
  const imageCache = new Map<string, string>();

  // API Route for Baidu Baike Images
  app.get('/api/baidu-baike-image', async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).send('Missing query parameter q');
    }

    if (imageCache.has(q)) {
      return res.redirect(imageCache.get(q)!);
    }

    const tryBaike = async (query: string) => {
      const baikeUrl = `https://baike.baidu.com/item/${encodeURIComponent(query)}`;
      const response = await axios.get(baikeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 3000
      });
      const $ = cheerio.load(response.data);
      let img = $('.summary-pic img').attr('src') || 
                $('.lemma-picture img').attr('src') ||
                $('.lemma-summary-img img').attr('src') ||
                $('.lemmaWGT-lemmaImg img').attr('src');
      
      if (img && img.includes('no-pic.png')) return null;
      return img;
    };

    const tryBaiduImage = async (query: string) => {
      // Baidu Image search results parsing (simplified)
      const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(query + ' 民俗 活动 图片')}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        },
        timeout: 3000
      });
      const $ = cheerio.load(response.data);
      // Try to find any high-quality image from the search results preview
      // Note: Baidu search result images often have classes or data-attributes
      let found = null;
      $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && (src.includes('bdstatic.com') || src.startsWith('http')) && !src.includes('logo') && !found) {
          found = src;
        }
      });
      return found;
    };

    try {
      let searchTerm = q.split('（')[0].split('(')[0].trim();
      
      // Step 1: Try Baidu Baike (Most authoritative)
      let imageUrl = await tryBaike(searchTerm);

      // Step 2: Try Baidu Image Search if Baike failed or returned generic
      if (!imageUrl || imageUrl.includes('static/common/img/no-image.png')) {
        console.log(`Fallback to search for: ${searchTerm}`);
        imageUrl = await tryBaiduImage(searchTerm);
      }

      // Step 3: Pure fallback to high quality placeholder if all else fails
      if (!imageUrl) {
        imageUrl = `https://picsum.photos/seed/${encodeURIComponent(searchTerm)}/800/600`;
      }

      // Ensure protocol
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;

      imageCache.set(q, imageUrl);
      return res.redirect(imageUrl);
    } catch (error) {
      console.error('Image Proxy Error:', error);
      // On error, redirect to a safe fallback instead of 500
      res.redirect(`https://picsum.photos/seed/${encodeURIComponent(q)}/800/600`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
