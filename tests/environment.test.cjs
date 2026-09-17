const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  let now = Date.parse('2026-09-16T14:59:59Z');
  let response = {current:{time:now / 1000, temperature_2m:20.7, weather_code:0}};
  let failure = false;
  const handlers = {};
  const intervals = [];
  const requests = [];
  function card() {
    const nodes = new Map();
    return {
      querySelector: selector => nodes.get(selector),
      set innerHTML(html) {
        for (const name of html.matchAll(/\b(data-[\w-]+)/g)) nodes.set(`[${name[1]}]`, {textContent:'', disabled:false});
      }
    };
  }
  let weather = card();
  const clock = card();
  const context = vm.createContext({
    window:{}, Intl, AbortController,
    Date:class extends Date {constructor(...args) {super(...(args.length ? args : [now]));}},
    document:{
      querySelectorAll: selector => selector === '[data-clock-card]' ? [clock] : [weather],
      addEventListener: (name, callback) => {handlers[name] = callback;}
    },
    setTimeout: () => 1, clearTimeout() {},
    setInterval: (callback, delay) => intervals.push({callback, delay}),
    fetch:async (url, options) => {
      requests.push({url, options});
      if (failure) throw new Error('offline');
      return {ok:true, json:async () => response};
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../docs/design/mockup/environment.js'), 'utf8'), context);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  return {
    clock, requests, intervals,
    weather: () => weather,
    start:async () => {handlers.DOMContentLoaded(); await flush();},
    refresh:async () => {handlers.click({target:{closest:() => true}}); await flush();},
    render: () => context.window.DashboardEnvironment.render(),
    setNow: value => {now = Date.parse(value);},
    setFailure: value => {failure = value;},
    setResponse: value => {response = value;},
    remount: () => {weather = card(); context.window.DashboardEnvironment.render();}
  };
}

test('내수읍 API 조회와 기온·날씨 표시, 10분 갱신, 화면 복귀 시 값 유지', async () => {
  const app = setup();
  await app.start();
  const url = new URL(app.requests[0].url);
  assert.equal(url.searchParams.get('latitude'), '36.7238');
  assert.equal(url.searchParams.get('longitude'), '127.53139');
  assert.equal(url.searchParams.get('timeformat'), 'unixtime');
  assert.equal(app.weather().querySelector('[data-weather-value]').textContent, '21°C · 맑음');
  assert.ok(app.intervals.some(item => item.delay === 600000));
  app.remount();
  assert.equal(app.weather().querySelector('[data-weather-value]').textContent, '21°C · 맑음');
  assert.equal(app.requests.length, 1);
});

test('기기의 로컬 시간대와 무관하게 한국 자정에 날짜·요일 변경', async () => {
  const app = setup();
  await app.start();
  assert.match(app.clock.querySelector('[data-clock-date]').textContent, /16.*수요일/);
  assert.equal(app.clock.querySelector('[data-clock-time]').textContent, '23:59:59');
  app.setNow('2026-09-16T15:00:00Z');
  app.render();
  assert.match(app.clock.querySelector('[data-clock-date]').textContent, /17.*목요일/);
  assert.equal(app.clock.querySelector('[data-clock-time]').textContent, '00:00:00');
});

test('최초 연결 실패와 수동 재시도 성공', async () => {
  const app = setup();
  app.setFailure(true);
  await app.start();
  assert.equal(app.weather().querySelector('[data-weather-value]').textContent, '날씨 확인 불가');
  assert.equal(app.weather().querySelector('[data-weather-refresh]').disabled, false);
  app.setFailure(false);
  await app.refresh();
  assert.equal(app.weather().querySelector('[data-weather-value]').textContent, '21°C · 맑음');
  assert.doesNotMatch(app.weather().querySelector('[data-weather-status]').textContent, /실패/);
});

test('갱신 실패 시 이전 값과 기준 시각 보존, 오래된 자료 표시', async () => {
  const app = setup();
  await app.start();
  app.setNow('2026-09-16T16:00:00Z');
  app.render();
  assert.match(app.weather().querySelector('[data-weather-status]').textContent, /오래된 자료/);
  app.setFailure(true);
  await app.refresh();
  assert.equal(app.weather().querySelector('[data-weather-value]').textContent, '21°C · 맑음');
  assert.match(app.weather().querySelector('[data-weather-status]').textContent, /23:59.*갱신 실패, 이전 자료/);
});

test('누락된 기온을 0도로 표시하지 않고 알 수 없는 날씨 코드를 구분', async () => {
  const app = setup();
  app.setResponse({current:{time:1789561800, temperature_2m:null, weather_code:0}});
  await app.start();
  assert.equal(app.weather().querySelector('[data-weather-value]').textContent, '날씨 확인 불가');
  app.setResponse({current:{time:1789561800, temperature_2m:12, weather_code:999}});
  await app.refresh();
  assert.equal(app.weather().querySelector('[data-weather-value]').textContent, '12°C · 날씨 상태 미제공');
});
