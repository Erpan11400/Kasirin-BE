import puppeteer from 'puppeteer';

/**
 * Service untuk men-generate dokumen PDF dari HTML template menggunakan Puppeteer
 * 
 * @param {Object} options
 * @param {string} options.html - HTML string yang akan dirender
 * @param {'portrait' | 'landscape'} [options.orientation='portrait'] - Orientasi cetak A4
 * @returns {Promise<Buffer>} - Buffer binary PDF
 */
export const generatePdfFromHtml = async ({ html, orientation = 'portrait' }) => {
    let browser = null;
    try {
        // Luncurkan Headless Chrome dengan flag yang aman untuk server & container
        browser = await puppeteer.launch({
            headless: 'new',
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

        // Set konten HTML ke dalam tab page
        await page.setContent(html, {
            waitUntil: ['domcontentloaded', 'networkidle0'],
            timeout: 30000,
        });

        // Pastikan styling background dan warna CSS tercetak persis sesuai desain
        await page.emulateMediaType('screen');

        // Render ke format PDF A4
        const isLandscape = orientation === 'landscape';
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: isLandscape,
            printBackground: true,
            preferCSSPageSize: true,
            margin: isLandscape ? {
                top: '8mm',
                bottom: '8mm',
                left: '10mm',
                right: '10mm',
            } : {
                top: '10mm',
                bottom: '10mm',
                left: '12mm',
                right: '12mm',
            },
        });

        return Buffer.from(pdfBuffer);
    } catch (error) {
        console.error('[PDF Generator] Gagal membuat PDF:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

export default {
    generatePdfFromHtml,
};
