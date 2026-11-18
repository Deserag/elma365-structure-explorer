/** Browser-only ELMA365 structure helpers. No imported tenant data leaves the browser. */
export const DEMO = {
  sections: [
    {name:'CRM',code:'_clients',hidden:false,applications:[
      {name:'Компании',code:'_companies',type:'STANDARD',elementName:'Компания',fields:[
        {code:'__name',type:'STRING',view:{name:'Название'},required:true,array:false},
        {code:'inn',type:'STRING',view:{name:'ИНН'},required:false,array:false},
        {code:'industry',type:'ENUM',view:{name:'Отрасль'},data:{enumItems:[{code:'it',name:'ИТ'},{code:'logistics',name:'Логистика'},{code:'trade',name:'Торговля'}]}},
        {code:'__createdAt',type:'DATETIME',view:{name:'Дата создания'}},
      ],processes:[{name:'Регистрация компании',code:'register_company',namespace:'_clients._companies',version:1}]},
      {name:'Контакты',code:'_contacts',type:'STANDARD',elementName:'Контакт',fields:[
        {code:'__name',type:'STRING',view:{name:'ФИО'},required:true},
        {code:'email',type:'EMAIL',view:{name:'Электронная почта'}},
        {code:'phone',type:'PHONE',view:{name:'Телефон'}},
        {code:'company',type:'SYS_COLLECTION',view:{name:'Компания'},data:{code:'_companies',namespace:'_clients'},array:false},
      ],processes:[]},
      {name:'Сделки',code:'_leads',type:'STANDARD',elementName:'Сделка',fields:[
        {code:'__name',type:'STRING',view:{name:'Название'},required:true},
        {code:'amount',type:'MONEY',view:{name:'Сумма'}},
        {code:'__status',type:'STATUS',view:{name:'Статус'}},
        {code:'company',type:'SYS_COLLECTION',view:{name:'Компания'},data:{code:'_companies',namespace:'_clients'}},
        {code:'contact',type:'SYS_COLLECTION',view:{name:'Контакт'},data:{code:'_contacts',namespace:'_clients'}},
      ],processes:[{name:'Согласование сделки',code:'deal_approve',namespace:'_clients._leads',version:2}]}
    ],pages:[{name:'Рабочий стол',code:'dashboard',hidden:false}],reports:[{name:'Воронка продаж',code:'sales_pipeline'}],processes:[],contracts:[]},
    {name:'Продажи',code:'sales',hidden:false,applications:[{name:'Заказы',code:'orders',type:'STANDARD',elementName:'Заказ',fields:[
      {code:'__name',type:'STRING',view:{name:'Название'},required:true},
      {code:'total',type:'MONEY',view:{name:'Итого'}},
      {code:'company',type:'SYS_COLLECTION',view:{name:'Покупатель'},data:{code:'_companies',namespace:'_clients'}},
      {code:'created',type:'DATETIME',view:{name:'Дата заказа'}}
    ],processes:[{name:'Обработка заказа',code:'process_order',namespace:'sales.orders',version:1}]}],pages:[],reports:[],processes:[],contracts:[]},
    {name:'Кадровая служба',code:'hr',hidden:false,applications:[{name:'Сотрудники',code:'employees',type:'STANDARD',elementName:'Сотрудник',fields:[
      {code:'__name',type:'FULL_NAME',view:{name:'ФИО'}},
      {code:'position',type:'STRING',view:{name:'Должность'}},
      {code:'hired',type:'DATETIME',view:{name:'Дата приема'}},
      {code:'active',type:'BOOLEAN',view:{name:'Работает'}},
    ],processes:[]}],pages:[],reports:[],processes:[],contracts:[]}
  ], modules:[], solutions:[]
};

export const STORAGE_KEY='elma-structure-explorer-v1';
export const appKey=(sectionCode,appCode)=>`${sectionCode}/${appCode}`;
const keyFor=(item,i)=>String(item?.namespace && item?.code ? `${item.namespace}/${item.code}` : item?.code ?? item?.id ?? item?.name ?? `#${i}`);

