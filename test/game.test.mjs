import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent } from '../server.mjs';
test('comment chooses a team and appears on leaderboard',()=>{const state=applyEvent({type:'comment',user:'An',text:'ĐỎ'});assert.equal(state.leaders[0].name,'An');assert.equal(state.leaders[0].team,'red')});
