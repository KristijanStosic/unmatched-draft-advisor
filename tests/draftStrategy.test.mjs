import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { recommendPicks, visibleDraftHeroes, draftPhase, banSteps, recommendSelfBans, recommendOpponentBans } from '../src/lib/draftStrategy.js';

const index = new Map([
  ['alpha|enemy', { games: 10, wins: 4 }],
  ['zeta|enemy', { games: 20, wins: 16 }],
  ['beta|enemy', { games: 30, wins: 24 }],
  ['zero|enemy', { games: 10, wins: 0 }],
  ['zeta|enemy2', { games: 80, wins: 24 }],
]);
const candidates = ['alpha', 'beta', 'missing', 'zero', 'zeta'];
const roster = [{ slug: 'alpha', winRate: 90, games: 100 }, { slug: 'zeta', winRate: 60, games: 50 }];
const overall = new Map([['beta', { winRate: 70, games: 200 }], ['missing', { winRate: 99, games: 500 }]]);


test('phase order is picks, both cross bans, both self bans, done; undo reverses it', () => {
  assert.deepEqual([[7,0,0],[8,0,0],[8,1,0],[8,2,0],[8,2,1],[8,2,2]].map(args => draftPhase(...args)), ['pick','cross','cross','self','self','done']);
  assert.equal(draftPhase(8,2,1), 'self');
  assert.equal(draftPhase(8,1,0), 'cross');
});

test('self-ban evaluates the final 2v2, without another cross ban', () => {
  const mine = ['strong','medium','weak'];
  const theirs = ['e','f','g'];
  const data = new Map(mine.flatMap((a,i) => theirs.map(b => [a+'|'+b, {games:10,wins:9-i*4}])));
  const rows = recommendSelfBans(data,mine,theirs);
  assert.equal(rows[0].slug,'weak');
  assert.equal(rows[0].score,70);
  assert.equal(recommendSelfBans(data,mine,['e','f'],true)[0].score,70);
  for(const already of [false,true]) {
    const bans = recommendOpponentBans(data,already ? mine : [...mine,'fourth'],[...theirs,'h'],already);
    assert.equal(bans.length,4);
    assert(bans.every(r => Number.isFinite(r.score)));
  }
});

test('self-ban UI ranks both players using only survivors of cross bans', () => {
  const source = readFileSync(new URL('../src/components/DraftFlow.jsx', import.meta.url), 'utf8');
  const expression = source.match(/const rankings =\s*([\s\S]*?);\r?\n  const ranked/)[1];
  const calculate = new Function('ctx', 'with(ctx) { return '+expression+'; }');
  const myAfterCross=['a','b','c'], theirAfterCross=['e','f','g'];
  for(const phaseWho of ['me','opponent']) for(const already of [false,true]) {
    let args;
    const ctx={phase:'self',phaseWho,index:new Map(),myAfterCross,theirAfterCross,
      myFinal:['a','b'],theirFinal:['e','f'],selfMine:already?'c':null,selfTheirs:already?'g':null,
      recommendSelfBans:(...values)=>{args=values;return values[1].map(slug=>({slug,score:50}));}};
    const rows=calculate(ctx);
    assert.equal(rows.length,3);
    assert.deepEqual(args[1],phaseWho==='me'?myAfterCross:theirAfterCross);
    assert.deepEqual(args[2],phaseWho==='me'?(already?ctx.theirFinal:theirAfterCross):(already?ctx.myFinal:myAfterCross));
    assert.equal(args[3]===true,already);
  }
});

test('matchup WR descends, ties use games, 0% precedes N/A, baseline never replaces missing matchups', () => {
  const rows = recommendPicks(index, candidates, ['enemy'], roster, overall);
  assert.deepEqual(rows.map(r => r.slug), ['beta', 'zeta', 'alpha', 'zero', 'missing']);
  assert.equal(rows[0].games, 30);
  assert.equal(rows.at(-1).score, null);
  assert.equal(rows.at(-1).games, 0);
});

test('multiple enemies use total wins / total games and skip unknown matchups', () => {
  const rows = recommendPicks(index, candidates, ['enemy', 'enemy2', 'unknown'], roster, overall);
  const zeta = rows.find(r => r.slug === 'zeta');
  assert.equal(zeta.score, 40);
  assert.equal(zeta.games, 100);
  assert.equal(zeta.covered, 2);
  assert.equal(zeta.possible, 3);
});

test('opening estimates prefer roster WR, then overall, with matching game count', () => {
  const rows = recommendPicks(index, candidates, [], roster, overall);
  assert.deepEqual(rows.map(r => r.slug), ['missing', 'alpha', 'beta', 'zeta', 'zero']);
  assert.equal(rows.find(r => r.slug === 'alpha').games, 100);
  assert.equal(rows.find(r => r.slug === 'beta').games, 200);
  assert.equal(rows.at(-1).score, null);
});

