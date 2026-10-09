/*
 * Gera curriculo-vitor-alves-pt.pdf e curriculo-vitor-alves-en.pdf a partir do layout de impressão do site.
 * Uso (na raiz do repositório): npm i --no-save playwright && node scripts/build-pdf.js
 * Rode de novo sempre que o conteúdo do site mudar.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
});

(async () => {
    await new Promise(r => server.listen(0, r));
    const url = `http://localhost:${server.address().port}/`;
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    for (const lang of ['pt', 'en']) {
        const ctx = await browser.newContext({ colorScheme: 'light' });
        await ctx.addInitScript(l => { localStorage.setItem('siteLang', l); localStorage.setItem('cookieConsent', 'denied'); }, lang);
        const page = await ctx.newPage();
        await page.route(/googletagmanager|google-analytics/, r => r.abort());
        await page.goto(url, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await page.emulateMedia({ media: 'print' });
        await page.pdf({ path: path.join(root, `curriculo-vitor-alves-${lang}.pdf`), format: 'A4', printBackground: true });
        await ctx.close();
    }
    await browser.close();
    server.close();
})();
