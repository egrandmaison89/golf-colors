const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// === CONFIGURATION ===
const apiKey = 'AIzaSyDLY8MJT_zmEOtzxtVL1TGapQbpeV4K-IY';
const cx = '60c6a49e3db4146a7';
const golfersFile = path.join(__dirname, 'golfers.json');
const outputDir = path.join(__dirname, 'public', 'headshots');

// === HELPER FUNCTIONS ===
async function fetchHeadshotUrl(firstName, lastName) {
  const query = encodeURIComponent(`${firstName} ${lastName} golfer headshot`);
  const url = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${cx}&searchType=image&num=1&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`Google API error for ${firstName} ${lastName}: ${resp.statusText}`);
    return null;
  }
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

// === MAIN SCRIPT ===
(async () => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const golfers = JSON.parse(fs.readFileSync(golfersFile, 'utf8'));
  for (const golfer of golfers) {
    const outPath = path.join(outputDir, `${golfer.PlayerID}.jpg`);
    if (fs.existsSync(outPath)) {
      console.log(`Already exists: ${golfer.FirstName} ${golfer.LastName}`);
      continue;
    }
    try {
      console.log(`Searching for: ${golfer.FirstName} ${golfer.LastName}`);
      const imgUrl = await fetchHeadshotUrl(golfer.FirstName, golfer.LastName);
      if (imgUrl) {
        await downloadImage(imgUrl, outPath);
        console.log(`Downloaded for ${golfer.FirstName} ${golfer.LastName}`);
      } else {
        console.warn(`No image found for ${golfer.FirstName} ${golfer.LastName}`);
      }
    } catch (e) {
      console.error(`Failed for ${golfer.FirstName} ${golfer.LastName}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 1100)); // Respect Google API rate limits
  }
  console.log('Done!');
})(); 