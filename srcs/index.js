#!/usr/bin/env node

const Axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');
const yargs = require('yargs');
const ProgressBar = require('progress');
const Api = require('./Api');

let outdir = './downloads';
async function downloadFile(downloadUrl, name, video) {
  const { data, headers } = await Axios({
    url: downloadUrl,
    method: 'GET',
    responseType: 'stream',
  });
  const totalLength = Number(headers['content-length']);

  const downloadDir = path.join(outdir, video.poster.displayName);
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
  }
  const downloadPath = path.join(downloadDir, name);
  if (fs.existsSync(downloadPath)) {
    const stats = fs.statSync(downloadPath);
    if (stats.size >= totalLength) {
      console.log(`${name} -> already downloaded, skipping`);
      return;
    }
  }
  const stream = fs.createWriteStream(downloadPath);

  const progressBar = new ProgressBar(`[:bar] :percent :etas -> ${name}`, {
    width: 40,
    complete: '=',
    incomplete: ' ',
    renderThrottle: 16,
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

const getVideoName = (video) => {
  let name = sanitize(video.contentTitle);
  if (!video.contentTitle || video.contentTitle === 'Untitled') {
    name += `-${video.contentId}`;
  }
  return `${name}.mp4`;
};

async function download(video) {
  const quality = ['1080', '720', '480', '360', '240', '144'];
  const bestQuality = quality.find(q => video[`contentUrl${q}p`]);
  if (!bestQuality) {
    console.error('Failed to find a suitable quality');
    return;
  }
  const downloadUrl = video[`contentUrl${bestQuality}p`];

  const videoName = getVideoName(video);
  try {
    await downloadFile(downloadUrl, videoName, video);
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

async function loadUserId(api, userUrl, username) {
  let userId = null;
  if (userUrl) {
    userId = await api.loadUserIdFromUrl(userUrl);
    if (!userId) {
      console.error(`Invalid user url: ${userUrl}`);
    }
  } else if (username) {
    userId = await api.loadUserIdFromUsername(username);
    if (!userId) {
      console.error(`Invalid username: ${username}`);
    }
  } else {
    console.error('Missing required argument: --username or --url required');
  }
  return userId;
}

async function run(userUrl, username, password, categoryId) {
  const api = new Api();
  try {
    if (username && password) await api.authentificate(username, password);
    else await api.guestAuthentificate();
  } catch (e) {
    console.error(e);
    console.error('Authentification failed');
    return;
  }

  const userId = await loadUserId(api, userUrl, username);
  if (!userId) {
    return;
  }

  try {
    const user = await api.getUser(userId);
    console.log(`${user.displayName} have ${user.submissions} videos`);
    const videos = await api.listVideos(userId, null, categoryId);
    console.log(`${videos.length} videos downloadable`);
    await downloadAll(videos, 1);
  } catch (e) {
    console.error(e);
    console.error('An error occured');
  }
}

async function main() {
  const args = yargs
    .usage('Usage: $0 --username [username]')
    .option('url', {
      description: 'The medal user url',
      required: false,
    })
    .option('downloadDir', {
      description: 'Directory for downloaded video',
      default: './downloads',
      alias: 'd',
    })
    .check(argv => {
      if (!fs.existsSync(argv.downloadDir)) {
        fs.mkdirSync(argv.downloadDir);
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
      if (!argv.username && !argv.url) {
        throw new Error('Missing required argument: username or url');
      }
      return true;
    })
    .option('categoryId', {
      describe:
            'Category Id of a game (https://api-v2.medal.tv/categories)',
      required: false,
    })
    .help()
    .alias('help', 'h')
    .argv;
  outdir = args.downloadDir;
  await run(args.url, args.username, args.password, args.categoryId);
}

// url = 'https://medal.tv/users/3658396'
main();
