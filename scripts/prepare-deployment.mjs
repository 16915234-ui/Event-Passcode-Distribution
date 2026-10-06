import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
const file='.env.local';
const content=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
if(!/^QR_SIGNING_SECRET=.+/m.test(content)){fs.appendFileSync(file,`\nQR_SIGNING_SECRET=${randomBytes(32).toString('hex')}\n`);console.log('Generated private QR signing key in .env.local (value hidden).');}
