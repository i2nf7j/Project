/* All locations, telemetry and alerts are fictional demonstration data. */
(() => {
  const asOf='2026-09-16 14:30:00';
  const statuses={good:{label:'정상',color:'#22ae70',criteria:'수신 위성 5개 이상'},caution:{label:'주의',color:'#ed841c',criteria:'수신 위성 4개'},bad:{label:'경고',color:'#ec3946',criteria:'수신 위성 3개 이하'},missing:{label:'장애',color:'#8190a5',criteria:'네트워크 / 장비 장애'},spoof:{label:'기만',color:'#2879df',criteria:'오차거리 20m 초과'}};
  const alertLevels={severe:{label:'심각',color:'#ec3946'},alert:{label:'경계',color:'#ed841c'},caution:{label:'주의',color:'#e9bd17'},interest:{label:'관심',color:'#2879df'}};
  // Crisis alerts are independent declarations, never calculated from station telemetry.
  const alerts=[{id:'actual',label:'실제 경보',level:'interest',applied:'2026-09-16 09:00:00'},{id:'exercise',label:'훈련 경보',level:'alert',applied:'2026-09-16 14:00:00'}];
  function classifyStation({satellites,errorMeters,equipmentFault=false,networkFault=false}){
    if(equipmentFault||networkFault)return 'missing';
    if(Number.isFinite(errorMeters)&&errorMeters>20)return 'spoof';
    if(!Number.isInteger(satellites)||satellites<0||!Number.isFinite(errorMeters)||errorMeters<0)return null;
    return satellites>=5?'good':satellites===4?'caution':'bad';
  }
  const sites=[
    {id:'cheongju',name:'청주',satellites:7,errorMeters:3,x:52.21,y:47.00,received:'14:30:00',changed:'13:40:00',history:[['13:40:00','good'],['13:30:00','caution']]},
    {id:'sacheon',name:'사천',satellites:5,errorMeters:8,x:58.95,y:64.52,received:'14:29:58',changed:'12:00:00',history:[['12:00:00','good']]},
    {id:'seonggeo',name:'성거산',satellites:3,errorMeters:12,x:48.84,y:34.19,received:'14:29:57',changed:'14:25:12',history:[['14:25:12','bad'],['14:20:00','caution'],['14:00:00','good']]},
    {id:'wonju',name:'원주',satellites:4,errorMeters:10,x:57.56,y:26.77,received:'14:29:55',changed:'14:20:00',history:[['14:20:00','caution'],['13:00:00','good']]},
    {id:'gangneung',name:'강릉',satellites:3,errorMeters:26,x:68.37,y:20.16,received:'14:29:59',changed:'14:26:00',history:[['14:26:00','spoof'],['13:00:00','good']]},
    {id:'demo',name:'가상 감시국',satellites:null,errorMeters:null,networkFault:true,x:36,y:25,received:'14:10:00',changed:'14:15:00',history:[['14:15:00','missing'],['14:00:00','good']]}
  ].map(site=>({...site,status:classifyStation(site)}));
  const detectorStatuses={normal:{label:'GPS 수신 정상',color:'#2879df'},interference:{label:'GPS 교란 탐지',color:'#ec3946'},fault:{label:'장비 / 네트워크 장애',color:'#ed841c'}};
  const detectors=[{id:'west',name:'탐지 A',status:'normal',x:33,y:16,received:'14:30:00'},{id:'central',name:'탐지 B',status:'interference',x:48,y:10,received:'14:29:58'},{id:'east',name:'탐지 C',status:'fault',x:64,y:5,received:'14:12:00'}];
  const wings={'17':{name:'제17전투비행단',site:'cheongju'},a:{name:'가상 비행단 A',site:'seonggeo'},b:{name:'가상 비행단 B',site:'wonju'}};
  const forWing=id=>sites.find(s=>s.id===wings[id]?.site)||null;
  const filter=(region='',status='')=>sites.filter(s=>(!region||s.id===region)&&(!status||s.status===status));
  const api={asOf,statuses,alertLevels,alerts,classifyStation,sites,detectorStatuses,detectors,wings,forWing,filter};
  if(typeof module!=='undefined')module.exports=api;else window.GpsDemo=api;
})();
