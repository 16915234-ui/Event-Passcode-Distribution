import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
import {spawn} from 'node:child_process';
loadEnvConfig(process.cwd());
const value=process.env.QR_SIGNING_SECRET;
if(!value||value.length<32)throw new Error('Missing QR_SIGNING_SECRET');
// Send the secret over stdin, never as a shell argument or log line.
const child=spawn(process.platform==='win32'?'cmd.exe':'npx',process.platform==='win32'?['/d','/s','/c','npx.cmd vercel env add QR_SIGNING_SECRET production --scope chira3']:['vercel','env','add','QR_SIGNING_SECRET','production','--scope','chira3'],{stdio:['pipe','pipe','pipe']});
child.stdin.end(value);
let output='';child.stdout.on('data',d=>{output+=d;});child.stderr.on('data',d=>{output+=d;});
child.on('close',code=>{console.log(output.replaceAll(value,'[hidden]'));process.exitCode=code||0;});
