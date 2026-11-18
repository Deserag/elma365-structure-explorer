import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO,mergeStructure,countStats,buildRelations,generateForAll,generateForApp,findAccessEntries,appProcesses,getApps} from '../data.mjs';

test('merge retains applications, fields and BPs missing in later exports',()=>{
  const newer={sections:[{name:'CRM updated',code:'_clients',applications:[{name:'Contacts updated',code:'_contacts',fields:[{code:'new',type:'STRING',view:{name:'Новое'}}],processes:[]}],pages:[]}],modules:[],solutions:[]};
  const merged=mergeStructure(DEMO,newer);
  const crm=merged.sections.find(x=>x.code==='_clients');
  assert.equal(crm.name,'CRM updated');
  assert.equal(crm.applications.length,3);
  const contacts=crm.applications.find(a=>a.code==='_contacts');
  assert.equal(contacts.name,'Contacts updated');
  assert.ok(contacts.fields.some(f=>f.code==='company'));
  assert.ok(contacts.fields.some(f=>f.code==='new'));
  assert.ok(merged.sections.some(s=>s.code==='hr'));
  assert.ok(crm.applications.find(a=>a.code==='_leads').processes.length);
});

test('cross application links have outgoing and incoming directions',()=>{
  const links=buildRelations(DEMO);
  assert.equal(links.outward.get('_clients/_contacts')[0].target,'_clients/_companies');
  assert.ok((links.inward.get('_clients/_companies')||[]).some(e=>e.source==='sales/orders'));
});

test('generate all creates linked records and persists previous records by reference',()=>{
  const created=generateForAll(DEMO,3,{});
  assert.equal(Object.keys(created).length,5);
  assert.equal(created['_clients/_companies'].length,3);
  assert.equal(created['_clients/_contacts'].length,3);
  assert.equal(created['_clients/_contacts'][0].fields.company.appKey,'_clients/_companies');
  const appended=generateForAll(DEMO,2,created);
  assert.equal(appended['_clients/_contacts'].length,5);
  assert.equal(created['_clients/_contacts'].length,3);
  assert.ok(appended['_clients/_leads'][4].fields.contact.appKey);
});

test('single app generation keeps existing rows',()=>{
  const links=buildRelations(DEMO);
  const entry=links.byKey.get('sales/orders');
  const first=generateForApp(entry,2,{},links);
  const second=generateForApp(entry,3,first,links);
  assert.equal(second[entry.key].length,5);
  assert.equal(first[entry.key].length,2);
});

test('access values only when present, including nested configuration',()=>{
  assert.deepEqual(findAccessEntries(DEMO.sections[0],DEMO.sections[0].applications[0]),[]);
  const app={name:'Example',settings:{access:{groups:['Sales'],permissions:['read']}}};
  const found=findAccessEntries({},app);
  assert.equal(found.length,1);
  assert.equal(found[0].value.groups[0],'Sales');
});

test('validates input shape',()=>{assert.throws(()=>mergeStructure({},{}),/sections/);});
test('app-specific processes are found without duplicating section processes',()=>{
  const section={...DEMO.sections[0],processes:[{...DEMO.sections[0].applications[0].processes[0]}]},app=section.applications[0];
  assert.equal(appProcesses(section,app).length,1);
});
test('stats match demo apps',()=>{assert.equal(countStats(DEMO).apps,5);assert.equal(getApps(DEMO).length,5);});
