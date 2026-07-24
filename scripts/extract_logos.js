const sharp = require('sharp');
const path = require('path');

const img1Path = 'C:/Users/adity/.gemini/antigravity/brain/0ce08939-1dee-40cf-9801-ebd0dfcbb201/.user_uploaded/media__1784913347408.png';
const img3Path = 'C:/Users/adity/.gemini/antigravity/brain/0ce08939-1dee-40cf-9801-ebd0dfcbb201/.user_uploaded/media__1784913356015.png';
const outputDir = path.join(__dirname, '..');

const logosRowColMap = [
    // Row 0
    { r: 0, c: 0, name: 'logo-accent' },
    { r: 0, c: 1, name: 'logo-iibc' },
    { r: 0, c: 2, name: 'logo-srcc-seal' },
    { r: 0, c: 3, name: 'logo-ey-crop' },
    { r: 0, c: 4, name: 'logo-cornell' },
    { r: 0, c: 5, name: 'logo-ashoka' },
    { r: 0, c: 6, name: 'logo-iitd' },
    { r: 0, c: 7, name: 'logo-iiml' },
    // Row 1
    { r: 1, c: 0, name: 'logo-hindu' },
    { r: 1, c: 1, name: 'logo-mcgill' },
    { r: 1, c: 2, name: 'logo-iimc-seal' },
    { r: 1, c: 3, name: 'logo-nus' },
    { r: 1, c: 4, name: 'logo-harvard' },
    { r: 1, c: 5, name: 'logo-bits' },
    { r: 1, c: 6, name: 'logo-masters-union' },
    { r: 1, c: 7, name: 'logo-isb-crop' },
    // Row 2
    { r: 2, c: 0, name: 'logo-lsr' },
    { r: 2, c: 1, name: 'logo-iitkgp' },
    { r: 2, c: 2, name: 'logo-iimb-seal' },
    { r: 2, c: 3, name: 'logo-hsbc' },
    { r: 2, c: 4, name: 'logo-iima-seal' },
    { r: 2, c: 5, name: 'logo-icici' },
    { r: 2, c: 6, name: 'logo-ststephens' },
    { r: 2, c: 7, name: 'logo-cbs' },
    // Row 3
    { r: 3, c: 0, name: 'logo-aab' },
    { r: 3, c: 1, name: 'logo-iimk' },
    { r: 3, c: 2, name: 'logo-crms' },
    { r: 3, c: 3, name: 'logo-mmi' },
    { r: 3, c: 4, name: 'logo-iimi' },
    { r: 3, c: 5, name: 'logo-brainwars' },
    { r: 3, c: 6, name: 'logo-spjimr' },
    { r: 3, c: 7, name: 'logo-mcgill-text' }
];

async function extractLogos() {
    console.log('Extracting logos from Image 1 (1024 x 573)...');
    const imgWidth = 1024;
    const imgHeight = 573;
    const cols = 8;
    const rows = 4;

    for (const item of logosRowColMap) {
        const left = item.c * 128;
        const top = item.r * 143;
        const width = (item.c === 7) ? (imgWidth - left) : 128;
        const height = (item.r === 3) ? (imgHeight - top) : 143;
        const outFile = path.join(outputDir, `${item.name}.png`);

        try {
            // First extract subregion
            const buffer = await sharp(img1Path)
                .extract({ left, top, width, height })
                .toBuffer();

            // Try trimming whitespace safely
            let finalImage = sharp(buffer);
            try {
                const trimmedBuffer = await sharp(buffer)
                    .trim({ background: '#ffffff', threshold: 10 })
                    .toBuffer();
                finalImage = sharp(trimmedBuffer);
            } catch (e) {
                // If trim fails, keep original subregion
            }

            await finalImage
                .extend({
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .toFile(outFile);

            console.log(`Saved: ${item.name}.png`);
        } catch (err) {
            console.error(`Error saving ${item.name}:`, err.message);
        }
    }

    console.log('Extracting specific logos from Image 3...');
    const img3Crops = [
        { name: 'logo-iimbodhgaya', left: 730, top: 10, width: 250, height: 110 },
        { name: 'logo-hku', left: 800, top: 220, width: 200, height: 230 },
        { name: 'logo-dtu', left: 510, top: 270, width: 160, height: 260 },
        { name: 'logo-gt', left: 240, top: 450, width: 440, height: 100 }
    ];

    for (const crop of img3Crops) {
        const outFile = path.join(outputDir, `${crop.name}.png`);
        try {
            await sharp(img3Path)
                .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
                .toFile(outFile);
            console.log(`Saved: ${crop.name}.png`);
        } catch (err) {
            console.error(`Error saving ${crop.name}:`, err.message);
        }
    }
}

extractLogos().then(() => console.log('Done logo extraction!'));
