const Axios = require('axios').default;
const fs = require('fs');
const path = require('path');

const userId = 3658396;
const JSSoup = require('jssoup').default;

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

async function download(video) {
    const outdir = "./downloads";
    const quality = ["1080", "720", "480", "360", "240", "144"];
    let bestQuality = quality.find(q => video[`contentUrl${q}p`]);
    if (!bestQuality) {
        console.error('Failed to find a suitable quality');
        return;
    }
    const downloadUrl = video[`contentUrl${bestQuality}p`];
    const downloadPath = path.join(outdir, `${video.contentTitle}.mp4`);
    Axios.get(downloadUrl, {
        responseType: 'stream'
    }).then(res => {
        res.data.pipe(fs.createWriteStream(downloadPath));
    });
    console.log(downloadUrl)
}

async function main() {
    try {
        const { axios, user: guest } = await authentificate();
        const userUrl = `https://api-v2.medal.tv/users/${userId}`;
        const { data: user } = await axios.get(userUrl);
        console.log(`${user.displayName} have ${user.submissions} public videos`);
        const { data } = await axios.get(`https://api-v2.medal.tv/content?userId=${userId}&limit=1000`);
        console.log(`${data.length} videos downloadable`);
        await download(data[0]);
        // await Promise.all(data.map(d => download(d)));
    } catch (e) {
        console.log(e);
        console.log(e.response.data)
        console.log(e.response.status)
    }
}

main().catch(console.error);