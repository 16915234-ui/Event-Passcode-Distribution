import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {paginationOptions,eventQueryOptions} from '../src/lib/query-options';
import {createRefreshScheduler} from '../src/lib/refresh-scheduler';
import {beginActivity,activitySnapshot,subscribeActivity} from '../src/lib/request-activity';

test('paging bounds requests and sanitizes search grammar',()=>{
  assert.deepEqual(paginationOptions(new URLSearchParams()),{page:1,pageSize:50,from:0,to:49,search:''});
  const page=paginationOptions(new URLSearchParams('page=2&pageSize=500&q=00123'));
  assert.deepEqual(page,{page:2,pageSize:100,from:100,to:199,search:'00123'});
  for(const value of ['-1','NaN','Infinity','1.5','0']) assert.equal(paginationOptions(new URLSearchParams({page:value})).page,1);
  assert.equal(eventQueryOptions(new URLSearchParams('view=secret')).view,'roster');
  assert.equal(eventQueryOptions(new URLSearchParams('view=summary')).view,'summary');
  assert.ok(!/[,()%"\\]/.test(paginationOptions(new URLSearchParams({q:'name,or(x)%"\\'})).search));
});

test('realtime bursts use one in-flight request and one trailing refresh',async()=>{
  let calls=0,release:()=>void=()=>{};
  const scheduler=createRefreshScheduler(async()=>{calls++;if(calls===1)await new Promise<void>(resolve=>{release=resolve;});},5);
  for(let i=0;i<100;i++)scheduler.schedule();
  await delay(25);assert.equal(calls,1);
  for(let i=0;i<100;i++)scheduler.schedule();
  await delay(25);assert.equal(calls,1);
  release();await delay(30);assert.equal(calls,2);
  scheduler.schedule();scheduler.dispose();await delay(20);assert.equal(calls,2);
});

test('failed refresh does not wedge future realtime requests',async()=>{
  let calls=0;
  const scheduler=createRefreshScheduler(async()=>{calls++;throw new Error('offline');},5);
  scheduler.schedule();await delay(25);scheduler.schedule();await delay(25);
  scheduler.dispose();assert.equal(calls,2);
});

test('global request indicator tracks overlapping requests and idempotent cleanup',()=>{
  const states:number[]=[];const unsubscribe=subscribeActivity(()=>states.push(activitySnapshot()));
  const finish1=beginActivity(),finish2=beginActivity();
  assert.equal(activitySnapshot(),2);finish1();finish1();assert.equal(activitySnapshot(),1);
  finish2();unsubscribe();assert.equal(activitySnapshot(),0);assert.deepEqual(states,[1,2,1,0]);
});
