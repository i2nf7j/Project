"use strict";
const $ = selector => document.querySelector(selector);
const paths = {
  home:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
  network:'<circle cx="12" cy="4" r="3"/><circle cx="4" cy="19" r="3"/><circle cx="20" cy="19" r="3"/><path d="m10 7-5 9m9-9 5 9M7 19h10"/>',
  people:'<circle cx="9" cy="7" r="4"/><path d="M2 22v-4a7 7 0 0 1 14 0v4M17 4a4 4 0 0 1 0 8m1 3a6 6 0 0 1 4 6"/>',
  tool:'<path d="M21 3a6 6 0 0 1-8 8L5 21l-3-3 10-8a6 6 0 0 1 8-8l-4 4 3 3Z"/>',
  unit:'<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M8 8V3h8v5M7 13h2m6 0h2m-6 8v-5h2v5"/>',
  bell:'<path d="M4 17h16l-2-4V9a6 6 0 0 0-12 0v4ZM10 21h4"/>',
  shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m7 11 4 4 6-7"/>',
  signal:'<path d="m3 21 6-6m1-8 7 7M8 3l13 13M14 2a8 8 0 0 1 8 8M5 10l9 9-9 2-2-2Z"/>',
  document:'<path d="M5 2h9l5 5v15H5ZM14 2v6h5M8 12h8M8 16h8"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v7l4 2"/>',
  pause:'<circle cx="12" cy="12" r="9"/><path d="M9 8v8m6-8v8"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M7 15h3m3 0h4"/>'
};
const icon = name => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
document.querySelectorAll("[data-icon]").forEach(el => {el.innerHTML=icon(el.dataset.icon);});
const tasks = [
  {id:"W-001", title:"랜선 장애 점검", status:"작업 예정", confirmed:false, urgent:true, date:"2026-09-09", time:"10:00", memo:"가상지원반 랜선 연결 불량. 현장 확인 필요."},
  {id:"W-002", title:"모니터 2대 정비", status:"진행 중", confirmed:true, date:"2026-09-09", time:"14:00", memo:"모니터 2대 화면 출력 불가. 수량과 관계없이 부서 작업 1건."},
  {id:"W-003", title:"PC 포맷", status:"보류", confirmed:true, date:"2026-09-10", time:"11:00", memo:"보류 사유: 사용자 방문 가능 시간 재확인."},
  {id:"W-004", title:"전화기 점검", status:"조치 완료", confirmed:true, date:"2026-09-08", time:"15:00", memo:"시험 통화 정상. BNOC 종결 대기."}
];
const today="2026-09-09";
const label = task => task.confirmed ? task.status : "확인 대기";
const color = status => ({"진행 중":"blue","확인 대기":"blue","보류":"amber","조치 완료":"green"}[status] || "gray");
let filter="전체", all=false, month=8, year=2026, selected=today;
const match = task => filter==="전체" || (filter==="오늘 예정" ? task.date===today && task.status!=="조치 완료" : label(task)===filter);
function renderTasks(){
  const counts=[["확인 대기",tasks.filter(t=>!t.confirmed).length,"document"],["진행 중",tasks.filter(t=>t.status==="진행 중").length,"tool"],["보류",tasks.filter(t=>t.status==="보류").length,"pause"],["오늘 예정",tasks.filter(t=>t.date===today && t.status!=="조치 완료").length,"calendar"]];
  $("#metrics").innerHTML=counts.map(([s,n,i])=>'<button class="metric '+(s==="보류"?"amber":"")+'" data-filter="'+s+'">'+icon(i)+'<span><small>'+s+'</small><strong>'+n+'건</strong></span></button>').join("");
  $("#task-tabs").innerHTML=["전체","확인 대기","진행 중","보류"].map(s=>'<button data-filter="'+s+'" aria-pressed="'+(s===filter)+'">'+s+'</button>').join("");
  const rows=tasks.filter(match);
  $("#task-rows").innerHTML=rows.slice(0,all?rows.length:4).map(t=>'<tr><td>'+(t.urgent?'<span class="urgent">긴급</span>':'')+'<button class="task-title" data-task="'+t.id+'">'+t.title+'</button>'+(t.status==="조치 완료"?'<small class="task-note">BNOC 종결 대기</small>':'')+'</td><td><span class="state '+color(label(t))+'">'+label(t)+'</span></td><td>'+t.date.slice(5).replace("-",".")+'</td><td><button class="text-button" data-task="'+t.id+'" aria-label="'+t.title+' 상세">›</button></td></tr>').join("") || '<tr><td colspan="4">조건에 맞는 작업이 없습니다.</td></tr>';
  $("#task-count").textContent=filter+" · "+rows.length+"건 / 부서 전체 "+tasks.length+"건 · 오늘 예정은 상태와 중복될 수 있습니다.";
}
function renderCalendar(){
  $("#month-label").textContent=year+"년 "+(month+1)+"월";
  const start=new Date(year,month,1).getDay(), count=new Date(year,month+1,0).getDate();
  let html=["일","월","화","수","목","금","토"].map(d=>'<span class="weekday">'+d+'</span>').join("")+'<span></span>'.repeat(start);
  for(let d=1;d<=count;d++){
    const key=year+"-"+String(month+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    html+='<button class="day '+(tasks.some(t=>t.date===key)?"event":"")+'" data-day="'+key+'" aria-label="'+year+'년 '+(month+1)+'월 '+d+'일 일정" aria-pressed="'+(selected===key)+'">'+d+'</button>';
  }
  $("#calendar").innerHTML=html;
  $("#agenda-title").textContent=(selected===today?"오늘 일정 ":"선택 일정 ")+selected.replaceAll("-",".");
  $("#agenda-items").innerHTML=tasks.filter(t=>t.date===selected).map(t=>'<button data-task="'+t.id+'"><time>'+t.time+'</time>'+t.title+'</button>').join("") || "<p>등록된 일정이 없습니다.</p>";
}
const systems={
  "기반통신":[["업무망","정상","정상 운영 중"],["전화 체계","정상","정상 운영 중"],["단말 지원","점검 중","일부 단말 점검 진행"]],
  "작전통신":[["가상 통신체계 A","정상","정상 운영 중"],["가상 통신체계 B","정상","정상 운영 중"]],
  "사이버 방호":[["가상 방호체계 A","정상","정상 운영 중"],["가상 방호체계 B","점검 중","정기 점검 진행"]]
};
function renderSystems(name="기반통신"){
  $("#system-tabs").innerHTML=Object.keys(systems).map(s=>'<button data-system="'+s+'" aria-pressed="'+(s===name)+'">'+s+'</button>').join("");
  $("#system-rows").innerHTML=systems[name].map(([n,s,m])=>'<tr><td><strong>'+n+'</strong></td><td><span class="state '+(s==="정상"?"green":"amber")+'">'+s+'</span></td><td><small>'+m+'</small></td></tr>').join("");
}
function dialog(title,body){$("#dialog-title").textContent=title;$("#dialog-body").innerHTML=body;if(!$("#detail").open)$("#detail").showModal();}
function showTask(id){
  const t=tasks.find(t=>t.id===id);
  dialog(t.title,'<p><strong>'+t.id+'</strong> · 네트워크체계팀</p><p><span class="state '+color(label(t))+'">'+label(t)+'</span></p><p>예정: '+t.date+' '+t.time+'</p><p>'+t.memo+'</p><p class="footnote">작업 확인은 진행 시작과 별도입니다. 조치 완료 후 BNOC가 종결합니다.</p>'+(!t.confirmed?'<button class="primary" data-confirm="'+t.id+'">우리 부서 작업 확인</button>':'<p class="footnote">작업 상태 변경은 이 목업에서 제공하지 않습니다.</p>'));
}
let timer;
function toast(text){$("#toast").textContent=text;$("#toast").classList.add("visible");clearTimeout(timer);timer=setTimeout(()=>$("#toast").classList.remove("visible"),4000);}
document.addEventListener("click",event=>{
  const el=event.target.closest("button");if(!el)return;
  if(el.dataset.filter){filter=el.dataset.filter;renderTasks();const target=[...document.querySelectorAll(el.classList.contains("metric")?"#metrics button":"#task-tabs button")].find(b=>b.dataset.filter===filter);target?.focus({preventScroll:true});}
  if(el.dataset.task)showTask(el.dataset.task);
  if(el.dataset.confirm){tasks.find(t=>t.id===el.dataset.confirm).confirmed=true;$("#detail").close();renderTasks();toast("작업 확인 완료 · 진행 시작과는 별도입니다.");}
  if(el.dataset.month){const d=new Date(year,month+Number(el.dataset.month),1);year=d.getFullYear();month=d.getMonth();selected=year+"-"+String(month+1).padStart(2,"0")+"-01";renderCalendar();}
  if(el.dataset.day){selected=el.dataset.day;renderCalendar();document.querySelector('[data-day="'+selected+'"]').focus({preventScroll:true});}
  if(el.dataset.system){renderSystems(el.dataset.system);document.querySelector('[data-system="'+el.dataset.system+'"]').focus({preventScroll:true});}
  if(el.dataset.info)dialog(el.dataset.info,'<p>'+ (el.dataset.info==="병력 현황"?"이 목업은 정비사 메인 대시보드만 구현했습니다. 병력 상세 화면은 이전 목업에서 볼 수 있습니다.":"화면 배치 검토를 위한 가상 정보입니다. 실제 운용 단계나 실시간 연동을 나타내지 않습니다.")+'</p>');
  if(el.dataset.notice)dialog(el.dataset.notice,"<p>"+el.querySelector("p").textContent+"</p><p class='footnote'>가상대대 A BNOC · 2026.09.09</p>");
});
$("#accept").onclick=()=>{
  tasks.push({id:"W-005",title:"복합 장애 현장 점검",status:"작업 예정",confirmed:true,date:"2026-09-10",time:"16:00",memo:"가상정비반 공조 요청 수락. 우리 부서 작업 1건으로 추가."});
  $("#accept").disabled=true;$("#accept").textContent="수락 완료";renderTasks();renderCalendar();toast("공조를 수락했습니다. 부서 작업에 1건 추가되었습니다.");
};
$("#all-tasks").onclick=()=>{all=!all;filter="전체";$("#all-tasks").textContent=all?"요약보기 ›":"전체보기 ›";renderTasks();};
$("#summary-open").onclick=()=>dialog("우리 부서 정비 현황","<p>배정 작업 "+tasks.length+"건 · 조치 완료 "+tasks.filter(t=>t.status==="조치 완료").length+"건</p><p>조치 완료 작업은 BNOC 종결 대기 상태입니다.</p><p class='footnote'>현재 상세 등록 작업만 집계합니다. 기간별 실적 및 수동 건수 입력분은 구현하지 않았습니다.</p>");
$("#close-dialog").onclick=()=>$("#detail").close();
$("#tv").onclick=()=>{const active=document.body.classList.toggle("tv");$("#tv").setAttribute("aria-pressed",String(active));$("#tv").textContent=active?"업무 화면으로":"전시기 모드";toast("Edge에서 F11을 누르면 전체 화면으로 볼 수 있습니다.");};
renderTasks();renderCalendar();renderSystems();
if(new URLSearchParams(location.search).get("display")==="tv")$("#tv").click();
