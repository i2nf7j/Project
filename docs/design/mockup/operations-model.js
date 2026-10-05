/* 날짜별 병력·근무 편성. 시연용 권한 검증이며 서버 인증을 대신하지 않습니다. */
(function(M){
  const seed=M.state;
  M.state=()=>{const s=seed();return {...s,personnelPeriods:[],personnelChecks:{},dutyRosters:{[s.duty.start.slice(0,10)]:structuredClone(s.duty)},staffingRevision:0};};
  const need=(ok,message)=>{if(!ok)throw new Error(message);};
  const validDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  const addDay=(day,n)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
  M.removeDormitoryDuty=s=>{
    s.duty.rows=s.duty.rows.filter(r=>r.id!=='D-DEMO-3');
    for(const [day,roster] of Object.entries(s.dutyRosters)){
      if(roster.rows.some(r=>r.id==='D-DEMO-3'&&r.personId))delete s.personnelChecks[addDay(day,1)];
      roster.rows=roster.rows.filter(r=>r.id!=='D-DEMO-3');
    }
    return s;
  };
  M.dutyKinds=['당직','야간','주간'];
  const periodOn=(s,id,day)=>(s.personnelPeriods||[]).filter(p=>p.id===id&&p.start<=day&&p.end>=day).at(-1);
  M.personnelOffReasonOn=(s,id,day)=>{
    if(periodOn(s,id,day))return '';
    const previous=addDay(day,-1),status=periodOn(s,id,previous)?.status;
    const row=s.dutyRosters[previous]?.rows.find(r=>r.personId===id&&['당직','야간'].includes(r.kind||'당직'));
    const kind=row?(row.kind||'당직'):status;
    return ['당직','야간'].includes(kind)?`${previous} ${kind} 후 자동 오프`:'';
  };
  M.personnelStatusOn=(s,id,day)=>periodOn(s,id,day)?.status||(M.personnelOffReasonOn(s,id,day)?'오프':'주간');
  M.setPersonnelPeriod=(s,ids,status,start,end)=>{
    need(M.canEditStaffing(s),'BNOC 또는 관리자만 수정할 수 있습니다.');
    need(validDay(start)&&validDay(end)&&start<=end,'적용 시작일과 종료일을 확인하세요.');
    need(Array.isArray(ids)&&ids.length&&ids.every(id=>s.personnel.some(p=>p.id===id))&&M.personnelStatuses.includes(status),'인원과 상태를 확인하세요.');
    const undo={periods:structuredClone(s.personnelPeriods),checks:structuredClone(s.personnelChecks),revision:s.staffingRevision+1};
    [...new Set(ids)].forEach(id=>s.personnelPeriods.push({id,status,start,end}));
    for(const day of Object.keys(s.personnelChecks))if(day>=start&&day<=addDay(end,1))delete s.personnelChecks[day];
    s.staffingRevision++;return undo;
  };
  M.undoPersonnelPeriod=(s,undo)=>{
    need(M.canEditStaffing(s),'BNOC 또는 관리자만 수정할 수 있습니다.');
    need(undo&&undo.revision===s.staffingRevision,'이후 변경이 있어 되돌릴 수 없습니다.');
    s.personnelPeriods=structuredClone(undo.periods);s.personnelChecks=structuredClone(undo.checks);s.staffingRevision++;
  };
  M.confirmPersonnel=(s,day)=>{
    need(M.canEditStaffing(s),'BNOC 또는 관리자만 확인할 수 있습니다.');
    need(validDay(day)&&day<=M.today,'확인 완료는 시연 기준일까지 가능합니다.');
    s.personnelChecks[day]={by:M.sessions[s.role].label,at:new Date().toISOString()};s.staffingRevision++;
  };
  const updatePerson=M.updatePersonnel;
  M.updatePersonnel=(s,id,data)=>{updatePerson(s,id,data);s.personnelChecks={};s.staffingRevision++;};
  M.dutyOn=(s,day)=>{
    need(validDay(day),'조회 날짜를 확인하세요.');
    return s.dutyRosters[day]||{manager:s.duty.manager,unit:s.duty.unit,start:day+'T18:00',end:addDay(day,1)+'T09:00',rows:s.duty.rows.map(r=>({id:r.id,position:r.position,rank:'하사',name:'',phone:'',personId:'',unit:''}))};
  };
  M.previousDuty=(s,day)=>{const key=Object.keys(s.dutyRosters).filter(d=>d<day).sort().at(-1);if(!key)return null;const d=structuredClone(s.dutyRosters[key]);const days=Math.round((Date.parse(d.end.slice(0,10))-Date.parse(d.start.slice(0,10)))/86400000);return {...d,start:day+d.start.slice(10),end:addDay(day,days)+d.end.slice(10)};};
  M.saveDutyOn=(s,day,data)=>{
    need(M.canEditStaffing(s),'BNOC 또는 관리자만 수정할 수 있습니다.');
    need(validDay(day)&&data.start?.slice(0,10)===day,'근무 시작일은 조회 기준일과 같아야 합니다.');
    const rows=data.rows.map(r=>{
      const person=r.personId?s.personnel.find(p=>p.id===r.personId):null;
      need(!r.personId||person,'명단에서 근무자를 다시 선택하세요.');
      need(M.dutyKinds.includes(r.kind||'당직'),'근무 구분을 확인하세요.');
      return {...r,rank:person?.rank||r.rank,name:person?.name||r.name,unit:person?M.departmentName(person.department):(r.unit||data.unit).trim(),personId:r.personId||''};
    });
    const linked=rows.filter(r=>r.personId).map(r=>r.personId);
    need(new Set(linked).size===linked.length,'동일 인원이 여러 직책에 중복 배정되어 있습니다.');
    M.updateDuty(s,{...data,rows});
    const roster={...structuredClone(s.duty),rows:s.duty.rows.map((r,i)=>({...r,personId:rows[i].personId,unit:rows[i].unit,kind:rows[i].kind||'당직'}))};
    s.dutyRosters[day]=roster;delete s.personnelChecks[addDay(day,1)];s.staffingRevision++;return roster;
  };
  if(typeof module!=='undefined')module.exports=M;
})(typeof module!=='undefined'?require('./maintenance-model.js'):window.Maintenance);
