const E = require('./engine.js');
const eq=(a,b,m)=>{ if(JSON.stringify(a)!==JSON.stringify(b)){console.log('FAIL',m,a,b);process.exitCode=1}};
const u=(nums,c=2)=>E.analyse(nums,c).used;
eq(u([1,4,4],1),[1],'1+4+4');
eq(u([2,3]),[2],'2+3');
eq(u([26,9]),[9],'26+9');
eq(u([5,9]),[27],'5+9');
eq(u([14,-9]),[31],'14-9');
eq(u([12,-9]),[18],'12-9');
eq(u([5,-4]),[5],'5-4');
eq(u([7,-6]),[],'7-6 direct');
eq(u([6,-3]),[6],'6-3');
eq(u([45,9]),[27,4],'45+9 mixed then carry formula 4');
eq(u([13,-7]),[33],'13-7');
eq(u([16,-7]),[20],'16-7 direct borrow');
eq(u([19,1]),[17],'19+1');
eq(u([15,7]),[29],'15+7');
eq(E.analyse([8,5],1),null,'overflow 1col');
// arithmetic consistency
for(let i=0;i<20000;i++){const c=1+Math.floor(Math.random()*3);const lim=10**c-1;const a=Math.floor(Math.random()*(lim+1));const v=(Math.random()<.5?1:-1)*(1+Math.floor(Math.random()*lim));const r=E.applyStep(a,v,c);const exp=a+v;if(exp<0||exp>lim){if(r.ok){console.log('should fail',a,v,c);process.exitCode=1;break}}else if(!r.ok||r.total!==exp){console.log('bad',a,v,c,r);process.exitCode=1;break}}
// all lessons
let t0=Date.now();
for(const L of E.LESSONS){for(const d of L.digitsOpts)for(const rows of [3,4,5]){const s=Date.now();const set=E.genSet(L,{count:30,rows,digits:d});const ms=Date.now()-s;
 let bad=0;for(const p of set){const a=E.analyse(p.nums,d);if(!a||a.total!==p.ans||a.used.some(n=>n>L.max))bad++; if(L.targets&&!L.isTest&&!a.used.includes(L.formula))bad++;}
 if(set.length<30||bad||ms>1500)console.log(L.id,'d',d,'rows',rows,'n',set.length,'bad',bad,'ms',ms);}}
console.log('total ms',Date.now()-t0);
const L=E.LESSONS.find(l=>l.id==='f9');console.log(E.genSet(L,{count:6,rows:4,digits:2}).map(p=>p.nums.join(' ')+' = '+p.ans+' ['+p.used+']').join('\n'));
const T=E.LESSONS.find(l=>l.id==='tgmix');console.log(E.genSet(T,{count:6,rows:4,digits:2}).map(p=>p.nums.join(' ')+' = '+p.ans+' ['+p.used+']').join('\n'));
const B=E.LESSONS.find(l=>l.id==='b2');console.log(E.genSet(B,{count:3,rows:4,digits:2}).map(p=>p.nums.join(' ')+' = '+p.ans).join('\n'));
