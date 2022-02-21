# Medal-downloader

[![npm](https://img.shields.io/npm/v/medal-downloader.svg)](https://www.npmjs.com/package/medal-downloader)
[![npm](https://img.shields.io/npm/l/medal-downloader.svg)](https://github.com/faressoft/medal-downloader/blob/master/LICENSE)

Download all your [medal](https://medal.tv/) videos

<p align="center"><img src="/img/demo.gif?raw=true"/></p>

## Installation

You need to install [Node.js](https://nodejs.org/en/download/) first, then install the tool globally using this command:

```bash
npm install -g medal-downloader
```

## Usage

### Public videos

**With username**

```bash
medal-downloader --username [username]
```

**With profile url**


```bash
medal-downloader --url [userurl]
```

The medal user url is the url of the profile page on the website.

### Unlisted videos

To download your unlisted videos you must provide your username and password this way:

```bash
medal-downloader --password [password] --username [username]
```
### Help

```
Usage: medal-downloader --username [username]

Options:
  --version          Show version number                               [boolean]
  --url              The medal user url
  --downloadDir, -d  Directory for downloaded video     [default: "./downloads"]
  --username         Username of the user account
  --password         Password of the user account
  --help, -h         Show help                                         [boolean]
```