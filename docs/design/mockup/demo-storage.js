const demoStorageKey='ict-maintenance-demo-v1';
let demoStorageMessage='',demoLastSaved='';
function loadDemoState(){
  try{const raw=localStorage.getItem(demoStorageKey);if(!raw)return M.state();const saved=JSON.parse(raw),s=saved.state;
    if(saved.version!==1||!s||!M.sessions[s.role]||!['personnel','requests','tasks','cooperation','personnelPeriods'].every(k=>Array.isArray(s[k]))||!s.dutyRosters||!s.personnelChecks||!s.cpcon)throw Error('저장 자료 형식 오류');
    const departmentNames={'네트워크체계팀':'네트워크체계반','무선체계팀':'무선체계반','전송체계팀':'정보체계반','사이버(정보보호)팀':'사이버 통제실'};for(const roster of [s.duty,...Object.values(s.dutyRosters)])for(const row of roster?.rows||[])if(departmentNames[row.unit])row.unit=departmentNames[row.unit];
    demoLastSaved=saved.at;return M.removeDormitoryDuty(s);
  }catch(error){demoStorageMessage='저장 자료를 불러오지 못했습니다. 초기 시연 자료로 표시 중입니다.';return M.state();}
}
function persistDemoState(){
  try{const at=new Date().toISOString();localStorage.setItem(demoStorageKey,JSON.stringify({version:1,at,state}));demoLastSaved=at;demoStorageMessage='';}
  catch(error){demoStorageMessage='브라우저 저장에 실패했습니다. 현재 변경은 새로고침하면 사라질 수 있습니다.';}
  showStorageStatus();
}
function showStorageStatus(){const node=document.querySelector('#demo-storage-status');if(node){node.textContent=demoStorageMessage||`이 브라우저에 저장${demoLastSaved?' · '+new Date(demoLastSaved).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'}):''}`;node.className=demoStorageMessage?'badge amber':'muted';}}
function equipmentDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open('ict-maintenance-equipment',1);request.onupgradeneeded=()=>request.result.createObjectStore('demo');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function loadEquipmentData(){const db=await equipmentDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('demo','readonly'),r=tx.objectStore('demo').get('equipment');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();});}
async function saveEquipmentData(){const db=await equipmentDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('demo','readwrite');tx.objectStore('demo').put({equipment,documents:equipmentDocuments,nextDocumentId},'equipment');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};});}
async function clearEquipmentData(){const db=await equipmentDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('demo','readwrite');tx.objectStore('demo').delete('equipment');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
