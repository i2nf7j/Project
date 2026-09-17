/* 공통 날짜·날씨 카드: DB 없이 두 HTML 목업에서 사용합니다. */
(() => {
  const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=36.7238&longitude=127.53139&current=temperature_2m,weather_code&timezone=Asia%2FSeoul&timeformat=unixtime&forecast_days=1';
  const dateFormat = new Intl.DateTimeFormat('ko-KR', {timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit', weekday:'long'});
  const timeFormat = new Intl.DateTimeFormat('ko-KR', {timeZone:'Asia/Seoul', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'});
  const weatherTimeFormat = new Intl.DateTimeFormat('ko-KR', {timeZone:'Asia/Seoul', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  let current = null;
  let failed = false;
  let loading = false;

  function description(code) {
    if (code === 0) return '맑음';
    if (code === 1) return '대체로 맑음';
    if (code === 2) return '구름 조금';
    if (code === 3) return '흐림';
    if ([45,48].includes(code)) return '안개';
    if ([51,53,55].includes(code)) return '이슬비';
    if ([56,57,66,67].includes(code)) return '어는 비';
    if ([61,63,65].includes(code)) return '비';
    if ([71,73,75,77].includes(code)) return '눈';
    if ([80,81,82].includes(code)) return '소나기';
    if ([85,86].includes(code)) return '눈 소나기';
    if ([95,96,99].includes(code)) return '뇌우';
    return '날씨 상태 미제공';
  }

  function render() {
    const now = new Date();
    document.querySelectorAll('[data-clock-card]').forEach(card => {
      if (!card.querySelector('[data-clock-date]')) card.innerHTML = '<small>현재 날짜 · 한국 표준시</small><strong data-clock-date></strong><span data-clock-time></span><small>기기 시간 기준</small>';
      card.querySelector('[data-clock-date]').textContent = dateFormat.format(now);
      card.querySelector('[data-clock-time]').textContent = timeFormat.format(now);
    });
    document.querySelectorAll('[data-weather-card]').forEach(card => {
      if (!card.querySelector('[data-weather-value]')) card.innerHTML = '<small>제17전투비행단 · 지역 날씨</small><strong data-weather-value></strong><span>청주시 청원구 내수읍</span><small data-weather-status role="status"></small><small>예보 모델 자료 · <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></small><button type="button" data-weather-refresh>날씨 새로고침</button>';
      const stale = current && now.getTime() - current.time * 1000 >= 45 * 60 * 1000;
      card.querySelector('[data-weather-value]').textContent = current ? `${Math.round(current.temperature_2m)}°C · ${description(current.weather_code)}` : (loading ? '불러오는 중…' : '날씨 확인 불가');
      let status = current ? `${weatherTimeFormat.format(new Date(current.time * 1000))} 기준` : '';
      if (failed) status += current ? ' · 갱신 실패, 이전 자료' : '연결을 확인하고 다시 시도해 주세요.';
      else if (stale) status += ' · 오래된 자료';
      else if (loading && current) status += ' · 갱신 중';
      card.querySelector('[data-weather-status]').textContent = status;
      card.querySelector('[data-weather-refresh]').disabled = loading;
    });
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    render();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(weatherUrl, {signal:controller.signal, cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'});
      if (!response.ok) throw new Error('Weather request failed');
      const data = await response.json();
      if (!data.current || !Number.isFinite(data.current.temperature_2m) || !Number.isFinite(data.current.time) || data.current.time <= 0) throw new Error('Weather data unavailable');
      current = data.current;
      failed = false;
    } catch {
      failed = true;
    } finally {
      clearTimeout(timeout);
      loading = false;
      render();
    }
  }

  window.DashboardEnvironment = {render};
  document.addEventListener('click', event => {
    if (event.target.closest('[data-weather-refresh]')) refresh();
  });
  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    setInterval(render, 1000);
    setInterval(refresh, 10 * 60 * 1000);
  });
})();
