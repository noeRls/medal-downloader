const Axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');
const yargs = require('yargs');
const ProgressBar = require('progress');
const Api = require('./Api');

let outdir = './downloads';
async function downloadFile(downloadUrl, name) {
  const { data, headers } = await Axios({
    url: downloadUrl,
    method: 'GET',
    responseType: 'stream',
  });
  const totalLength = Number(headers['content-length']);

  const downloadPath = path.join(outdir, name);
  if (fs.existsSync(downloadPath)) {
    const stats = fs.statSync(downloadPath);
    if (stats.size === totalLength) {
      console.log(`${name} -> already downloaded, skipping`);
      return;
    }
  }
  const stream = fs.createWriteStream(downloadPath);

  const progressBar = new ProgressBar(`[:bar] :percent :etas -> ${name}`, {
    width: 40,
    complete: '=',
    incomplete: ' ',
    renderThrottle: 1,
    total: totalLength,
  });

  data.on('data', chunk => progressBar.tick(chunk.length));
  data.pipe(stream);

  // eslint-disable-next-line consistent-return
  return new Promise((res, rej) => {
    stream.on('finish', res);
    stream.on('error', rej);
  });
}

async function download(video) {
  const quality = ['1080', '720', '480', '360', '240', '144'];
  const bestQuality = quality.find(q => video[`contentUrl${q}p`]);
  if (!bestQuality) {
    console.error('Failed to find a suitable quality');
    return;
  }
  const downloadUrl = video[`contentUrl${bestQuality}p`];
  const videoName = `${sanitize(video.contentTitle)}.mp4`;

  try {
    await downloadFile(downloadUrl, videoName);
  } catch (e) {
    console.error(e);
    console.log(`Failed to download: "${videoName}"`);
    throw e;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadAll(videos, maxSimultaneous) {
  let current = 0;
  await Promise.all(videos.map(async d => {
    try {
      // eslint-disable-next-line no-await-in-loop
      while (current >= maxSimultaneous) await sleep(100);
      current += 1;
      await download(d);
    // eslint-disable-next-line no-empty
    } catch (e) {
    }
    current -= 1;
  }));
}

async function run(userUrl, username, password) {
  const userId = Api.parseUserUrl(userUrl);
  if (!userId) {
    console.error(`Invalid user url: ${userUrl}`);
    return;
  }
  console.log(`User id: ${userId}`);

  const api = new Api();

  try {
    if (username && password) await api.authentificate(username, password);
    else await api.guestAuthentificate();
  } catch (e) {
    console.error(e);
    console.error('Authentification failed');
    return;
  }

  try {
    const user = await api.getUser(userId);
    console.log(`${user.displayName} have ${user.submissions} public videos`);
    const videos = await api.listVideos(userId, 30);
    console.log(`${videos.length} videos downloadable`);
    await downloadAll(videos, 1);
  } catch (e) {
    console.error(e);
    console.error('An error occured');
  }
}

async function main() {
  const args = yargs
    .usage('Usage: $0 --url [userUrl]')
    .option('url', {
      description: 'The medal user url',
      required: true,
    })
    .option('downloadDir', {
      description: 'Directory for downloaded video',
      default: './downloads',
      alias: 'd',
    })
    .check(argv => {
      if (!fs.existsSync(argv.downloadDir)) {
        throw new Error(`Error: download directory "${argv.downloadDir}" doesn't exists`);
      }
      return true;
    })
    .option('username', {
      describe: 'Username of the user account',
      required: false,
    })
    .option('password', {
      describe: 'Password of the user account',
      required: false,
    })
    .check(argv => {
      if ((argv.username || argv.password) && !(argv.username && argv.password)) {
        throw new Error('Error: provide username AND password or nothing');
      }
      return true;
    })
    .help()
    .alias('help', 'h')
    .argv;
  outdir = args.downloadDir;
  await run(args.url, args.username, args.password);
}

// url = 'https://medal.tv/users/3658396'
main();
