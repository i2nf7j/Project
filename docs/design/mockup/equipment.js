"use strict";
// 장비와 첨부파일은 브라우저 IndexedDB에 보관합니다.
const equipment = [
  {id:1,department:"네트워크체계반",network:"국방망",name:"업무용 PC (가상)",project:"업무 단말 교체",year:"2025",status:"설치 완료",version:"시연 1.0",reason:"",note:""},
  {id:2,department:"무선체계반",network:"전장망",name:"운용 단말 (가상)",project:"작전통신 체계 구축",year:"2024",status:"설치 불가",version:"",reason:"전용 소프트웨어 호환성 제한 (예시)",note:"업체 공문 확보 필요"},
  {id:3,department:"정보체계반",network:"센서망",name:"센서 관리 PC (가상)",project:"센서 연동 사업",year:"2023",status:"미설치",version:"",reason:"",note:"설치 일정 확인 필요"},
  {id:4,department:"네트워크체계반",network:"LTE망",name:"LTE 관리 단말 (가상)",project:"이동통신 장비 도입",year:"2025",status:"확인 필요",version:"",reason:"",note:""},
  {id:5,department:"네트워크체계반",network:"VoIP망",name:"전화 관리 PC (가상)",project:"음성통신 체계 개선",year:"2022",status:"설치 완료",version:"시연 1.0",reason:"",note:""}
];
// 원본 공문 하나에 적용 장비 ID를 연결한다. 신규 장비에는 자동 적용하지 않는다.
const equipmentDocuments = [];
let nextDocumentId = 1;
const documentsFor = id => equipmentDocuments.filter(doc=>doc.equipmentIds.includes(id));
const equipmentNumber = id => "EQ-"+String(id).padStart(4,"0");
const escapeEquipment = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let equipmentTab = "inventory";
function renderEquipment(){
  const department=$("#equipment-department").value, network=$("#equipment-network").value, query=$("#equipment-search").value.trim().toLocaleLowerCase();
  const rows=equipment.filter(e=>(!department||e.department===department)&&(!network||e.network===network)&&(!query||(e.name+" "+e.project).toLocaleLowerCase().includes(query)));
  const security=equipmentTab==="security";
  document.querySelectorAll("[data-equipment-tab]").forEach(button=>{const active=button.dataset.equipmentTab===equipmentTab;button.setAttribute("aria-selected",String(active));button.tabIndex=active?0:-1;});
  $("#equipment-panel").setAttribute("aria-labelledby",security?"security-tab":"inventory-tab");
  $("#equipment-count").textContent=security?`조회 ${rows.length}대 · 설치 완료 ${rows.filter(e=>e.status==="설치 완료").length} · 미설치 ${rows.filter(e=>e.status==="미설치").length} · 설치 불가 ${rows.filter(e=>e.status==="설치 불가").length} · 확인 필요 ${rows.filter(e=>e.status==="확인 필요").length}`:`조회 ${rows.length}대 / 전체 ${equipment.length}대`;
  const columns=security?["순번","부서 / 장비명","망 종류","백신 버전","설치현황","설치 불가 사유 / 비고","업체 공문","관리"]:["순번","부서","망 종류","장비명","사업명","사업년도","관리"];
  $("#equipment-columns").innerHTML="<tr>"+columns.map(c=>"<th scope='col'>"+c+"</th>").join("")+"</tr>";
  $("#equipment-rows").innerHTML=rows.map((e,index)=>{
    const safe=Object.fromEntries(Object.entries(e).map(([key,value])=>[key,escapeEquipment(value??"")]));
    const name=`<strong>${safe.name}</strong><small class="task-note">${equipmentNumber(e.id)}</small>`;
    const documents=documentsFor(e.id).map(doc=>`<button class="text-button document-link" data-equipment-document="${doc.id}">${escapeEquipment(doc.file.name)}<small>적용 ${doc.equipmentIds.length}대</small></button>`).join("");
    const cells=security?[index+1,`<small>${safe.department}</small><br>${name}`,safe.network,safe.version||"—",`<span class="state ${e.status==="설치 완료"?"green":e.status==="확인 필요"?"gray":"amber"}">${safe.status}</span>`,`${safe.reason||"—"}${safe.note?"<small class='task-note'>"+safe.note+"</small>":""}`,documents||(e.status==="설치 불가"?"<span class='amber'>공문 미첨부</span>":"—")]:[index+1,safe.department,safe.network,name,safe.project,safe.year];
    return "<tr>"+cells.map(c=>"<td>"+c+"</td>").join("")+`<td><button class="outline" data-equipment-edit="${e.id}">${security?"현황 수정":"수정"}</button></td></tr>`;
  }).join("")||`<tr><td colspan="${columns.length}" class="equipment-empty">조건에 맞는 장비가 없습니다.</td></tr>`;
}
const equipmentOptions=(values,selected)=>values.map(value=>`<option${value===selected?" selected":""}>${escapeEquipment(value)}</option>`).join("");
function editEquipment(id){
  if(["user","viewer"].includes(state.role))return;
  const existing=equipment.find(e=>e.id===id);
  const e=existing||{department:$("#equipment-department").value||"네트워크체계반",network:$("#equipment-network").value||"국방망",name:"",project:"",year:"",version:"",status:"확인 필요",reason:"",note:""};
  const security=Boolean(existing)&&equipmentTab==="security";
  const candidates=equipment.filter(item=>item.project===e.project&&item.year===e.year);
  const attached=documentsFor(e.id);
  const reusable=equipmentDocuments.filter(doc=>doc.project===e.project&&doc.year===e.year&&!doc.equipmentIds.includes(e.id));
  const input=(name,label,extra="")=>`<label>${label}<input name="${name}" value="${escapeEquipment(e[name])}" ${extra}></label>`;
  const body=security?`<p><strong>${escapeEquipment(e.name)}</strong> · ${equipmentNumber(e.id)} · ${escapeEquipment(e.department)}</p>
    <label>설치현황<select name="status">${equipmentOptions(["설치 완료","미설치","설치 불가","확인 필요"],e.status)}</select></label>
    ${input("version","백신 버전","maxlength='100'")}
    <label>설치 불가 사유<textarea name="reason" maxlength="1000">${escapeEquipment(e.reason)}</textarea></label>
    <label>비고<textarea name="note" maxlength="1000">${escapeEquipment(e.note)}</textarea></label>
    <fieldset class="document-fieldset"><legend>업체 공문 · 다중 첨부</legend>
    ${attached.map(doc=>`<label class="file-remove"><input type="checkbox" name="removeDocument" value="${doc.id}"> ${escapeEquipment(doc.file.name)} · 적용 ${doc.equipmentIds.length}대 · 이 장비에서 연결 해제</label>`).join("")}
    <label>새 공문 추가<input name="file" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.hwp,.hwpx,.doc,.docx"></label>
    <small>여러 파일 선택 가능 · 파일당 최대 10MB · PDF, 이미지, HWP, Word</small>
    ${reusable.length?`<p>같은 사업의 기존 공문 연결</p>${reusable.map(doc=>`<label class="file-remove"><input type="checkbox" name="reuseDocument" value="${doc.id}"> ${escapeEquipment(doc.file.name)} · 적용 ${doc.equipmentIds.length}대</label>`).join("")}`:""}
    <label>추가·연결할 공문의 적용 범위<select id="document-scope"><option value="single">이 장비만</option><option value="model">같은 사업의 동일 장비명</option><option value="project">같은 사업 전체</option></select></label>
    <small>${escapeEquipment(e.project)} · ${escapeEquipment(e.year)}년 · 아래 대상은 개별 선택할 수 있습니다.</small>
    <div class="document-targets">${candidates.map(item=>`<label class="file-remove"><input type="checkbox" name="documentTarget" value="${item.id}"${item.id===e.id?" checked":""}> ${equipmentNumber(item.id)} · ${escapeEquipment(item.department)} · ${escapeEquipment(item.name)} · ${escapeEquipment(item.network)}</label>`).join("")}</div>
    <p class="footnote">선택한 장비에 공문만 연결합니다. 백신 버전·설치현황·사유는 이 장비에만 반영됩니다. 연결 해제는 다른 장비에 영향을 주지 않습니다.</p>
    </fieldset>
    <p class="footnote">설치 불가 사유는 필수입니다. 공문 확보 전에는 ‘공문 미첨부’로 표시됩니다.</p>`:
    `<label>부서<select name="department">${equipmentOptions(["네트워크체계반","무선체계반","정보체계반","사이버 통제실"],e.department)}</select></label>
    <label>망 종류<select name="network">${equipmentOptions(["국방망","전장망","센서망","LTE망","VoIP망","기타"],e.network)}</select></label>
    ${input("name","장비명","required maxlength='100'")}${input("project","사업명","required maxlength='100'")}${input("year","사업년도","type='number' min='1900' max='2100' step='1' required")}
    <p class="footnote">장비 1대당 1건으로 등록합니다. 등록 후 정보보호 프로그램 탭에서 설치현황을 관리하세요.</p>`;
  modal(security?"정보보호 프로그램 현황 수정":existing?"장비 수정":"장비 등록",`<form id="equipment-form" class="equipment-form">${body}<p id="equipment-error" role="alert" class="amber"></p><div class="equipment-actions"><button type="button" id="equipment-cancel">취소</button><button type="submit" class="primary">${existing?"수정 반영":"등록"}</button></div></form>`);
  const form=$("#equipment-form");
  $("#equipment-cancel").onclick=()=>$("#dialog").close();
  if(security){
    const requirements=()=>{form.elements.version.required=form.elements.status.value==="설치 완료";form.elements.reason.required=form.elements.status.value==="설치 불가";};
    form.elements.status.onchange=requirements;requirements();
    $("#document-scope").onchange=()=>{
      const scope=$("#document-scope").value;
      form.querySelectorAll('[name="documentTarget"]').forEach(box=>{
        const item=candidates.find(candidate=>candidate.id===Number(box.value));
        box.checked=scope==="project"||(scope==="model"?item.name===e.name:item.id===e.id);
      });
    };
  }
  form.onsubmit=async event=>{
    if(["user","viewer"].includes(state.role)){event.preventDefault();return;}
    event.preventDefault();
    const formData=new FormData(form);
    const data=Object.fromEntries(formData);
    const fail=message=>{$("#equipment-error").textContent=message;};
    if(security){
      if(data.status==="설치 완료"&&!data.version.trim())return fail("설치 완료 장비의 백신 버전을 입력해주세요.");
      if(data.status==="설치 불가"&&!data.reason.trim())return fail("설치 불가 사유를 입력해주세요.");
      const files=Array.from(form.elements.file.files);
      if(files.some(file=>file.size>10*1024*1024||! /\.(pdf|png|jpe?g|hwpx?|docx?)$/i.test(file.name)))return fail("모든 공문은 허용된 형식의 파일당 10MB 이하여야 합니다.");
      const targets=[...new Set(formData.getAll("documentTarget").map(Number))];
      const reuseIds=formData.getAll("reuseDocument").map(Number);
      const removeIds=formData.getAll("removeDocument").map(Number);
      if((files.length||reuseIds.length)&&(!targets.length||targets.some(id=>!candidates.some(item=>item.id===id))))return fail("공문을 적용할 장비를 한 대 이상 선택해주세요.");
      if(reuseIds.some(id=>!reusable.some(doc=>doc.id===id))||removeIds.some(id=>!attached.some(doc=>doc.id===id)))return fail("공문 연결 대상을 다시 확인해주세요.");
      // 모든 검증 후 반영하여 일부 파일만 저장되는 상황을 방지한다.
      files.forEach(file=>equipmentDocuments.push({id:nextDocumentId++,file,project:e.project,year:e.year,equipmentIds:[...targets]}));
      reuseIds.forEach(id=>{const doc=equipmentDocuments.find(item=>item.id===id);doc.equipmentIds=[...new Set([...doc.equipmentIds,...targets])];});
      removeIds.forEach(id=>{const doc=equipmentDocuments.find(item=>item.id===id);doc.equipmentIds=doc.equipmentIds.filter(target=>target!==e.id);});
      Object.assign(e,{status:data.status,version:data.version.trim(),reason:data.reason.trim(),note:data.note.trim()});
    }else{
      if(!data.name.trim()||!data.project.trim())return fail("장비명과 사업명을 입력해주세요.");
      Object.assign(e,{department:data.department,network:data.network,name:data.name.trim(),project:data.project.trim(),year:data.year});
      if(!existing){e.id=Math.max(0,...equipment.map(item=>item.id))+1;equipment.push(e);}
    }
    clearEdits();$("#dialog").close();renderEquipment();
    try{await saveEquipmentData();notify("장비와 첨부파일을 이 브라우저에 저장했습니다.");}catch(error){notify("장비 저장에 실패했습니다. 현재 변경은 새로고침하면 사라질 수 있습니다.");}
  };
}
function bindEquipment(){
  if(!equipmentLoaded){$("#equipment").innerHTML="<p class=\"empty\">장비 자료를 불러오는 중입니다.</p>";equipmentReady.then(()=>{if(page==='equipment')render();});return;}
document.querySelectorAll("[data-equipment-tab]").forEach(button=>{
  button.onclick=()=>{equipmentTab=button.dataset.equipmentTab;renderEquipment();};
  button.onkeydown=event=>{
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
    event.preventDefault();
    equipmentTab=event.key==="Home"?"inventory":event.key==="End"?"security":equipmentTab==="inventory"?"security":"inventory";
    renderEquipment();document.querySelector(`[data-equipment-tab="${equipmentTab}"]`).focus();
  };
});
$("#equipment-department").onchange=renderEquipment;$("#equipment-network").onchange=renderEquipment;$("#equipment-search").oninput=renderEquipment;
$("#equipment-add").onclick=()=>editEquipment();
$("#equipment-rows").onclick=event=>{
  const button=event.target.closest("button");if(!button)return;
  if(button.dataset.equipmentEdit)editEquipment(Number(button.dataset.equipmentEdit));
  if(button.dataset.equipmentDocument){const doc=equipmentDocuments.find(item=>item.id===Number(button.dataset.equipmentDocument));if(!doc)return;const url=URL.createObjectURL(doc.file),link=document.createElement("a");link.href=url;link.download=doc.file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
};
renderEquipment();
}
let equipmentLoaded=false;
const equipmentReady=loadEquipmentData().then(saved=>{if(saved){equipment.splice(0,equipment.length,...saved.equipment.map(e=>({...e,department:({'네트워크체계팀':'네트워크체계반','무선체계팀':'무선체계반','전송체계팀':'정보체계반','사이버(정보보호)팀':'사이버 통제실','가상지원반':'무선체계반','가상정비반':'정보체계반'})[e.department]||e.department})));equipmentDocuments.splice(0,equipmentDocuments.length,...saved.documents);nextDocumentId=saved.nextDocumentId;}}).catch(()=>{notify('장비 저장 자료를 불러오지 못했습니다. 초기 자료를 표시합니다.');}).finally(()=>{equipmentLoaded=true;});