/** Union by stable code: retain elements absent in the latest export, refresh supplied attributes. */
export function mergeItems(oldItems=[],newItems=[],nestedKeys=[]){
  const result=Array.isArray(oldItems)?oldItems.map(x=>({...x})):[];
  const positions=new Map(result.map((x,i)=>[keyFor(x,i),i]));
  for(const [i,item] of (Array.isArray(newItems)?newItems:[]).entries()){
    if(!item || typeof item!=='object') continue;
    const key=keyFor(item,i);
    if(!positions.has(key)){
      positions.set(key,result.length); result.push({...item}); continue;
    }
    const p=positions.get(key),previous=result[p];
    const merged={...previous,...item};
    for(const k of nestedKeys){
      if(Array.isArray(previous?.[k]) || Array.isArray(item?.[k])){
        const subNested=k==='applications'?['fields','processes']:k==='fields'?[]:[];
        merged[k]=mergeItems(previous?.[k],item?.[k],subNested);
      }
    }
    result[p]=merged;
  }
  return result;
}
export function mergeStructure(previous={},incoming={}){
  if(!incoming||!Array.isArray(incoming.sections)) throw new Error('В JSON не найден массив sections. Выберите файл экспорта структуры ELMA365.');
  const out={...previous,...incoming};
  out.sections=mergeItems(previous.sections,incoming.sections,['applications','processes','pages','reports','contracts']);
  out.modules=mergeItems(previous.modules,incoming.modules);
  out.solutions=mergeItems(previous.solutions,incoming.solutions);
  return out;
}
export function countStats(data){
  const sections=Array.isArray(data?.sections)?data.sections:[];
  const apps=sections.flatMap(s=>s.applications||[]);
  const processes=new Set();
  sections.forEach(s=>{
    (s.processes||[]).forEach(p=>processes.add(`${p.namespace||s.code}/${p.code||p.name}`));
    (s.applications||[]).forEach(a=>(a.processes||[]).forEach(p=>processes.add(`${p.namespace||s.code+'.'+a.code}/${p.code||p.name}`)));
  });
  return {sections:sections.length,apps:apps.length,fields:apps.reduce((n,a)=>n+(a.fields||[]).length,0),processes:processes.size,pages:sections.reduce((n,s)=>n+(s.pages||[]).length,0),reports:sections.reduce((n,s)=>n+(s.reports||[]).length,0)};
}
export function getApps(data){
  return (data?.sections||[]).flatMap(section=>(section.applications||[]).map(app=>({section,app,key:appKey(section.code,app.code)})));
}
export function resolveTarget(field,entries){
  const raw=field?.data;
  if(!raw || typeof raw!=='object') return null;
  const code=raw.code || raw.applicationCode || raw.appCode || raw.collectionCode || raw.targetCode;
  const namespace=raw.namespace || raw.sectionCode || raw.moduleCode;
  if(!code || typeof code!=='string') return null;
  let match=entries.find(e=>e.app.code===code && (e.section.code===namespace || namespace===undefined || namespace===null));
  if(!match && namespace){
    match=entries.find(e=>e.app.code===code && (`${e.section.code}.${e.app.code}`===namespace || `${e.section.code}/${e.app.code}`===namespace));
  }
  if(!match) match=entries.find(e=>e.app.code===code);
  return match?.key || null;
}
export function buildRelations(data){
  const entries=getApps(data),byKey=new Map(entries.map(e=>[e.key,e]));
  const outward=new Map(), inward=new Map();
  for(const entry of entries){
    const edges=[];
    for(const field of entry.app.fields||[]){
      if(!['SYS_COLLECTION','REF_ITEM','LINK','COLLECTION_TYPE'].includes(field.type)) continue;
      const target=resolveTarget(field,entries);
      const edge={source:entry.key,target,targetCode:field.data?.code||field.data?.applicationCode||'',namespace:field.data?.namespace||'',field:field.view?.name||field.code,fieldCode:field.code,type:field.type,array:Boolean(field.array)};
      edges.push(edge);
      if(target){if(!inward.has(target))inward.set(target,[]);inward.get(target).push(edge);}
    }
    outward.set(entry.key,edges);
  }
  return {entries,byKey,outward,inward};
}

