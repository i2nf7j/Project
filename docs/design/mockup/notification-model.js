/* Account-scoped demo inbox. Server delivery is not simulated. */
(function(M){
  const ensure=s=>s.notifications||(s.notifications=[]);
  const visible=(s,n)=>n.audience==='bnoc'?['bnoc','admin'].includes(s.role):M.sessions[s.role]?.department===n.audience;
  const list=s=>ensure(s).filter(n=>visible(s,n)).slice().reverse();
  const add=(s,data)=>ensure(s).push({id:'notice-'+crypto.randomUUID(),at:new Date().toISOString(),readBy:[],...data});
  const create=M.createRequest;
  M.createRequest=(s,data)=>{const r=create(s,data);add(s,{audience:'bnoc',kind:'새 정비 요청',requestId:r.id,title:M.title(r)});return r;};
  const assign=M.assign;
  M.assign=(s,id,department,tag)=>{const before=s.requests.find(r=>r.id===id)?.primary;const result=assign(s,id,department,tag);if(before!==department){const r=s.requests.find(r=>r.id===id),task=s.tasks.find(t=>t.requestId===id&&t.participation==='주관');add(s,{audience:department,kind:before?'정비 재배정':'정비 배정',requestId:id,taskId:task.id,title:M.title(r)});}return result;};
  const read=(s,id)=>{const n=ensure(s).find(n=>n.id===id);if(!n||!visible(s,n))throw Error('조회할 수 없는 알림입니다.');if(!n.readBy.includes(s.role))n.readBy.push(s.role);};
  M.inbox={list,read,unread:s=>list(s).filter(n=>!n.readBy.includes(s.role))};
  if(typeof module!=='undefined')module.exports=M;
})(typeof module!=='undefined'?require('./maintenance-model.js'):window.Maintenance);
