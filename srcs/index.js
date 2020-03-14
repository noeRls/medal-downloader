const Axios = require('axios').default;
const fs = require('fs');
const path = require('path');

async function authentificate() {
    const axios = Axios.create({
        withCredentials: true
    });
    const password = 'superstrongpassword';
    const { data: user } = await axios.post('https://api-v2.medal.tv/users', {
        email: 'guest',
        password,
        userName: 'guest',
    });
    const { data: keys } = await axios.post('https://api-v2.medal.tv/authentication', {
        password,
        userName: user.displayName,
    });
    axios.interceptors.request.use(config => {
        config.headers['x-authentication'] = `${user.userId},${keys.key}`;
        return config;
    })
    return { axios, user: {...user, ...keys} };
}

async function downloadFile(downloadUrl, name) {
    const outdir = "./downloads";
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
    const videoName = `${video.contentTitle}.mp4`;

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

function parseUserUrl(userUrl) {
    const found = userUrl.match(/\/users\/([0-9]+(\/|$))/);
    if (!found) return null;
    return found[1];
}

async function main(userUrl) {
    const userId = parseUserUrl(userUrl);
    if (!userId) {
        return console.error(`Invalid user url: ${userUrl}`);
    }
    console.log(`User id: ${userId}`)
    try {
        const { axios } = await authentificate();
        const userUrl = `https://api-v2.medal.tv/users/${userId}`;
        const { data: user } = await axios.get(userUrl);
        console.log(`${user.displayName} have ${user.submissions} public videos`);
        const { data } = await axios.get(`https://api-v2.medal.tv/content?userId=${userId}&limit=2`);
        console.log(`${data.length} videos downloadable`);
        await Promise.all(data.map(async d => {
            try {
                await download(d)
            } catch (e) {
            }
        }));
    } catch (e) {
        console.error(e);
        console.error('An error occured');
    }
}

main('https://medal.tv/users/3658396');