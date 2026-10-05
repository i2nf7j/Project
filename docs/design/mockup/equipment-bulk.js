/* Same-project batch entry; existing single-item editing remains available. */
function equipmentBatch(){
 if(['user','viewer'].includes(state.role))return;
 modal('사업별 장비 등록','<form id="equipment-batch-form"><div class="request-form"><label>사업명<input name="project" required maxlength="100"></label><label>사업년도<input name="year" type="number" min="1900" max="2100" step="1" required></label></div><p class="muted">사업 정보는 공통으로 적용됩니다. 장비 한 대당 한 행을 입력하세요.</p><div class="tablewrap"><table><thead><tr><th>장비명</th><th>부서</th><th>망 종류</th><th>행 관리</th></tr></thead><tbody id="equipment-batch-rows"></tbody></table></div><button type="button" id="equipment-row-add">＋ 행 추가</button><p class="error" role="alert"></p><div class="form-actions"><button class="primary">전체 등록</button></div></form>');
 const form=$('#equipment-batch-form'),body=$('#equipment-batch-rows');
 const add=()=>{const row=document.createElement('tr');row.innerHTML='<td><input name="name" aria-label="장비명" required maxlength="100"></td><td><select name="department" aria-label="부서">'+equipmentOptions(M.departments.map(d=>d.name),$('#equipment-department').value||'네트워크체계반')+'</select></td><td><select name="network" aria-label="망 종류">'+equipmentOptions(['국방망','전장망','센서망','LTE망','VoIP망','기타'],$('#equipment-network').value||'국방망')+'</select></td><td><button type="button" data-remove-row>행 삭제</button></td>';body.append(row);};
 add();editBaselines.set(form,formValues(form));$('#equipment-row-add').onclick=()=>{add();body.lastElementChild.querySelector('input').focus();};
 body.onclick=e=>{const b=e.target.closest('[data-remove-row]');if(b){if(body.children.length===1){form.querySelector('.error').textContent='장비는 한 행 이상 입력하세요.';return;}b.closest('tr').remove();}};
 form.onsubmit=async e=>{e.preventDefault();if(['user','viewer'].includes(state.role))return;const error=form.querySelector('.error'),project=form.elements.project.value.trim(),year=form.elements.year.value;const rows=[...body.rows].map(r=>({name:r.querySelector('[name=name]').value.trim(),department:r.querySelector('[name=department]').value,network:r.querySelector('[name=network]').value}));
 if(!project||!rows.length||rows.some(r=>!r.name)||!/^\d{4}$/.test(year)||Number(year)<1900||Number(year)>2100){error.textContent='사업명, 사업년도와 모든 행의 장비명을 확인하세요.';return;}
 const submit=form.querySelector('.primary');submit.disabled=true;let next=Math.max(0,...equipment.map(a=>a.id));const added=rows.map(r=>({...r,id:++next,project,year,status:'확인 필요',version:'',reason:'',note:''}));equipment.push(...added);
 try{await saveEquipmentData();clearEdits();$('#dialog').close();$('#equipment-department').value='';$('#equipment-network').value='';$('#equipment-search').value=project;renderEquipment();notify(added.length+'대 장비를 등록했습니다.');}catch{equipment.splice(equipment.length-added.length,added.length);error.textContent='저장하지 못했습니다. 입력 내용을 확인하고 다시 시도하세요.';submit.disabled=false;}
 };
}
function equipmentRemovalReason(id){return operationNodes().some(n=>n.equipmentId===id)?'운영 구성 또는 운영 종료 이력에 연결된 장비입니다. 운영현황의 연결과 정비 이력을 먼저 확인하세요.':'';}
function deleteEquipment(id){
 if(['user','viewer'].includes(state.role))return;const asset=equipment.find(e=>e.id===id);if(!asset)return;
 const reason=equipmentRemovalReason(id);if(reason){modal('장비 삭제 불가','<p>'+esc(reason)+'</p>');return;}
 modal('장비 삭제','<form id="equipment-delete-form"><p><strong>'+esc(asset.name)+'</strong> · '+equipmentNumber(id)+'</p><p>장비와 해당 장비의 공문 연결을 삭제합니다. 다른 장비의 공문 연결은 유지됩니다.</p><label>확인을 위해 장비명을 입력하세요<input name="confirmName" required autocomplete="off"></label><p class="error" role="alert"></p><button class="primary">삭제</button></form>');
 const form=$('#equipment-delete-form');form.onsubmit=async e=>{e.preventDefault();if(['user','viewer'].includes(state.role))return;const error=form.querySelector('.error');if(form.elements.confirmName.value!==asset.name){error.textContent='장비명이 일치하지 않습니다.';return;}const reason=equipmentRemovalReason(id);if(reason){error.textContent=reason;return;}
 const index=equipment.findIndex(a=>a.id===id),links=equipmentDocuments.map(d=>[d,[...d.equipmentIds]]);form.querySelector('button').disabled=true;equipment.splice(index,1);equipmentDocuments.forEach(d=>{d.equipmentIds=d.equipmentIds.filter(i=>i!==id);});
 try{await saveEquipmentData();clearEdits();$('#dialog').close();renderEquipment();notify('장비를 삭제했습니다.');}catch{equipment.splice(index,0,asset);links.forEach(([d,ids])=>{d.equipmentIds=ids;});error.textContent='삭제를 저장하지 못했습니다. 다시 시도하세요.';form.querySelector('button').disabled=false;}
 };
}
const bindEquipmentBeforeBatch=bindEquipment;bindEquipment=function(){bindEquipmentBeforeBatch();const add=$('#equipment-add');if(add)add.onclick=equipmentBatch;};
const renderEquipmentBeforeDelete=renderEquipment;renderEquipment=function(){renderEquipmentBeforeDelete();if(['user','viewer'].includes(state.role))return;document.querySelectorAll('[data-equipment-edit]').forEach(edit=>{const b=document.createElement('button');b.type='button';b.className='operation-danger';b.textContent='삭제';b.dataset.equipmentDelete=edit.dataset.equipmentEdit;b.onclick=()=>deleteEquipment(Number(b.dataset.equipmentDelete));edit.after(b);});};
