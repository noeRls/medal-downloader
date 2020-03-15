const Axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const sanitize = require("sanitize-filename");
const yargs = require('yargs');
const Api = require('./Api');

let outdir = "./downloads";
async function downloadFile(downloadUrl, name) {
    const downloadPath = path.join(outdir, name);
    const stream = fs.createWriteStream(downloadPath);
    Axios.get(downloadUrl, {
        responseType: 'stream'
    }).then(res => {
        res.data.pipe(stream);
    });

    return new Promise((res, rej) => {
        stream.on('finish', res);
        stream.on('error', rej);
    })
}

async function download(video) {
    const quality = ["1080", "720", "480", "360", "240", "144"];
    let bestQuality = quality.find(q => video[`contentUrl${q}p`]);
    if (!bestQuality) {
        console.error('Failed to find a suitable quality');
        return;
    }
    const downloadUrl = video[`contentUrl${bestQuality}p`];
    const videoName = `${sanitize(video.contentTitle)}.mp4`;

    console.log(`Starting download: ${bestQuality}p - "${videoName}"`)
    try {
        await downloadFile(downloadUrl, videoName)
        console.log(`Downloaded: ${bestQuality}p - "${videoName}"`);
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
            while (current >= maxSimultaneous) await sleep(100);
            current += 1
            await download(d)
        } catch (e) {
        }
        current -= 1;
    }));
}

async function run(userUrl, username, password, maxSimultaneous) {
    const userId = Api.parseUserUrl(userUrl);
    if (!userId) {
        return console.error(`Invalid user url: ${userUrl}`);
    }
    console.log(`User id: ${userId}`)

    const api = new Api();

    try {
        if (username && password) await api.authentificate(username, password);
        else await api.guestAuthentificate();
    } catch (e) {
        return console.error('Authentification failed');
    }

    try {
        const user = await api.getUser(userId)
        console.log(`${user.displayName} have ${user.submissions} public videos`);
        const videos = await api.listVideos(userId);
        console.log(`${videos.length} videos downloadable`);
        await downloadAll(videos, maxSimultaneous);
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
            alias: 'd'
        })
        .check(argv => {
            if (!fs.existsSync(argv.downloadDir)) {
                throw new Error(`Error: download directory "${argv.downloadDir}" doesn't exists`);
            }
            return true;
        })
        .option('maxSimultaneous', {
            describe: 'Specify the maximum number of simulaneous download',
            default: 10
        })
        .option('username', {
            describe: 'Username of the user account',
            required: false
        })
        .option('password', {
            describe: 'Password of the user account',
            required: false
        })
        .check(argv => {
            if ((argv.username || argv.password) && !(argv.username && argv.password)) {
                throw new Error('Error: provide username AND password or nothing');
            }
            return true;
        })
        .help()
        .alias('help', 'h')
        .argv
    outdir = args.downloadDir;
    return await run(args.url, args.username, args.password, args.maxSimultaneous);
}

// url = 'https://medal.tv/users/3658396'
main();