test('rendered cards follow ranks, search preserves ranks, opponent choices retain original order', () => {
  const heroes = candidates.map(slug => ({ slug, name: slug }));
  const rows = recommendPicks(index, candidates, ['enemy'], roster, overall);
  assert.deepEqual(visibleDraftHeroes(heroes, candidates, rows, '', true).map(h => h.slug), rows.map(r => r.slug));
  assert.deepEqual(visibleDraftHeroes(heroes, candidates, rows, 'a', true).map(h => h.slug), ['beta', 'zeta', 'alpha']);
  assert.deepEqual(visibleDraftHeroes(heroes, candidates, rows, '', false).map(h => h.slug), candidates);
  assert.deepEqual(visibleDraftHeroes(heroes, ['alpha'], rows, '', true).map(h => h.slug), ['alpha']);
});


test('leader starts each ban phase, and history restores the correct actor after undo', () => {
  for (const leader of ['me','opponent']) {
    const follower=leader==='me'?'opponent':'me';
    const steps=banSteps(leader);
    assert.deepEqual(steps.map(s=>[s.phase,s.who]), [['cross',leader],['cross',follower],['self',leader],['self',follower]]);
    const history=[];
    const active=()=>steps.find(s=>!history.some(h=>h.phase===s.phase&&h.who===s.who));
    for(const step of steps) {
      assert.equal(active(),step);
      assert(step.title.length && step.instruction.length);
      history.push({phase:step.phase,who:step.who});
    }
    assert.equal(active(),undefined);
    for(let i=3;i>=0;i--) {history.pop();assert.equal(active(),steps[i]);}
  }
});
import { pickOrder, evaluateTeams } from '../src/lib/draftStrategy.js';
import { analyzePool } from '../src/lib/draftAnalysis.js';

test('all formats complete with correct teams for either Leader and reverse through undo', () => {
  for (const format of [4,5,6]) for (const leader of ['me','opponent']) {
    const order = pickOrder(format);
    assert.equal(order.length,format*2);
    const groups=[];
    for(const role of order) {
      if(groups.at(-1)?.role===role) groups.at(-1).count++;
      else groups.push({role,count:1});
    }
    assert.deepEqual(groups.map(g=>g.count),format===4?[1,2,2,2,1]:format===5?[1,2,2,2,2,1]:Array(12).fill(1));
    const history=[];
    const phase=()=>draftPhase(history.filter(h=>h.phase==='pick').length,history.filter(h=>h.phase==='cross').length,history.filter(h=>h.phase==='self').length,format,history.filter(h=>h.phase==='pre').length);
    if(format!==6) for(let i=0;i<4;i++) {assert.equal(phase(),'pre');history.push({phase:'pre'});}
    const teams={me:[],opponent:[]};
    for(const [i,role] of order.entries()) {
      assert.equal(phase(),'pick');
      const who=role==='leader'?leader:leader==='me'?'opponent':'me';
      teams[who].push(`hero${i}`);history.push({phase:'pick'});
    }
    assert.equal(teams.me.length,format);assert.equal(teams.opponent.length,format);
    if(format!==6) for(const step of banSteps(leader)) {
      assert.equal(phase(),step.phase);
      teams[step.phase==='self'?step.who:step.who==='me'?'opponent':'me'].pop();
      history.push(step);
    }
    assert.equal(phase(),'done');
    assert.equal(teams.me.length,format===6?6:format-2);
    assert.equal(teams.opponent.length,format===6?6:format-2);
    while(history.length) {const last=history.pop();assert.equal(phase(),last.phase);}
  }
});

test('manual bans of 3, 5 or 10 heroes never enter active statistics or recommendations', () => {
  const heroes=Array.from({length:24},(_,i)=>({slug:`h${i}`,name:`Hero ${i}`}));
  const data=new Map(heroes.flatMap(a=>heroes.filter(b=>a!==b).map(b=>[`${a.slug}|${b.slug}`,{games:10,wins:6}])));
  for(const count of [3,5,10]) {
    const banned=heroes.slice(0,count).map(h=>h.slug);
    const pool=heroes.filter(h=>!banned.includes(h.slug)).map(h=>h.slug);
    const stats=analyzePool(heroes,pool,data);
    assert.equal(stats.length,24-count);
    for(const row of stats) {
      assert(!banned.includes(row.slug));assert.equal(row.games,(pool.length-1)*10);
      assert(row.details.every(d=>!banned.includes(d.slug)));
    }
    const enemies=pool.slice(0,6);
    const rows=recommendPicks(data,pool.slice(6),enemies,stats,new Map());
    assert(rows.every(r=>!banned.includes(r.slug)&&r.possible===6&&r.games===60));
    assert.equal(evaluateTeams(data,pool.slice(6,12),enemies).possible,36);
  }
});
