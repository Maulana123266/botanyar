process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
process.on('uncaughtException', console.error)

import './config.js'
import cfonts from 'cfonts'
import Connection from './lib/connection.js'
import Helper from './lib/helper.js'
import db from './lib/database.js'
import clearTmp from './lib/clearTmp.js'
import clearSessions from './lib/clearSessions.js'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { spawn } from 'child_process'
import { protoType, serialize } from './lib/simple.js'
import {
    plugins,
    loadPluginFiles,
    reload,
    pluginFolder,
    pluginFilter
} from './lib/plugins.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url) // Adjusted here
const args = [join(__dirname, 'main.js'), ...process.argv.slice(2)]
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000
const { say } = cfonts
const { name, author } = require(join(__dirname, './package.json'))

say('Lightweight\nWhatsApp Bot', {
    font: 'chrome',
    align: 'center',
    gradient: ['red', 'magenta']
})
say(`'${name}' By @${author.name || author}`, {
    font: 'console',
    align: 'center',
    gradient: ['red', 'magenta']
})

say([process.argv[0], ...args].join(' '), {
    font: 'console',
    align: 'center',
    gradient: ['red', 'magenta']
})

protoType()
serialize()

Object.assign(global, {
    ...Helper,
    timestamp: {
        start: Date.now()
    }
})

// global.opts['db'] = process.env['db']

/** @type {import('./lib/connection.js').Socket} */
const conn = Object.defineProperty(Connection, 'conn', {
    value: await Connection.conn,
    enumerable: true,
    configurable: true,
    writable: true
}).conn

loadPluginFiles(pluginFolder, pluginFilter, {
    logger: conn.logger,
    recursiveRead: true
}).then(_ => console.log(Object.keys(plugins)))
    .catch(console.error)

if (!opts['test']) {
    setInterval(async () => {
        await Promise.allSettled([
            db.data ? db.write() : Promise.reject('db.data is null'),
            clearTmp(),
            clearSessions()
        ])
    }, 1000 * 60 * 5)
}
if (opts['server']) (await import('./server.js')).default(conn, PORT)

async function _quickTest() {
    let test = await Promise.all([
        spawn('ffmpeg'),
        spawn('ffprobe'),
        spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
        spawn('convert'),
        spawn('magick'),
        spawn('gm'),
        spawn('find', ['--version'])
    ].map(p => {
        return Promise.race([
            new Promise(resolve => {
                p.on('close', code => {
                    resolve(code !== 127)
                })
            }),
            new Promise(resolve => {
                p.on('error', _ => resolve(false))
            })
        ])
    }))
    let [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test
    let s = global.support = {
        ffmpeg,
        ffprobe,
        ffmpegWebp,
        convert,
        magick,
        gm,
        find
    }
    Object.freeze(global.support)

    if (!s.ffmpeg) (conn?.logger || console).warn('Please install ffmpeg for sending videos (pkg install ffmpeg)')
    if (s.ffmpeg && !s.ffmpegWebp) (conn?.logger || console).warn('Stickers may not animated without libwebp on ffmpeg (--enable-libwebp while compiling ffmpeg)')
    if (!s.convert && !s.magick && !s.gm) (conn?.logger || console).warn('Stickers may not work without imagemagick if libwebp on ffmpeg doesnt isntalled (pkg install imagemagick)')
}

_quickTest()
    .then(() => (conn?.logger?.info || console.log)('Quick Test Done'))
    .catch(console.error)