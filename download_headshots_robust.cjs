require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.GOOGLE_API_KEY;
const cx = process.env.GOOGLE_CSE_ID;
const golfersFile = path.join(__dirname, 'public', 'golfers.json');
const outputDir = path.join(__dirname, 'public', 'headshots');
const failuresFile = path.join(__dirname, 'headshot_failures.json');
const RETRY_DELAY_HOURS = 3;
const MAX_FAILURES = 2;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHeadshotUrl(firstName, lastName) {
  const query = encodeURIComponent(`${firstName} ${lastName} golfer headshot`);
  const url = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${cx}&searchType=image&num=1&key=${apiKey}`;
  const resp = await fetch(url);
  if (resp.status === 429) throw new Error('RATE_LIMIT');
  if (!resp.ok) throw new Error(`Google API error: ${resp.statusText}`);
  const data = await resp.json();
  return data.items?.[0]?.link || null;
}

async function downloadImage(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch image');
  const fileStream = fs.createWriteStream(dest);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

(async () => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const golfers = JSON.parse(fs.readFileSync(golfersFile, 'utf8'));
  let failures = {};
  if (fs.existsSync(failuresFile)) {
    failures = JSON.parse(fs.readFileSync(failuresFile, 'utf8'));
  }

  for (const golfer of golfers) {
    const outPath = path.join(outputDir, `${golfer.PlayerID}.jpg`);
    if (fs.existsSync(outPath)) continue;

    const failCount = failures[golfer.PlayerID] || 0;
    if (failCount >= MAX_FAILURES) continue;

    try {
      console.log(`Searching for: ${golfer.FirstName} ${golfer.LastName}`);
      const imgUrl = await fetchHeadshotUrl(golfer.FirstName, golfer.LastName);
      if (imgUrl) {
        await downloadImage(imgUrl, outPath);
        console.log(`Downloaded for ${golfer.FirstName} ${golfer.LastName}`);
        if (failures[golfer.PlayerID]) delete failures[golfer.PlayerID];
      } else {
        console.warn(`No image found for ${golfer.FirstName} ${golfer.LastName}`);
        failures[golfer.PlayerID] = failCount + 1;
      }
    } catch (e) {
      if (e.message === 'RATE_LIMIT') {
        console.error('Rate limited by Google. Pausing for a few hours...');
        fs.writeFileSync(failuresFile, JSON.stringify(failures, null, 2));
        await sleep(RETRY_DELAY_HOURS * 60 * 60 * 1000);
        continue;
      } else {
        console.error(`Failed for ${golfer.FirstName} ${golfer.LastName}:`, e.message);
        failures[golfer.PlayerID] = failCount + 1;
      }
    }
    fs.writeFileSync(failuresFile, JSON.stringify(failures, null, 2));
    await sleep(1100); // Respect Google API rate limits
  }
  console.log('Done!');
})(); 