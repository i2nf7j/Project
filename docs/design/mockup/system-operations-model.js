/* 운영 구성과 정비 영향 예측. 시연 데이터이며 실제 가동 여부를 자동 판정하지 않는다. */
(function(M){
  const need=(ok,message)=>{if(!ok)throw Error(message);};
  const statuses=['정상','성능저하','장애','점검 중'],impacts=['영향 없음','일부 제한','사용 불가'];
  const initial=()=>({nodes:[
    {id:'net',parent:'',kind:'체계',name:'네트워크체계',status:'정상',note:'업무망 서비스'},
    {id:'radio',parent:'',kind:'체계',name:'무선체계',status:'정상',note:'무선 통신 서비스'},
    {id:'trans',parent:'',kind:'체계',name:'전송체계',status:'점검 중',note:'전원 점검 · 우회 경로 운용'},
    {id:'security',parent:'',kind:'체계',name:'정보보호체계',status:'정상',note:'보안 서비스'},
    {id:'lan',parent:'net',kind:'하위 체계',name:'업무망',status:'정상',note:'가상 본부 구역'},
    {id:'switch',parent:'lan',kind:'장비',name:'코어 스위치 A',status:'정상',note:'가상 통신실 · NET-001'},
    {id:'access',parent:'lan',kind:'장비',name:'접속 스위치 B',status:'정상',note:'가상 본부 · NET-002'},
    {id:'vhf',parent:'radio',kind:'하위 체계',name:'기지 무선망',status:'정상',note:'가상 기지 구역'},
    {id:'base',parent:'vhf',kind:'장비',name:'무선 기지국 A',status:'정상',note:'RAD-001'},
    {id:'mux',parent:'trans',kind:'장비',name:'전송장비 A',status:'점검 중',note:'TRN-001 · 우회 경로 사용'},
    {id:'fw',parent:'security',kind:'장비',name:'방화벽 A',status:'정상',note:'SEC-001 · 이중화 구성'}
  ].map(n=>({...n,updated:'2026-09-16T14:00'})),plans:[
    {id:'plan-1',target:'switch',title:'코어 스위치 소프트웨어 정비',start:'2026-09-17T19:00',end:'2026-09-17T21:00',impact:'사용 불가',scope:'본부 업무망 접속 중단 예상',note:'작업 완료 확인 후 서비스 재개',status:'예정'},
    {id:'plan-2',target:'mux',title:'전송장비 전원 예방점검',start:'2026-09-16T13:00',end:'2026-09-16T17:00',impact:'일부 제한',scope:'우회 구간 대역폭 제한 예상',note:'주 회선 전원 확인',status:'예정'},
    {id:'plan-3',target:'fw',title:'방화벽 이중화 점검',start:'2026-09-21T23:00',end:'2026-09-22T01:00',impact:'영향 없음',scope:'대기 장비 점검 · 서비스 유지 예정',note:'절체 이상 시 일정 재검토',status:'예정'}
  ]});
  const ensure=s=>{
    const store=s.systemOperations||(s.systemOperations=initial());
    if(!store.infrastructureHierarchy){
      const net=store.nodes.find(n=>n.id==='net'),trans=store.nodes.find(n=>n.id==='trans');
      if(trans?.name==='전송체계')trans.name='정보체계';
      if(net&&!net.parent){
        let parent=store.nodes.find(n=>!n.parent&&n.name==='기반통신체계'&&!n.retired);
        if(!parent){parent={id:'infrastructure',parent:'',kind:'체계',name:'기반통신체계',status:net.status,note:'네트워크체계 상위 구성',updated:net.updated};store.nodes.unshift(parent);}
        net.parent=parent.id;net.kind='하위 체계';
      }
      store.infrastructureHierarchy=true;
    }
    return store;
  };
  const rootOf=(s,id)=>{const nodes=ensure(s).nodes;let n=nodes.find(n=>n.id===id);while(n?.parent)n=nodes.find(p=>p.id===n.parent);return n;};
  const path=(s,id)=>{const nodes=ensure(s).nodes,parts=[];let n=nodes.find(n=>n.id===id);while(n){parts.unshift(n.name);n=nodes.find(p=>p.id===n.parent);}return parts.join(' / ');};
  const dayEnd=day=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)+'T00:00';};
  const plansOn=(s,day,system='')=>ensure(s).plans.filter(p=>p.status==='예정'&&p.start<dayEnd(day)&&p.end>day+'T00:00'&&(!system||rootOf(s,p.target)?.id===system)).sort((a,b)=>a.start.localeCompare(b.start));
  const validTime=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'Z'))&&new Date(v+'Z').toISOString().slice(0,16)===v;
  const canEdit=s=>['bnoc','admin'].includes(s.role);
  const saveNode=(s,data,id='')=>{
    need(canEdit(s),'BNOC 또는 관리자만 운영 구성을 수정할 수 있습니다.');
    const nodes=ensure(s).nodes,existing=nodes.find(n=>n.id===id),parent=nodes.find(n=>n.id===data.parent);
    need(!id||existing,'등록 항목을 찾을 수 없습니다.');
    need(!existing?.retired,'운영 종료 항목은 수정할 수 없습니다.');need(!parent?.retired,'운영 종료 항목 아래에는 등록할 수 없습니다.');
    need(data.name?.trim()&&data.name.trim().length<=80,'이름은 1~80자로 입력하세요.');
    need(['체계','하위 체계','장비'].includes(data.kind)&&statuses.includes(data.status),'항목 종류와 상태를 확인하세요.');
    need(data.kind==='체계'?!data.parent:parent&&parent.kind!=='장비','상위 체계 또는 하위 체계를 선택하세요.');
    let ancestor=parent;while(ancestor){need(ancestor.id!==id,'자신 또는 하위 항목을 상위 항목으로 지정할 수 없습니다.');ancestor=nodes.find(n=>n.id===ancestor.parent);}
    need(!id||data.kind!=='장비'||!nodes.some(n=>n.parent===id),'하위 항목이 있는 체계는 장비로 변경할 수 없습니다.');
    const n={id:id||'node-'+crypto.randomUUID(),parent:data.parent||'',kind:data.kind,name:data.name.trim(),status:data.status,note:(data.note||'').trim(),updated:new Date().toLocaleString('sv-SE',{timeZone:'Asia/Seoul'}).slice(0,16).replace(' ','T')};
    if(existing)Object.assign(existing,n);else nodes.push(n);return n;
  };
  const savePlan=(s,data,id='')=>{
    need(canEdit(s),'BNOC 또는 관리자만 정비 일정을 수정할 수 있습니다.');
    const store=ensure(s),existing=store.plans.find(p=>p.id===id);
    need(!id||existing,'등록 일정을 찾을 수 없습니다.');
    need(store.nodes.some(n=>n.id===data.target),'정비 대상을 선택하세요.');
    need(!store.nodes.find(n=>n.id===data.target)?.retired||existing?.target===data.target&&data.status!=='예정','운영 종료 장비에는 예정 정비를 등록할 수 없습니다.');
    need(data.title?.trim()&&data.title.trim().length<=100,'정비명을 1~100자로 입력하세요.');
    need(validTime(data.start)&&validTime(data.end)&&data.start<data.end,'정비 종료는 시작 시각보다 늦어야 합니다.');
    need(impacts.includes(data.impact)&&['예정','완료','취소'].includes(data.status),'예상 영향과 일정 상태를 확인하세요.');
    need(data.scope?.trim(),'영향받는 서비스·구역을 입력하세요.');
    const p={id:id||'plan-'+crypto.randomUUID(),target:data.target,title:data.title.trim(),start:data.start,end:data.end,impact:data.impact,scope:data.scope.trim(),note:(data.note||'').trim(),status:data.status};
    if(existing)Object.assign(existing,p);else store.plans.push(p);return p;
  };
  const canMove=(s,id,parentId)=>{
    const nodes=ensure(s).nodes,n=nodes.find(n=>n.id===id),parent=nodes.find(n=>n.id===parentId);
    if(!canEdit(s)||n?.retired||parent?.retired||!n?.parent||!parent||parent.kind==='장비'||n.parent===parentId)return false;
    let ancestor=parent;while(ancestor){if(ancestor.id===id)return false;ancestor=nodes.find(n=>n.id===ancestor.parent);}return true;
  };
  const moveNode=(s,id,parentId)=>{
    need(canMove(s,id,parentId),'이 위치로 이동할 수 없습니다. 다른 체계 또는 하위 체계를 선택하세요.');
    const n=ensure(s).nodes.find(n=>n.id===id);n.parent=parentId;return n;
  };
  const removal=(s,id)=>{
    const store=ensure(s),n=store.nodes.find(n=>n.id===id),plans=store.plans.filter(p=>p.target===id);
    if(!n)return {blocked:'항목을 찾을 수 없습니다.'};
    if(n.retired)return {blocked:'이미 운영 종료된 항목입니다.'};
    if(store.nodes.some(c=>c.parent===id))return {blocked:'하위 항목을 먼저 이동하거나 정리하세요. 운영 종료 항목도 포함됩니다.'};
    if(plans.some(p=>p.status==='예정'))return {blocked:'예정 정비를 먼저 취소하거나 다른 대상으로 변경하세요.'};
    return {action:plans.length?'retire':'delete',label:plans.length?'운영 종료':'삭제'};
  };
  const removeNode=(s,id,name)=>{
    need(canEdit(s),'BNOC 또는 관리자만 삭제할 수 있습니다.');
    const rule=removal(s,id);need(!rule.blocked,rule.blocked);
    const store=ensure(s),n=store.nodes.find(n=>n.id===id);need(name===n.name,'항목 이름을 정확하게 입력하세요.');
    if(rule.action==='retire'){n.retired=true;n.retiredAt=new Date().toISOString();}else store.nodes=store.nodes.filter(n=>n.id!==id);
    return rule.action;
  };
  M.systemOperations={removal,removeNode,canMove,moveNode,ensure,rootOf,path,plansOn,saveNode,savePlan,canEdit,statuses,impacts};
  if(typeof module!=='undefined')module.exports=M;
})(typeof module!=='undefined'?require('./maintenance-model.js'):window.Maintenance);
