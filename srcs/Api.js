const Axios = require('axios').default;

class Api {
  constructor() {
    this.axios = Axios.create({
      withCredentials: true,
    });
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
    });
  }

  async guestAuthentificate() {
    const password = 'superstrongpassword';
    const { data: user } = await this.axios.post('https://api-v2.medal.tv/users', {
      email: 'guest',
      password,
      userName: 'guest',
    });
    const username = user.displayName;
    await this.authentificate(username, password);
  }

  async getUser(userId) {
    const userUrl = `https://api-v2.medal.tv/users/${userId}`;
    const { data: user } = await this.axios.get(userUrl);
    return user;
  }

  async listVideos(userId, max = null, categoryId = null) {
    let objs = [];
    let data = null;
    let offset = 0;
    const category = categoryId ? `&categoryId=${categoryId}` : '';
    const maxPerRequest = 1000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const limit = max ? Math.min(max - offset, maxPerRequest) : maxPerRequest;
      data = (
        // eslint-disable-next-line no-await-in-loop
        await this.axios.get(
          `https://api-v2.medal.tv/content?userId=${userId}${category}&limit=${limit}&offset=${offset}`,
        )
      ).data;

      objs = [...objs, ...data];
      offset += data.length;
      if (data.length === 0 || data.length < limit || limit < maxPerRequest) { break; }
    }
    return objs;
  }

  async loadUserIdFromUsername(username, password) {
    try {
      const url = "https://api-v2.medal.tv/authentication"
      const { data } = await this.axios.post(url, {
            userName: username,
            password: password
      });
      const userIdInResponse = data.userId
      if (userIdInResponse) {
        return userIdInResponse;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  async loadUserIdFromUrl(userUrl) {
    const userIdInUrl = userUrl.match(/\/users\/([0-9]+(\/|$))/);
    if (userIdInUrl && userIdInUrl[1]) {
      return userIdInUrl[1];
    }
    const usernameInUrl = userUrl.match(/\/u\/(.+)/);
    if (usernameInUrl && usernameInUrl[1]) {
      return this.loadUserIdFromUsername(usernameInUrl[1]);
    }
    return null;
  }
}

module.exports = Api;
