import puppeteer from 'puppeteer';
import { getReceiptLayout } from './receipt-template.js';

/**
 * Service untuk men-generate PDF Struk Kasir Thermal Roll (continuous) via Puppeteer.
 * Layout dirender pada lebar frontend (380px/320px) lalu diskalakan agar pas
 * dengan lebar kertas fisik (80mm/58mm) dengan tinggi dinamis (auto-height).
 *
 * @param {Object} options
 * @param {string} options.html - HTML struk
 * @param {'58mm' | '80mm'} [options.paperWidth='80mm']
 * @returns {Promise<Buffer>}
 */
export const generateThermalReceiptPdf = async ({ html, paperWidth = '80mm' }) => {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            pipe: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--font-render-hinting=none',
            ],
        });

        const page = await browser.newPage();
        const { layoutPx, paperMm, scale } = getReceiptLayout(paperWidth);

        await page.setViewport({ width: layoutPx, height: 800, deviceScaleFactor: 2 });
        await page.setContent(html, {
            waitUntil: ['domcontentloaded', 'networkidle0'],
            timeout: 30000,
        });
        await page.emulateMediaType('screen');

        // Tinggi konten aktual pada lebar layout
        const contentHeight = await page.evaluate(() =>
            Math.ceil(document.querySelector('.receipt').getBoundingClientRect().height)
        );

        const pdfBuffer = await page.pdf({
            width: `${paperMm}mm`,
            height: `${Math.ceil(contentHeight * scale) + 6}px`,
            scale,
            printBackground: true,
            pageRanges: '1',
            margin: { top: '0', bottom: '0', left: '0', right: '0' },
        });

        return Buffer.from(pdfBuffer);
    } catch (error) {
        console.error('[Thermal Receipt PDF Generator] Gagal membuat PDF struk:', error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
};

export default { generateThermalReceiptPdf };
