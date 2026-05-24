import fs from 'fs'
import pngToIco from 'png-to-ico'

const square = 'resources/icon-square.png'
const ico = await pngToIco(square)
fs.writeFileSync('resources/icon.ico', ico)
console.log('icon.ico', ico.length, 'bytes')
