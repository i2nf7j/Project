const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../docs/design/mockup/gps-model.js');
test('GPS station thresholds include exactly 20m and satellite boundaries',()=>{
 for(const [satellites,status] of [[0,'bad'],[3,'bad'],[4,'caution'],[5,'good'],[8,'good']])assert.equal(G.classifyStation({satellites,errorMeters:20}),status);
 assert.equal(G.classifyStation({satellites:5,errorMeters:20.01}),'spoof');
});
test('GPS faults override spoofing; spoofing overrides satellite warning',()=>{
 assert.equal(G.classifyStation({satellites:3,errorMeters:26}),'spoof');
 for(const fault of ['equipmentFault','networkFault'])assert.equal(G.classifyStation({satellites:3,errorMeters:26,[fault]:true}),'missing');
 assert.equal(G.classifyStation({satellites:null,errorMeters:null,networkFault:true}),'missing');
});
test('GPS missing telemetry does not become a normal reception',()=>{
 for(const data of [{},{satellites:null,errorMeters:3},{satellites:5,errorMeters:null},{satellites:-1,errorMeters:3},{satellites:4.5,errorMeters:3}])assert.equal(G.classifyStation(data),null);
});
test('GPS demo separates alerts, stations and detection equipment',()=>{
 assert.deepEqual(G.alerts.map(a=>a.id),['actual','exercise']);
 assert.equal(Object.keys(G.alertLevels).length,4);
 assert.equal(Object.keys(G.statuses).length,5);
 assert.equal(Object.keys(G.detectorStatuses).length,3);
 assert.equal(G.forWing('17').status,'good');
 assert.equal(G.filter('gangneung','spoof').length,1);
 assert.equal(G.filter('cheongju','missing').length,0);
 for(const s of G.sites)assert.equal(s.status,G.classifyStation(s));
});