/** Permission-related settings are shown ONLY if explicitly present in export. */
const ACCESS_KEYS=new Set(['permissions','permission','access','accessrights','accesssettings','acl','roles','groups','usergroups','security','accesscontrol','accessgroups']);
export function findAccessEntries(section,app){
  const found=[];
  const examine=(owner,obj,depth=0)=>{
    if(!obj || typeof obj!=='object' || depth>3)return;
    for(const [k,v] of Object.entries(obj)){
      if(ACCESS_KEYS.has(k.toLowerCase()) && v!==null && v!==undefined){found.push({owner,key:k,value:v});}
      else if(['settings','configuration','config','meta','metadata','securitysettings','accessconfiguration'].includes(k.toLowerCase()))examine(`${owner} / ${k}`,v,depth+1);
    }
  };
  examine('Приложение',app);
  examine('Раздел',section);
  return found;
}
export function appProcesses(section,app){
  const own=app.processes||[];
  const more=(section.processes||[]).filter(p=>String(p.namespace||'')===`${section.code}.${app.code}`);
  const seen=new Set();
  return [...own,...more].filter(p=>{const k=p.code||p.name;if(seen.has(k))return false;seen.add(k);return true;});
}
const firstNames=['Александр','Мария','Иван','Елена','Дмитрий','Анна','Сергей','Ольга','Алексей','Наталья'];
const lastNames=['Иванов','Петрова','Смирнов','Кузнецова','Соколов','Попова','Морозов','Орлова'];
const companies=['Альфа Проект','Северный Вектор','Техносфера','Горизонт','Новый Контур','Маяк','Спектр'];
const adjectives=['Новый','Приоритетный','Тестовый','Входящий','Плановый'];
const choose=(values,n)=>values[Math.abs(n)%values.length];
const titleFor=(app,i)=>{
  const name=(app.name||'').toLowerCase();
  if(/контакт|сотрудник|пользоват|физическ|кандидат/.test(name))return `${choose(firstNames,i)} ${choose(lastNames,i*3+1)}`;
  if(/компан|организац|контрагент/.test(name))return `ООО «${choose(companies,i)}»`;
  return `${choose(adjectives,i)} ${app.elementName||app.name||'элемент'} №${String(i+1).padStart(3,'0')}`;
};
export function createRecord(app,index,relatedRecords={},relationIndex=new Map(),entryKey=''){
  const title=titleFor(app,index);
  const id=globalThis.crypto?.randomUUID?.() || `mock-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
  const fields={};
  for(const f of app.fields||[]){
    const c=f.code,t=f.type;let value=null;
    const salt=index+c.length;
    if(c==='__id')value=id;
    else if(c==='__name')value=title;
    else if(c==='__createdAt'||c==='__updatedAt')value=new Date(Date.now()-(index+1)*86400000).toISOString();
    else if(c==='__deletedAt')value=null;
    else if(c==='__version')value=1;
    else if(c==='__index')value=index+1;
    else if(c.startsWith('__') && c!=='__status')continue;
    else if(t==='STRING'||t==='TEXT')value=/inn|огрн|код|номер|артикул/i.test(c)?String(7800000000+index*17):`${f.view?.name||c} ${index+1}`;
    else if(t==='FULL_NAME')value=title;
    else if(t==='EMAIL')value=`test${index+1}@example.test`;
    else if(t==='PHONE')value=`+7 900 ${String(100+index%899)}-${String(10+index%90)}-${String(10+(index*3)%90)}`;
    else if(t==='INTEGER')value=(index+1)*3;
    else if(t==='FLOAT')value=Math.round((index+1)*13.75*100)/100;
    else if(t==='MONEY')value=(index+1)*12500;
    else if(t==='BOOLEAN')value=index%2===0;
    else if(t==='DATETIME'||t==='DATE')value=new Date(Date.now()-(index+1)*86400000*3).toISOString();
    else if(t==='ENUM'){
      const options=f.data?.enumItems||[]; const item=choose(options,salt);value=item?.name||item?.code||'Вариант 1';
    }
    else if(t==='STATUS')value=choose(['Черновик','В работе','Завершено'],index);
    else if(['SYS_COLLECTION','REF_ITEM','LINK','COLLECTION_TYPE'].includes(t)){
      const target=relationIndex.get(c);const pool=target?relatedRecords[target]||[]:[];
      const linked=pool.length?pool[index%pool.length]:null;
      value=linked?{id:linked.id,name:linked.title,appKey:target}:null;
    }
    else if(t==='SYS_USER')value='Тестовый пользователь';
    else if(t==='FILE'||t==='IMAGE')value=null;
    else if(t==='JSON')value={};
    else if(t==='TABLE')value=[];
    else if(t==='CATEGORY')value='Общая папка';
    else if(t==='ROLE')value='Сотрудник';
    else if(t==='ACCOUNT')value='Тестовый счет';
    else value=null;
    if(f.array && value!==null)value=[value];
    fields[c]=value;
  }
  return {id,title,fields,createdAt:new Date().toISOString(),generated:true,applicationKey:entryKey};
}
export function generateForApp(entry,quantity,records={},relations=buildRelations({sections:[entry.section]})){
  const next={...records};
  const current=[...(next[entry.key]||[])];
  const relIndex=new Map((relations.outward.get(entry.key)||[]).map(edge=>[edge.fieldCode,edge.target]));
  for(let i=0;i<quantity;i++) current.push(createRecord(entry.app,current.length,next,relIndex,entry.key));
  next[entry.key]=current;
  return next;
}
export function generateForAll(data,quantity,records={}){
  const rel=buildRelations(data),next={...records};
  // First pass creates records everywhere, second pass resolves their links.
  for(const entry of rel.entries){
    const current=[...(next[entry.key]||[])];
    for(let i=0;i<quantity;i++)current.push(createRecord(entry.app,current.length,{},new Map(),entry.key));
    next[entry.key]=current;
  }
  for(const entry of rel.entries){
    const targetMap=new Map((rel.outward.get(entry.key)||[]).map(edge=>[edge.fieldCode,edge.target]));
    const start=next[entry.key].length-quantity;
    for(let i=start;i<next[entry.key].length;i++){
      const record=next[entry.key][i];
      for(const f of entry.app.fields||[]){
        const t=targetMap.get(f.code),pool=t?next[t]||[]:[];
        if(pool.length){const link=pool[i%pool.length];record.fields[f.code]=f.array?[{id:link.id,name:link.title,appKey:t}]:{id:link.id,name:link.title,appKey:t};}
      }
    }
  }
  return next;
}
export function exportJSON(filename,obj){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
const DB_NAME='elma365-structure-explorer', DB_STORE='workspace';
export function openDatabase(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in globalThis)){reject(new Error('IndexedDB недоступен'));return;}
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE);};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
export async function readWorkspace(){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(DB_STORE,'readonly').objectStore(DB_STORE).get(STORAGE_KEY);
    req.onsuccess=()=>{db.close();resolve(req.result||null);};req.onerror=()=>{db.close();reject(req.error);};
  });
}
export async function writeWorkspace(workspace){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(workspace,STORAGE_KEY);
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};
  });
}
