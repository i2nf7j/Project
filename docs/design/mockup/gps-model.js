/* 지역 수신원과 비행단 연결은 목업용 예시이며 실제 장비 위치·발령 정보가 아닙니다. */
(() => {
  const asOf='2026-09-16 14:30:00';
  const statuses={good:{label:'양호',color:'#22a86a'},caution:{label:'주의',color:'#e7af12'},bad:{label:'불량',color:'#e13d49'},missing:{label:'미수신',color:'#8593a7'}};
  const sites=[
    {id:'cheongju',name:'청주',status:'good',x:52.21,y:47.00,received:'14:30:00',changed:'13:40:00',history:[['13:40:00','good'],['13:30:00','caution']]},
    {id:'sacheon',name:'사천',status:'good',x:58.95,y:64.52,received:'14:29:58',changed:'12:00:00',history:[['12:00:00','good']]},
    {id:'seonggeo',name:'성거산',status:'bad',x:48.84,y:34.19,received:'14:29:57',changed:'14:25:12',history:[['14:25:12','bad'],['14:20:00','caution'],['14:00:00','good']]},
    {id:'wonju',name:'원주',status:'caution',x:57.56,y:26.77,received:'14:29:55',changed:'14:20:00',history:[['14:20:00','caution'],['13:00:00','good']]},
    {id:'gangneung',name:'강릉',status:'good',x:68.37,y:20.16,received:'14:29:59',changed:'13:00:00',history:[['13:00:00','good']]},
    {id:'demo',name:'가상 지점',status:'missing',x:51.16,y:14.84,received:'14:10:00',changed:'14:15:00',history:[['14:15:00','missing'],['14:00:00','good']]}
  ];
  const wings={'17':{name:'제17전투비행단',site:'cheongju'},a:{name:'가상 비행단 A',site:'seonggeo'},b:{name:'가상 비행단 B',site:'wonju'}};
  const forWing=id=>sites.find(s=>s.id===wings[id]?.site)||null;
  const filter=(region='',status='')=>sites.filter(s=>(!region||s.id===region)&&(!status||s.status===status));
  const api={asOf,statuses,sites,wings,forWing,filter};
  if(typeof module!=='undefined')module.exports=api;else window.GpsDemo=api;
})();
