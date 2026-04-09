const { connect } = require('puppeteer-real-browser');

async function test() {
    const { browser, page } = await connect({
        headless: true,
        turnstile: true
    });

    const url = "https://www.upwork.com/nx/search/jobs/?sort=recency&subcategory2_uid=531770282593251331,531770282593251329,531770282589057033,531770282589057034,531770282589057036,531770282589057037,1737190722360750082,531770282589057025,531770282589057026,531770282589057024,531770282589057032,531770282589057030,531770282589057028,531770282589057029,531770282584862733&page=1&per_page=50";
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    await new Promise(r => setTimeout(r, 5000));

    const jobs = await page.evaluate(() => {
        const wrappers = Array.from(document.querySelectorAll('article[data-ev-job-uid], section.up-card-section'));
        return wrappers.map(el => {
            const inlineText = el.innerText.replace(/\n/g, ' ');
            const html = el.innerHTML;
            
            return {
                title: el.querySelector('h2 a, h3 a')?.innerText.trim(),
                inlineText: inlineText.substring(0, 300)
            };
        });
    });

    console.log(JSON.stringify(jobs.slice(0, 10), null, 2));
    await browser.close();
}

test().catch(console.error);
