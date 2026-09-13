"use strict";
const $ = (s) => document.querySelector(s);
const main = $("#main");
const titles = {dashboard:"대시보드",systems:"정보통신 운영현황",cpcon:"CPCON",gps:"GPS 전파교란 위기경보단계",personnel:"병력 현황",duty:"근무자(야간)",notices:"지시사항",request:"정비 요청",intake:"정비 접수",work:"정비 진행",summary:"정비 현황"};
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const badge = (label, color="blue") => `<span class="badge ${color}">${escapeHTML(label)}</span>`;
const tasks = [
  {id:"W-0909-01",request:"R-260908-004",title:"교육장 스위치 정기 점검",dept:"네트워크체계팀",status:"작업 중",priority:"일반",time:"09.09 15:00",memo:"가상 교육장 스위치 2대, 계획정비"},
  {id:"W-0909-02",request:"R-260909-003",title:"행정망 단말 연결 점검",dept:"네트워크체계팀",status:"작업 중",priority:"긴급",time:"09.09 10:00",memo:"가상 행정실 단말 3대, 장애조치"},
  {id:"W-0909-03",request:"R-260908-005",title:"무전기 송수신 점검",dept:"무선체계팀",status:"작업 예정",priority:"일반",time:"09.10 09:00",memo:"가상 훈련용 무전기 정기 점검"},
  {id:"W-0909-04",request:"R-260908-006",title:"교환기 부품 교체",dept:"유선체계팀",status:"보류",priority:"일반",time:"일정 미정",memo:"보류 사유: 시연용 교체 부품 입고 대기"},
  {id:"W-0909-05",request:"R-260908-007",title:"상황실 전화기 점검",dept:"유선체계팀",status:"조치 완료",priority:"일반",time:"09.09 11:00",memo:"시험 통화 정상 확인. BNOC 최종 종결 대기"},
  {id:"W-0909-06",request:"R-260907-002",title:"교육용 PC 점검",dept:"네트워크체계팀",status:"조치 완료",priority:"일반",time:"09.09 09:30",memo:"가상 교육용 PC 10대, 단일 부서 작업 1건. BNOC 종결 완료"}
];
const requests = [
  {id:"R-260909-001",title:"교육장 네트워크 연결 불가",dept:"가상 교육중대",status:"접수 대기",priority:"긴급",memo:"가상 교육장 유선 연결 불가. 희망 부서: 미지정"},
  {id:"R-260909-002",title:"모니터 2대 점검 요청",dept:"가상 지원중대",status:"접수 대기",priority:"일반",memo:"모니터 2대 화면 출력 불가. 희망 부서: 네트워크체계팀"},
  {id:"R-260909-008",title:"사무실 전화기 잡음",dept:"가상 본부중대",status:"접수 대기",priority:"일반",memo:"통화 중 잡음 발생. 희망 부서: 미지정"},
  {id:"R-260908-007",title:"상황실 전화기 점검",dept:"가상 본부중대",status:"종결 대기",priority:"일반",memo:"관련 작업 W-0909-05 조치 완료. BNOC 확인 후 종결"}
];
const statusColor = (s) => ({"작업 중":"blue","작업 예정":"gray","보류":"amber","조치 완료":"green","접수 대기":"amber","종결 대기":"green","주간":"green","오프":"blue","휴가":"amber","출장":"blue","미입력":"gray"}[s] || "gray");
const panel = (title, body, link="") => `<section class="panel"><div class="section-heading"><h2>${title}</h2>${link}</div>${body}</section>`;
const more = (route) => `<a href="#${route}">전체 보기 ›</a>`;
function systems() {
  return [["▤","네트워크체계","행정망 · 교육망","정상","green"],["⌁","유선통신체계","교환기 · 전화회선","점검 중","amber"],["◉","무선통신체계","무전기 · 중계장비","정상","green"],["▣","정보보호체계","보안장비 · 접근통제","정상","green"]].map(([icon,name,sub,state,color])=>`<div class="system-row"><span class="system-symbol">${icon}</span><div><strong>${name}</strong><small>${sub}</small></div>${badge(state,color)}</div>`).join("");
}
function duty() {
  return [["통신일직","대위 이가상","DEMO-1001"],["작통일직","중사 박가상","DEMO-1002"],["생활관 근무","하사 최가상","DEMO-1003"]].map(([role,name,phone])=>`<div class="duty-row"><div><strong>${role}</strong><small>가상 제1통신대대 소속</small></div><div><strong>${name}</strong><small>${phone}</small></div></div>`).join("");
}
function summary() {
  return `<div class="summary-total"><strong>6</strong><span>배정 작업</span><small>09.09 현재 · 상세 등록분</small></div><div class="bar" role="img" aria-label="작업 예정 1건, 작업 중 2건, 보류 1건, 조치 완료 2건"><span style="width:16.667%;background:#bdc8db"></span><span style="width:33.333%;background:#6581ea"></span><span style="width:16.667%;background:#e9b559"></span><span style="width:33.333%;background:#56b79b"></span></div><div class="legend-grid">${[["작업 예정",1,"gray"],["작업 중",2,"blue"],["보류",1,"amber"],["조치 완료",2,"green"]].map(([s,n,c])=>`<a class="legend-item" href="#work?status=${encodeURIComponent(s)}"><i class="dot ${c}"></i>${s}<strong>${n}</strong></a>`).join("")}</div><div class="summary-note">미완료 4건 · 조치 완료와 BNOC 종결은 별도 단계</div>`;
}
let calendarMonth = 8;
let calendarYear = 2026;
function calendar() {
  const start = new Date(calendarYear,calendarMonth,1).getDay();
  const count = new Date(calendarYear,calendarMonth+1,0).getDate();
  const cells = Math.ceil((start+count)/7)*7;
  return `<div class="calendar-title"><span>${calendarYear}년 ${calendarMonth+1}월</span><div><button data-month="-1" aria-label="이전 달">‹</button><button data-month="1" aria-label="다음 달">›</button></div></div><div class="mini-calendar">${["일","월","화","수","목","금","토"].map(d=>`<span class="weekday">${d}</span>`).join("")}${Array.from({length:cells},(_,i)=>{const d=i-start+1;return d<1||d>count?'<span class="day outside"></span>':`<button class="day ${calendarYear===2026&&calendarMonth===8&&d===9?"selected":""} ${calendarYear===2026&&calendarMonth===8&&[9,10].includes(d)?"event":""}" data-day="${d}" aria-label="${calendarMonth+1}월 ${d}일 일정">${d}</button>`}).join("")}</div><div id="calendar-events"><a href="#work" class="calendar-event"><strong>15:00 교육장 스위치 정기 점검</strong><small>네트워크체계팀 · 9월 9일</small></a></div>`;
}
function dashboard() {
  return `<div class="status-strip"><a href="#cpcon" class="status-card"><span class="status-icon">♧</span><div><small>CPCON · 시연값</small><strong>단계 5</strong></div>${badge("정상","green")}</a><a href="#gps" class="status-card"><span class="status-icon">◎</span><div><small>GPS 전파교란 · 시연값</small><strong>정상</strong></div>${badge("이상 없음","green")}</a><div class="status-card"><span class="status-icon">▦</span><div><small>수요일 · 시연 기준일</small><strong>2026. 09. 09.</strong></div></div></div><div class="dashboard-grid">${panel("정보통신 운영현황",systems(),more("systems"))}${panel("정비 캘린더",'<div id="calendar">'+calendar()+'</div>',more("work"))}${panel("오늘 근무자 <small>야간</small>",'<p class="muted">제1통신대대 · 09.09 18:00 ~ 09.10 09:00</p>'+duty(),more("duty"))}${panel("부대 정비 요약",summary(),more("summary"))}</div>`;
}
function table(rows, isRequest=false) {
  return `<div class="table-wrap"><table><thead><tr><th>${isRequest?"요청":"작업"} ID / 내용</th><th>${isRequest?"요청 부서":"담당 부서"}</th><th>우선순위</th><th>상태</th><th>상세</th></tr></thead><tbody>${rows.length?rows.map(t=>`<tr><td class="cell-title"><small>${t.id}</small>${escapeHTML(t.title)}</td><td>${escapeHTML(t.dept)}</td><td>${badge(t.priority,t.priority==="긴급"?"red":"gray")}</td><td>${badge(t.status,statusColor(t.status))}</td><td><button data-detail="${t.id}">보기</button></td></tr>`).join(""):'<tr><td colspan="5" class="empty">조건에 맞는 내역이 없습니다.</td></tr>'}</tbody></table></div>`;
}
function work(isRequest=false) {
  const params=new URLSearchParams(location.hash.split("?")[1]||"");
  const status=params.get("status")||"전체";
  return panel(isRequest?"접수 및 종결 대기":"부서 배정 작업",`<div class="toolbar"><label class="sr-only" for="search">내용 또는 ID 검색</label><input id="search" type="search" placeholder="내용 또는 ID 검색"><label class="sr-only" for="status-filter">상태</label><select id="status-filter">${["전체",...(isRequest?["접수 대기","종결 대기"]:["작업 예정","작업 중","보류","조치 완료"])].map(s=>`<option ${s===status?"selected":""}>${s}</option>`).join("")}</select>${isRequest?"":'<button id="list-view" aria-pressed="true">목록</button><button id="calendar-view" aria-pressed="false">캘린더</button>'}</div><p class="help">${isRequest?"희망 부서와 관계없이 BNOC가 최초 접수·배정을 담당합니다. 상세에서 요청과 관련 작업을 확인하세요.":"가상 제1통신대대 · 작업 6건 / 미완료 4건 · 상세 등록분만 표시"}</p><div id="results">${table((isRequest?requests:tasks).filter(t=>status==="전체"||t.status===status),isRequest)}</div>`);
}
function personnel() {
  return `<div class="people-grid">${[["네트워크체계팀",[["상사","강가상","주간"],["중사","김가상","주간"],["하사","윤가상","오프"],["병장","정가상","휴가"]]],["유선체계팀",[["상사","송가상","주간"],["중사","한가상","출장"],["하사","임가상","미입력"]]],["무선체계팀",[["상사","장가상","주간"],["중사","박가상","주간"],["하사","최가상","오프"]]]].map(([dept,people])=>panel(dept,people.map(([rank,name,status])=>`<div class="person"><span class="rank">${rank}</span><strong>${name}</strong>${badge(status,statusColor(status))}</div>`).join(""),`<small>${people.length}명 · 계급순</small>`)).join("")}</div>`;
}
function requestForm() {
  return panel("정비 요청 작성",`<p class="help">BNOC 시연 계정의 요청 입력 예시입니다. 제출 결과는 현재 페이지에서만 확인할 수 있습니다.</p><form id="request-form" class="form-grid"><label>요청자<input value="중사 김가상" readonly></label><label>사무실 전화<input value="DEMO-1004" readonly></label><label>요청 부서<input value="가상 제1통신대대 BNOC" readonly></label><label>희망 정비부서<select name="department"><option>미지정</option><option>네트워크체계팀</option><option>유선체계팀</option><option>무선체계팀</option></select></label><label class="wide">요청 내용<textarea name="description" required maxlength="2000" placeholder="첫 줄에 증상을 요약하고, 아래에 상세 내용을 입력하세요."></textarea></label><label>태그 (선택)<select name="tag"><option>미선택</option><option>PC</option><option>모니터</option><option>전화기</option><option>네트워크</option></select></label><label>우선순위<select name="priority"><option>일반</option><option>긴급</option></select></label><label class="wide">추가 메모<input name="memo" maxlength="500" placeholder="예: 모니터 10대, 가상 교육장 대상"></label><p class="help wide">희망 부서는 선택사항이며 최종 담당 부서는 BNOC가 지정합니다.</p><div class="wide"><button class="primary" type="submit">요청 미리보기</button></div></form>`);
}
function render() {
  const route=location.hash.slice(1).split("?")[0]||"dashboard";
  const page=titles[route]?route:"dashboard";
  $("#page-title").textContent=titles[page]; $("#crumb").textContent=titles[page];
  $("#page-description").textContent=page==="dashboard"?"부대 운영과 정비 상황을 한눈에 확인하세요.":"가상 제1통신대대 · 2026년 9월 9일 기준 시연 자료";
  document.querySelectorAll("nav a").forEach(a=>{const active=a.hash==="#"+page;a.classList.toggle("active",active);if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  const views={dashboard,systems:()=>panel("체계별 운영 상태",systems(),'<small>09.09 14:30 기준</small>'),personnel,duty:()=>panel("가상 제1통신대대 야간 근무",'<p class="help">관리 대대: 가상 제1통신대대<br>근무 시간: 2026.09.09 18:00 ~ 2026.09.10 09:00 (다음 날)</p>'+duty()),work:()=>work(),intake:()=>work(true),request:requestForm,summary:()=>panel("현재 배정 작업 현황",summary()+table(tasks)),notices:()=>panel("지시사항",'<article class="notice-article">'+badge("중요","amber")+'<h3>정기 점검 전 사전 확인 안내</h3><p>작업 전 대상 체계와 일정을 확인하고, 점검 결과를 기록 바랍니다. 점검 중 특이사항은 BNOC에 공유해 주세요.</p><small>가상 제1통신대대 BNOC · 2026.09.09 09:00</small></article><article class="notice-article"><h3>주간 정비 현황 확인 안내</h3><p>부서별 배정 작업과 완료 기록을 확인해 주세요. 미완료 작업은 상태와 보류 사유를 점검 바랍니다.</p><small>2026.09.08 16:00</small></article>'),cpcon:()=>panel("CPCON",badge("단계 5 · 정상 (시연값)","green")+'<p class="help" style="margin-top:20px">적용 시각: 2026.09.09 09:00<br>화면 배치 확인을 위한 예시입니다. 실제 단계 목록과 운용 기준은 별도 확정 대상입니다.</p>'),gps:()=>panel("GPS 전파교란 위기경보단계",badge("정상 (시연값)","green")+'<p class="help" style="margin-top:20px">적용 시각: 2026.09.09 09:00<br>CPCON과 독립된 상황 정보입니다. 실제 경보 목록은 별도 확정 대상입니다.</p>')};
  main.innerHTML=views[page]();
  if($("#search")) {const filter=()=>{$("#results").innerHTML=table((page==="intake"?requests:tasks).filter(t=>($("#status-filter").value==="전체"||t.status===$("#status-filter").value)&&(t.id+" "+t.title).toLowerCase().includes($("#search").value.trim().toLowerCase())),page==="intake");if($("#list-view")){$("#list-view").setAttribute("aria-pressed","true");$("#calendar-view").setAttribute("aria-pressed","false");}};$("#search").addEventListener("input",filter);$("#status-filter").addEventListener("change",filter);if($("#list-view")){$("#list-view").onclick=filter;$("#calendar-view").onclick=()=>{$("#search").value="";$("#status-filter").value="전체";$("#results").innerHTML='<div id="calendar">'+calendar()+'</div>';$("#calendar-view").setAttribute("aria-pressed","true");$("#list-view").setAttribute("aria-pressed","false");};}}
  if($("#request-form"))$("#request-form").onsubmit=e=>{e.preventDefault();const data=new FormData(e.target);const description=data.get("description").trim();if(!description){e.target.elements.description.setCustomValidity("요청 내용을 입력하세요.");e.target.elements.description.reportValidity();return;}openDialog("요청 미리보기",`<p><strong>[가상 제1통신대대 BNOC] ${escapeHTML(description.split("\n")[0])}</strong></p><p style="white-space:pre-wrap">${escapeHTML(description)}</p><p>희망 부서: ${escapeHTML(data.get("department"))}<br>태그: ${escapeHTML(data.get("tag"))}<br>추가 메모: ${escapeHTML(data.get("memo")||"없음")}</p><p class="help">목업 미리보기입니다. 실제 요청은 저장·전송되지 않습니다.</p>`);};
  if($("textarea"))$("textarea").oninput=e=>e.target.setCustomValidity("");
}
function openDialog(title,body){$("#dialog-title").textContent=title;$("#dialog-content").innerHTML=body;$("#detail").showModal();}
let toastTimer;
function toast(message){$("#toast").textContent=message;$("#toast").classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("#toast").classList.remove("visible"),3500);}
document.addEventListener("click",e=>{
  const detail=e.target.closest("[data-detail]");if(detail){const t=[...tasks,...requests].find(t=>t.id===detail.dataset.detail);openDialog(t.title,`<p>${badge(t.status,statusColor(t.status))} ${badge(t.priority,t.priority==="긴급"?"red":"gray")}</p><p><strong>${t.id}</strong><br>${escapeHTML(t.dept)}${t.request?"<br>연결 요청: "+t.request:""}${t.time?"<br>일정: "+t.time:""}</p><p>${escapeHTML(t.memo)}</p><p class="help">화면 검토용 읽기 전용 상세입니다.</p>`);}
  const month=e.target.closest("[data-month]");if(month){const d=new Date(calendarYear,calendarMonth+Number(month.dataset.month),1);calendarYear=d.getFullYear();calendarMonth=d.getMonth();$("#calendar").innerHTML=calendar();$("#calendar-events").innerHTML='<p class="help" style="margin-top:16px">날짜를 선택하여 일정을 확인하세요.</p>';}
  const day=e.target.closest("[data-day]");if(day){document.querySelectorAll(".day.selected").forEach(d=>d.classList.remove("selected"));day.classList.add("selected");const prefix=`${String(calendarMonth+1).padStart(2,"0")}.${String(day.dataset.day).padStart(2,"0")}`;const matches=calendarYear===2026?tasks.filter(t=>t.time.startsWith(prefix)):[];$("#calendar-events").innerHTML=matches.length?matches.map(t=>`<button class="calendar-event" data-detail="${t.id}">${t.time} · ${escapeHTML(t.title)}<small>${t.dept} · ${t.id}</small></button>`).join(""):'<p class="empty">선택한 날짜에 등록된 일정이 없습니다.</p>';}
});
$("#close-dialog").onclick=()=>$("#detail").close();
function setDisplayMode(active){document.body.classList.toggle("tv",active);$("#display-mode").setAttribute("aria-pressed",String(active));$("#display-mode span").textContent=active?"업무 화면으로":"전시기 모드";}
$("#display-mode").onclick=()=>{const active=!document.body.classList.contains("tv");setDisplayMode(active);toast(active?"전시기 글자 크기를 적용했습니다. F11로 전체 화면을 사용할 수 있습니다.":"업무 화면으로 전환했습니다.");};
$("#settings").onclick=()=>openDialog("화면 설정",'<p>기본 화면은 PC 업무용, 전시기 모드는 TV 조회용 배치입니다.</p><p>Edge에서 Ctrl + / Ctrl −로 배율을 조정하고, F11로 전체 화면을 전환할 수 있습니다.</p><p class="help">자료 기준은 2026.09.09 14:30입니다. 서버 연결·자동 갱신·권한 검증은 이 목업에 포함되지 않습니다.</p>');
$("#refresh").onclick=()=>toast("화면의 가상 자료는 2026.09.09 14:30 기준입니다. 실시간 연결은 없습니다.");
window.addEventListener("hashchange",()=>{render();main.focus({preventScroll:true});window.scrollTo(0,0);});
render();
if(new URLSearchParams(location.search).get("display")==="tv")setDisplayMode(true);
