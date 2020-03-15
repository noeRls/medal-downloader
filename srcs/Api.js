const Axios = require('axios').default;

class Api {
    constructor() {
        this.axios = Axios.create({
            withCredentials: true
        });
        this.parseUserUrl = this.constructor.parseUserUrl;
    }

    async authentificate(username, password) {
        if (!username || !password) {
            throw new Error('Username or password missing');
        }
        
        const { data: user } = await this.axios.post('https://api-v2.medal.tv/authentication', {
            password,
            userName: username,
        });
        this.axios.interceptors.request.use(config => {
            config.headers['x-authentication'] = `${user.userId},${user.key}`;
            return config;
        })
    }

    async guestAuthentificate() {
        password = 'superstrongpassword';
        const { data: user } = await axios.post('https://api-v2.medal.tv/users', {
            email: 'guest',
            password,
            userName: 'guest',
        });
        username = user.displayName;
        await this.authentificate(username, password);
    }

    async getUser(userId) {
        const userUrl = `https://api-v2.medal.tv/users/${userId}`;
        const { data: user } = await this.axios.get(userUrl);
        return user;
    }

    async listVideos(userId, max=null) {
        const { data } = await this.axios.get(`https://api-v2.medal.tv/content?userId=${userId}&limit=${max ? max : 1000}`);
        return data;
    }

    static parseUserUrl(userUrl) {
        const found = userUrl.match(/\/users\/([0-9]+(\/|$))/);
        if (!found) return null;
        return found[1];
    }
}

module.exports = Api;