'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { analyze50 } = require('./analyze50');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * @param {string} url
 * @returns {Promise<{ url: string, loadTime: number, items: unknown[], totalScore: number, maxScore: number, autoCount: number, manualCount: number }>}
 */
async function runDiagnosis(url) {
  if (!url) {
    const e = new Error('URLを入力してください');
    e.statusCode = 400;
    e.code = 'VALIDATION';
    throw e;
  }

  const startTime = Date.now();
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ja,en;q=0.9',
    },
    maxRedirects: 5,
    httpsAgent,
  });
  const loadTime = Date.now() - startTime;
  const html = response.data;
  const $ = cheerio.load(html);
  const contentLength = Buffer.byteLength(html, 'utf8');

  let allCSS = '';
  $('style').each((_, el) => {
    allCSS += $(el).html() + '\n';
  });
  const cssLinks = $('link[rel="stylesheet"]');
  for (const link of cssLinks.toArray()) {
    const href = $(link).attr('href');
    if (href) {
      try {
        const cssUrl = new URL(href, url).toString();
        const cssRes = await axios.get(cssUrl, { timeout: 5000, responseType: 'text', httpsAgent });
        allCSS += cssRes.data + '\n';
      } catch {
        /* skip broken CSS */
      }
    }
  }

  const bodyText = $('body').text();
  const bodyTextClean = bodyText.replace(/\s+/g, '');

  const items = analyze50($, url, html, allCSS, loadTime, contentLength, bodyText, bodyTextClean);

  let totalScore = 0;
  let autoCount = 0;
  let manualCount = 0;
  items.forEach((item) => {
    if (item.score !== null) {
      totalScore += item.score;
      autoCount++;
    } else {
      manualCount++;
    }
  });

  return {
    url,
    loadTime,
    items,
    totalScore,
    maxScore: 100,
    autoCount,
    manualCount,
  };
}

function mapAxiosError(err) {
  if (err.code === 'ENOTFOUND' || err.code === 'ERR_INVALID_URL') {
    return { status: 400, body: { error: 'URLが見つかりません。正しいURLを入力してください。' } };
  }
  if (err.code === 'ECONNABORTED') {
    return { status: 400, body: { error: 'タイムアウトしました。' } };
  }
  if (err.statusCode === 400 && err.code === 'VALIDATION') {
    return { status: 400, body: { error: err.message } };
  }
  return { status: 500, body: { error: `分析エラー: ${err.message}` } };
}

module.exports = { runDiagnosis, mapAxiosError };
