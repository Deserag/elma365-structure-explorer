import {DEMO,appKey,mergeStructure,countStats,getApps,buildRelations,findAccessEntries,appProcesses,generateForApp,generateForAll,exportJSON,readWorkspace,writeWorkspace} from './data.mjs';

const root=document.getElementById('root');
const fileInput=document.getElementById('file-input');
const state={workspace:{structure:DEMO,records:{},history:[],lastPresentApps:[],demo:true},activeTab:'records',expanded:new Set(['_clients','sales','hr']),search:'',searchOpen:false,modal:null,toast:null,sidebarOpen:true,storageReady:true};
let relations=buildRelations(DEMO),toastTimer;
const escapeHTML=(value)=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const e=escapeHTML;
const escAttr=e;
const icons={
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10H3z"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 2 4 3 9 3s9-1 9-3V5M3 12c0 2 4 3 9 3s9-1 9-3"/>',
  network:'<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>',
  workflow:'<rect x="2" y="3" width="8" height="7" rx="1"/><rect x="14" y="14" width="8" height="7" rx="1"/><path d="M10 6h8v8M14 10l4 4"/>',
  shield:'<path d="M12 2 4 6v5c0 6 4 9 8 11 4-2 8-5 8-11V6z"/><path d="m9 12 2 2 4-4"/>',
  document:'<path d="M6 2h8l5 5v15H6z"/><path d="M14 2v6h5M9 12h7M9 16h7"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  close:'<path d="M5 5 19 19M19 5 5 19"/>',
  refresh:'<path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  file:'<path d="M6 2h9l4 4v16H6zM15 2v5h4"/>',
  settings:'<path d="M12 3a3 3 0 0 1 3 3l2 1 3-1 2 4-3 2v2l3 2-2 4-3-1-2 1a3 3 0 0 1-6 0l-2-1-3 1-2-4 3-2v-2l-3-2 2-4 3 1 2-1a3 3 0 0 1 3-3z"/><circle cx="12" cy="12" r="3"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  code:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-4 18"/>',
  table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
  alert:'<path d="M12 2 2 21h20z"/><path d="M12 9v5m0 3v.1"/>',
  menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  help:'<circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 0 1 6 1c0 2-3 2-3 5m0 3h.01"/>'
};
const ic=(name,size=18)=>`<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.file}</svg>`;
const button=(text,action,kind='secondary',icon='',extra='')=>`<button class="btn btn-${kind}" type="button" data-action="${action}" ${extra}>${icon?ic(icon,16):''}<span>${text}</span></button>`;
const attrKey=k=>`data-key="${escAttr(k)}"`;
const routeApp=k=>`#/app/${encodeURIComponent(k)}`;
const routeSection=k=>`#/section/${encodeURIComponent(k)}`;
const hashRoute=()=>{const h=location.hash||'#/';const [kind,...parts]=h.slice(2).split('/');let key='';try{key=decodeURIComponent(parts.join('/'));}catch{}return {kind:kind||'overview',key};};
const activeEntry=()=>relations.byKey.get(hashRoute().key);
const activeSection=()=>state.workspace.structure.sections.find(s=>s.code===hashRoute().key);
const totalRecords=()=>Object.values(state.workspace.records).reduce((n,arr)=>n+(arr?.length||0),0);
const isArchived=key=>!state.workspace.demo && state.workspace.history.length>0 && !state.workspace.lastPresentApps.includes(key);
const formatNumber=n=>Number(n||0).toLocaleString('ru-RU');
const prettyDate=s=>{try{return new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short'}).format(new Date(s));}catch{return s||'—';}};
const oneLine=(s,max=80)=>String(s??'').length>max?`${String(s).slice(0,max)}…`:String(s??'');
function toast(message,type='success'){state.toast={message,type};clearTimeout(toastTimer);renderToast();toastTimer=setTimeout(()=>{state.toast=null;renderToast();},4500);}
function renderToast(){const box=document.getElementById('toast-host');if(box)box.innerHTML=state.toast?`<div class="toast ${state.toast.type}">${ic(state.toast.type==='error'?'alert':'check')} ${e(state.toast.message)}</div>`:'';}
async function persist(){try{await writeWorkspace(state.workspace);state.storageReady=true;}catch(err){state.storageReady=false;toast(`Не удалось сохранить в IndexedDB: ${err?.message||err}`,'error');}}
function refreshRelations(){relations=buildRelations(state.workspace.structure);}
function navigate(url){state.modal=null;state.search='';state.searchOpen=false;const current=location.hash;if(current===url){render();return;}location.hash=url;}

function renderRail(){const route=hashRoute();return `<aside class="rail">
  <a href="#/" aria-label="Главная" class="rail-logo">e<span>·</span></a>
  <div class="rail-separator"></div>
  <button class="rail-link ${route.kind==='overview'?'selected':''}" data-action="home" title="Обзор">${ic('grid',21)}</button>
  <button class="rail-link ${route.kind==='section'||route.kind==='app'?'selected':''}" data-action="sections" title="Структура">${ic('layers',21)}</button>
  <button class="rail-link" data-action="history" title="История импорта">${ic('clock',21)}</button>
  <div class="rail-space"></div>
  <button class="rail-link" data-action="help" title="О проекте">${ic('help',21)}</button>
  <div class="rail-avatar" title="Локальный проект">L</div>
</aside>`;}
function renderSidebar(){
  const route=hashRoute(),structure=state.workspace.structure;
  return `<aside class="sidebar ${state.sidebarOpen?'':'sidebar-hidden'}">
    <div class="sidebar-title"><div><div class="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</div><h2>Структура ELMA365</h2></div><button class="icon-button" data-action="collapse-sidebar" title="Свернуть навигацию">${ic('menu',18)}</button></div>
    <div class="workspace-selector">${ic('database')} <span class="workspace-name">${state.workspace.demo?'Демо-проект':'Импортированная структура'}</span> ${ic('chevron',14)}</div>
    <div class="sidebar-scroll"><div class="sidebar-section-label"><span>РАЗДЕЛЫ</span><span class="count">${structure.sections.length}</span></div>
    <div class="tree"><a class="tree-overview ${route.kind==='overview'?'active':''}" href="#/">${ic('grid',17)} <span>Общий обзор</span></a>
    ${structure.sections.map(s=>{
      const expanded=state.expanded.has(s.code);
      const apps=s.applications||[];
      return `<div class="tree-group"><div class="tree-group-head ${((route.kind==='section'&&route.key===s.code)||(route.kind==='app'&&route.key.startsWith(s.code+'/')))?'tree-current':''}">
        <button class="tree-expand ${expanded?'open':''}" data-action="toggle-section" ${attrKey(s.code)} aria-label="${expanded?'Свернуть':'Развернуть'}">${ic('chevron',13)}</button>
        <a class="tree-section-title" href="${routeSection(s.code)}" title="${escAttr(s.name)}">${e(s.name)}</a><span class="tree-count">${apps.length}</span>
      </div>${expanded?`<div class="tree-children">${apps.length?apps.map(a=>{const k=appKey(s.code,a.code);return `<a href="${routeApp(k)}" class="tree-child ${route.kind==='app'&&route.key===k?'active':''}" title="${escAttr(a.name)}">${ic('file',14)}<span>${e(a.name)}</span>${isArchived(k)?'<i class="archive-dot" title="Не найдено в последнем импорте"></i>':''}</a>`;}).join(''):'<div class="tree-empty">Нет приложений</div>'}</div>`:''}</div>`;
    }).join('')}</div></div>
    <div class="sidebar-bottom"><div class="side-note">${ic('shield',15)} <span>Данные хранятся в вашем браузере</span></div>${button('Импортировать JSON','import','primary','upload','class="full-width"')}</div>
  </aside>`;
}
function searchCandidates(){const q=state.search.trim().toLocaleLowerCase('ru');if(!q)return[];
  return relations.entries.filter(x=>[x.app.name,x.app.code,x.section.name,x.section.code,x.app.elementName].some(z=>String(z||'').toLocaleLowerCase('ru').includes(q))).slice(0,14);
}
function searchMarkup(){if(!state.searchOpen||!state.search.trim())return'';
 const candidates=searchCandidates();
 return `<div class="search-results"><div class="results-heading">РЕЗУЛЬТАТЫ ПОИСКА <span>${candidates.length}${candidates.length===14?'+':''}</span></div>${candidates.length?candidates.map(x=>`<button class="result-item" data-action="goto-app" ${attrKey(x.key)}>${ic('file',17)}<span><strong>${e(x.app.name)}</strong><small>${e(x.section.name)} / ${e(x.app.code)}</small></span>${ic('arrow',15)}</button>`).join(''):`<div class="no-results">Ничего не найдено. Попробуйте название или код приложения.</div>`}</div>`;
}
function renderHeader(){return `<header class="header">
  <button class="mobile-menu icon-button" data-action="collapse-sidebar" title="Меню">${ic('menu')}</button>
  <div class="search-wrap"><div class="search-box">${ic('search',19)}<input id="global-search" autocomplete="off" type="search" value="${escAttr(state.search)}" placeholder="Найти приложение по названию или коду…" aria-label="Поиск приложения"/><kbd>Ctrl K</kbd></div><div id="search-host">${searchMarkup()}</div></div>
  <div class="header-actions"><div class="local-indicator"><span class="green-dot"></span> Локально</div>${button('Экспорт','export','ghost','download')}${button('Импорт JSON','import','primary','upload')}</div>
</header>`;}
function bread(items){return `<div class="breadcrumbs"><a href="#/">Пространство</a>${items.map(x=>`${ic('chevron',14)}${x.url?`<a href="${x.url}">${e(x.name)}</a>`:`<span>${e(x.name)}</span>`}`).join('')}</div>`;}
function statCard(value,label,iconName,style='blue'){return `<div class="stat-card"><div class="stat-icon ${style}">${ic(iconName,21)}</div><div><div class="stat-value">${formatNumber(value)}</div><div class="stat-label">${label}</div></div></div>`;}
function renderOverview(){const d=state.workspace.structure,s=countStats(d);
 const ranked=[...d.sections].sort((a,b)=>(b.applications?.length||0)-(a.applications?.length||0));
 return `${bread([{name:'Обзор'}])}<div class="page-heading"><div><span class="section-kicker">ОБЗОР ПРОЕКТА</span><h1>Структура системы</h1><p>Разделы, приложения и зависимости в одном рабочем пространстве</p></div><div class="heading-actions">${button('Тестовые данные','generate-all','secondary','plus')}${button('Загрузить структуру','import','primary','upload')}</div></div>
 ${state.workspace.demo?`<div class="notice demo-notice">${ic('info',20)}<div><strong>Демонстрационный проект</strong><p>Сейчас показана безопасная примерная структура. Загрузите ваш <code>structure.json</code>, чтобы работать с настоящими разделами и приложениями.</p></div>${button('Выбрать JSON','import','secondary','upload')}</div>`:''}
 ${!state.storageReady?`<div class="notice warning-notice">${ic('alert')} Ваш браузер не разрешил сохранение в IndexedDB. Перед закрытием вкладки экспортируйте данные.</div>`:''}
 <div class="stats-grid">${statCard(s.sections,'Разделов','folder','blue')}${statCard(s.apps,'Приложений','grid','purple')}${statCard(s.fields,'Полей данных','table','mint')}${statCard(s.processes,'Бизнес-процессов','workflow','orange')}</div>
 <div class="overview-grid"><section class="panel"><div class="panel-top"><div><h2>Разделы системы</h2><p>Переходите к составу каждого раздела</p></div><span class="minor-tag">${s.sections} всего</span></div>
 <div class="section-table"><div class="table-head grid-row"><span>НАЗВАНИЕ РАЗДЕЛА</span><span>КОД</span><span>ПРИЛОЖЕНИЯ</span><span></span></div>${ranked.map(section=>`<a class="grid-row section-row" href="${routeSection(section.code)}"><div class="section-name"><span class="section-folder">${ic('folder',18)}</span><span>${e(section.name)}</span></div><span class="mono row-code">${e(section.code)}</span><span class="row-num">${section.applications?.length||0}</span>${ic('chevron',16)}</a>`).join('')}</div></section>
 <div class="overview-side"><section class="panel info-panel"><div class="panel-top"><h2>Рабочее пространство</h2></div><div class="info-line"><span>Источник данных</span><strong>${state.workspace.demo?'Демо':'Импорт JSON'}</strong></div><div class="info-line"><span>Страниц</span><strong>${formatNumber(s.pages)}</strong></div><div class="info-line"><span>Отчётов</span><strong>${formatNumber(s.reports)}</strong></div><div class="info-line"><span>Модулей</span><strong>${d.modules?.length||0}</strong></div><div class="info-line"><span>Решений</span><strong>${d.solutions?.length||0}</strong></div><div class="info-line"><span>Тестовых записей</span><strong>${totalRecords()}</strong></div></section>
 <section class="panel info-panel"><div class="panel-top"><h2>Модули и решения</h2></div><details class="entity-details"><summary>Модули <span>${d.modules?.length||0}</span></summary><div class="entity-list">${(d.modules||[]).map(m=>`<div><strong>${e(m.name)}</strong><code>${e(m.code||'')}</code></div>`).join('')||'<p>В выгрузке нет модулей</p>'}</div></details><details class="entity-details"><summary>Решения <span>${d.solutions?.length||0}</span></summary><div class="entity-list">${(d.solutions||[]).map(m=>`<div><strong>${e(m.name)}</strong><code>${e(m.code||'')}</code></div>`).join('')||'<p>В выгрузке нет решений</p>'}</div></details></section>
 <section class="panel onboarding-panel"><div class="onboarding-icon">${ic('network',25)}</div><h2>Исследуйте связи</h2><p>Связи между приложениями определяются по полям <code>SYS_COLLECTION</code> и другим ссылочным типам. Доступны входящие и исходящие зависимости.</p>${button('Открыть CRM','goto-crm','secondary','arrow')}</section>
 <section class="panel info-panel"><div class="panel-top"><h2>Импорты</h2>${button('История','history','tiny','clock')}</div>${state.workspace.history.length?state.workspace.history.slice(0,3).map(h=>`<div class="history-mini">${ic('check',16)}<span>${prettyDate(h.at)}</span><strong>${h.apps} прил.</strong></div>`).join(''):'<p class="muted small">Ваши импорты появятся здесь. При повторной загрузке старые приложения и тестовые записи сохраняются.</p>'}</section></div></div>`;
}
function renderSection(){const s=activeSection();if(!s)return renderMissing();
 const apps=s.applications||[],pages=s.pages||[],reports=s.reports||[],processes=s.processes||[];
 return `${bread([{name:'Разделы',url:'#/'},{name:s.name}])}<div class="page-heading"><div><span class="section-kicker">РАЗДЕЛ / ${e(s.code)}</span><h1>${e(s.name)}</h1><p>Состав раздела и связанные компоненты экспортированной системы</p></div><div class="heading-actions">${button('Экспорт структуры','export','secondary','download')}</div></div>
 <div class="stats-grid">${statCard(apps.length,'Приложений','grid')}${statCard(pages.length,'Страниц','document','purple')}${statCard(processes.length,'Процессов раздела','workflow','orange')}${statCard(reports.length,'Отчётов','table','mint')}</div>
 <section class="panel"><div class="panel-top"><div><h2>Приложения</h2><p>Список доступных в экспорте приложений</p></div></div><div class="app-grid">${apps.length?apps.map(a=>{const key=appKey(s.code,a.code);return `<a class="app-tile" href="${routeApp(key)}"><span class="app-tile-icon">${ic('grid',20)}</span><div><strong>${e(a.name)}</strong><small class="mono">${e(a.code)}</small><span class="tile-details">${a.fields?.length||0} полей · ${appProcesses(s,a).length} БП${isArchived(key)?' · Сохранено из прежнего импорта':''}</span></div>${ic('chevron',17)}</a>`;}).join(''):`<div class="empty-state">${ic('folder',34)}<h3>В разделе нет приложений</h3><p>Содержимое представлено страницами, отчётами или процессами либо не входит в экспорт.</p></div>`}</div></section>
 <div class="two-panels"><section class="panel"><div class="panel-top"><h2>Страницы <span class="heading-count">${pages.length}</span></h2></div>${pages.length?pages.map(p=>`<div class="compact-row">${ic('document',17)}<span><strong>${e(p.name)}</strong><small class="mono">${e(p.code||'')}</small></span>${p.hidden?'<small>Скрыта</small>':''}</div>`).join(''):'<p class="panel-empty">Не обнаружены в JSON</p>'}</section>
 <section class="panel"><div class="panel-top"><h2>Отчёты <span class="heading-count">${reports.length}</span></h2></div>${reports.length?reports.map(p=>`<div class="compact-row">${ic('table',17)}<span><strong>${e(p.name)}</strong><small class="mono">${e(p.code||'')}</small></span></div>`).join(''):'<p class="panel-empty">Не обнаружены в JSON</p>'}</section></div>
 ${processes.length?`<section class="panel"><div class="panel-top"><h2>Бизнес-процессы раздела <span class="heading-count">${processes.length}</span></h2></div><div class="simple-list">${processes.map(p=>processRow(p)).join('')}</div></section>`:''}`;
}
function renderMissing(){return `${bread([{name:'Не найдено'}])}<div class="empty-state standalone">${ic('alert',42)}<h2>Элемент не найден</h2><p>Возможно, ссылка указывает на приложение, которого нет в загруженном JSON.</p>${button('На главную','home','primary','arrow')}</div>`;}
function tabButton(id,label,iconName,count=''){return `<button class="tab ${state.activeTab===id?'active':''}" data-action="tab" data-tab="${id}">${ic(iconName,17)}${label}${count!==''?`<span class="tab-count">${count}</span>`:''}</button>`;}
function renderApp(){const entry=activeEntry();if(!entry)return renderMissing();const {section,app,key}=entry;
 const incoming=relations.inward.get(key)||[],outgoing=relations.outward.get(key)||[],proc=appProcesses(section,app),records=state.workspace.records[key]||[],access=findAccessEntries(section,app);
 return `${bread([{name:section.name,url:routeSection(section.code)},{name:app.name}])}<div class="page-heading app-heading"><div><span class="section-kicker">ПРИЛОЖЕНИЕ / ${e(section.code)}.${e(app.code)}</span><h1><span class="title-app-icon">${ic('grid',26)}</span>${e(app.name)}</h1><p>${e(app.elementName||app.name)} · ${e(app.type||'STANDARD')} ${isArchived(key)?'<span class="stale-label">Сохранено из предыдущей выгрузки</span>':''}</p></div><div class="heading-actions">${button('Создать 5 записей','generate','secondary','plus')}${button('JSON приложения','app-json','primary','code')}</div></div>
 <div class="app-metrics"><div><strong>${formatNumber(app.fields?.length||0)}</strong><span>Полей</span></div><div><strong>${formatNumber(records.length)}</strong><span>Тестовых записей</span></div><div><strong>${formatNumber(outgoing.length+incoming.length)}</strong><span>Связей</span></div><div><strong>${formatNumber(proc.length)}</strong><span>Бизнес-процессов</span></div></div>
 <div class="tabs">${tabButton('records','Тестовые данные','database',records.length)}${tabButton('fields','Поля','table',app.fields?.length||0)}${tabButton('relations','Связи','network',outgoing.length+incoming.length)}${tabButton('processes','Бизнес-процессы','workflow',proc.length)}${tabButton('access','Доступ','shield',access.length)}</div>
 <div class="tab-content">${state.activeTab==='records'?renderRecords(entry):state.activeTab==='fields'?renderFields(entry):state.activeTab==='relations'?renderRelations(entry):state.activeTab==='processes'?renderProcesses(entry):renderAccess(entry)}</div>`;
}
function formatValue(val,short=true){if(val===null||val===undefined||val==='')return '<span class="null-value">—</span>';
 if(typeof val==='boolean')return val?'<span class="boolean-yes">Да</span>':'Нет';
 if(Array.isArray(val))return val.length?val.map(x=>formatValue(x,short)).join(', '):'<span class="null-value">[]</span>';
 if(typeof val==='object'){
  if(val.appKey&&val.name)return `<a href="${routeApp(val.appKey)}" class="cell-link" title="Открыть связанное приложение">${ic('network',13)}${e(val.name)}</a>`;
  return `<code class="json-value">${e(oneLine(JSON.stringify(val),short?55:500))}</code>`;
 }
 const str=String(val);return e(short?oneLine(str,56):str);
}
function renderRecords(entry){const {app,key}=entry,rows=state.workspace.records[key]||[];
 const fields=[...(app.fields||[])].filter(f=>!['__id','__deletedAt','__debug','__externalProcessMeta','__tasks','__tasks_performers','__tasks_earliest_duedate'].includes(f.code));
 const mainFields=fields.filter(f=>!f.code.startsWith('__')).slice(0,5);
 if(!mainFields.some(f=>f.code==='__name'))mainFields.unshift({code:'__name',view:{name:'Название'},type:'STRING'});
 return `<section class="panel tab-panel"><div class="panel-top"><div><h2>Тестовые записи</h2><p>Генерация по типам полей, без обращения к ELMA365</p></div><div>${button('Добавить 5 записей','generate','primary','plus')}${rows.length?button('Скачать JSON','export-records','secondary','download'):''}</div></div>
 ${rows.length?`<div class="records-overflow"><table class="data-table"><thead><tr><th>№</th>${mainFields.map(f=>`<th>${e(f.view?.name||f.code)}</th>`).join('')}<th>ДЕЙСТВИЕ</th></tr></thead><tbody>${rows.slice(0,100).map((r,i)=>`<tr><td class="muted">${i+1}</td>${mainFields.map(f=>`<td>${f.code==='__name'?e(r.title):formatValue(r.fields?.[f.code])}</td>`).join('')}<td><button class="table-action" data-action="open-record" data-index="${i}" ${attrKey(key)} title="Открыть карточку">${ic('eye',16)} Открыть</button></td></tr>`).join('')}</tbody></table></div>${rows.length>100?`<div class="table-footer">Показаны первые 100 из ${rows.length} записей. Полный набор доступен для выгрузки в JSON.</div>`:''}`:`<div class="empty-state records-empty"><span class="empty-icon">${ic('database',30)}</span><h3>Пока нет тестовых данных</h3><p>Создайте примеры записей на основе типов полей приложения. Существующие данные сохраняются между импортами.</p>${button('Сгенерировать 5 записей','generate','primary','plus')}</div>`}</section>`;
}
function renderFields(entry){const fields=entry.app.fields||[];
 return `<section class="panel tab-panel"><div class="panel-top"><div><h2>Структура полей</h2><p>Все поля из выгрузки ELMA365, включая системные</p></div><span class="minor-tag">${fields.length} полей</span></div><div class="records-overflow"><table class="data-table fields-table"><thead><tr><th>НАЗВАНИЕ</th><th>КОД</th><th>ТИП</th><th>ОБЯЗАТЕЛЬНОЕ</th><th>МНОЖЕСТВЕННОЕ</th><th>СВЯЗЬ</th></tr></thead><tbody>${fields.map(f=>{const target=resolveRelation(entry.key,f.code);return `<tr><td><strong>${e(f.view?.name||f.code)}</strong></td><td class="mono muted">${e(f.code)}</td><td><span class="type-chip">${e(f.type||'—')}</span></td><td>${f.required?'<span class="boolean-yes">Да</span>':'Нет'}</td><td>${f.array?'Да':'Нет'}</td><td>${target?`<a class="cell-link" href="${routeApp(target)}">${ic('network',14)}${e(relations.byKey.get(target)?.app.name||target)}</a>`:f.data?.code?`<span class="muted">${e(f.data.code)}</span>`:'—'}</td></tr>`;}).join('')}</tbody></table></div></section>`;
}
function resolveRelation(key,fieldCode){return (relations.outward.get(key)||[]).find(x=>x.fieldCode===fieldCode)?.target;}
function relationRow(edge,isIncoming){const target=isIncoming?edge.source:edge.target;
 const match=relations.byKey.get(target);return `<div class="relation-row"><div class="relation-icon ${isIncoming?'purple':''}">${ic('network',19)}</div><div class="relation-main"><strong>${match?`<a href="${routeApp(target)}">${e(match.app.name)}</a>`:e(edge.targetCode||'Неизвестное приложение')}</strong><small>${match?`${e(match.section.name)} / ${e(match.app.code)}`:e(edge.namespace||'Целевое приложение не найдено в JSON')}</small><span class="relation-field">Через поле: <b>${e(edge.field)}</b> <code>${e(edge.fieldCode)}</code></span></div><span class="type-chip">${e(edge.type)}</span>${match?`<a href="${routeApp(target)}" class="relation-arrow" title="Перейти к приложению">${ic('arrow',18)}</a>`:''}</div>`;}
function renderRelations(entry){const incoming=relations.inward.get(entry.key)||[],outgoing=relations.outward.get(entry.key)||[];
 return `<div class="two-panels relations-panels"><section class="panel"><div class="panel-top"><div><h2>Исходящие связи <span class="heading-count">${outgoing.length}</span></h2><p>На какие приложения ссылаются поля</p></div></div>${outgoing.length?outgoing.map(x=>relationRow(x,false)).join(''):'<div class="panel-empty">Прямые связи в полях не обнаружены</div>'}</section><section class="panel"><div class="panel-top"><div><h2>Входящие связи <span class="heading-count">${incoming.length}</span></h2><p>Какие приложения ссылаются на текущее</p></div></div>${incoming.length?incoming.map(x=>relationRow(x,true)).join(''):'<div class="panel-empty">Другие приложения не ссылаются на это приложение</div>'}</section></div>`;
}
function processRow(p){return `<div class="compact-row process-item">${ic('workflow',19)}<span><strong>${e(p.name||p.code)}</strong><small class="mono">${e(p.namespace||'')} · ${e(p.code||'')}</small></span>${p.version!==undefined?`<span class="minor-tag">v${e(p.version)}</span>`:''}</div>`;}
function renderProcesses(entry){const processes=appProcesses(entry.section,entry.app);
 return `<section class="panel tab-panel"><div class="panel-top"><div><h2>Бизнес-процессы</h2><p>Процессы приложения из полей <code>processes</code> в JSON</p></div></div>${processes.length?`<div class="simple-list">${processes.map(processRow).join('')}</div>`:`<div class="empty-state">${ic('workflow',32)}<h3>Бизнес-процессы не найдены</h3><p>В данном экспорте у приложения нет перечисленных бизнес-процессов.</p></div>`}</section>`;
}
function renderAccess(entry){const matches=findAccessEntries(entry.section,entry.app);
 return `<section class="panel tab-panel"><div class="panel-top"><div><h2>Группы и права доступа</h2><p>Данные показываются только если присутствуют непосредственно в JSON</p></div></div>${matches.length?matches.map(x=>`<div class="access-item"><div><strong>${e(x.owner)}: ${e(x.key)}</strong></div><pre class="code-preview">${e(JSON.stringify(x.value,null,2))}</pre></div>`).join(''):`<div class="empty-state">${ic('shield',34)}<h3>Настройки доступа не включены в экспорт</h3><p>В JSON нет явных полей групп, ролей или прав доступа на уровне этого приложения или раздела. Отсутствие данных <b>не означает</b> открытый доступ в ELMA365.</p></div>`}</section>`;
}
function renderModal(){const modal=state.modal;if(!modal)return'';
 let title='',content='',footer='';
 if(modal.type==='history'){
  title='История импортов';content=`<p class="modal-subtitle">При повторном импорте новые элементы добавляются, существующие обновляются, а отсутствующие в новой выгрузке сохраняются.</p>${state.workspace.history.length?state.workspace.history.map((h,i)=>`<div class="history-row"><div class="history-badge">${i+1}</div><div><strong>${prettyDate(h.at)}</strong><small>${h.sections} разделов · ${h.apps} приложений · +${h.newApps||0} новых</small></div></div>`).join(''):'<div class="panel-empty">История пока пуста</div>'}`;
 }
 if(modal.type==='help'){
  title='О проекте';content=`<div class="help-body"><p><b>ELMA365 Structure Explorer</b> — независимый браузерный инструмент для изучения экспортированной структуры ELMA365.</p><h3>Как пользоваться</h3><ol><li>Нажмите «Импорт JSON» и выберите экспорт <code>structure.json</code>.</li><li>Найдите приложение через поиск в шапке или в меню разделов.</li><li>В карточке приложения посмотрите поля, связи, процессы и доступы.</li><li>Сгенерируйте тестовые записи и экспортируйте их при необходимости.</li><li>Загрузите следующую версию JSON: прежние приложения и тестовые данные сохранятся.</li></ol><p>Данные не отправляются на сервер. Они сохраняются в <b>IndexedDB конкретного браузера</b>, не синхронизируются между устройствами и могут быть удалены при очистке данных сайта.</p><p>Режим просмотра: не подключается к реальной ELMA365 и не выполняет настоящие бизнес-процессы.</p></div>`;
 }
 if(modal.type==='json'){
  title=`JSON: ${modal.name}`;content=`<pre class="code-preview big-code">${e(JSON.stringify(modal.data,null,2))}</pre>`;
 }
 if(modal.type==='record'){
  const {key,index}=modal,entry=relations.byKey.get(key),rec=state.workspace.records[key]?.[index];
  if(!entry||!rec)return'';
  title=rec.title;content=`<div class="record-metadata">${ic('database',17)} <span>Тестовая запись · ${e(entry.app.name)} · ${e(rec.id)}</span></div><div class="record-fields">${(entry.app.fields||[]).map(f=>`<div class="record-field"><div><strong>${e(f.view?.name||f.code)}</strong><small class="mono">${e(f.code)} · ${e(f.type)}</small></div><div>${f.code==='__name'?e(rec.title):formatValue(rec.fields?.[f.code],false)}</div></div>`).join('')}</div>`;
 }
 if(modal.type==='generate-all'){
  title='Генерация тестовых данных';content=`<p>Добавить по <b>5 записей для каждого из ${relations.entries.length} приложений</b>?</p><p class="muted small">Все новые записи будут локальными. Существующие записи сохраняются. Поля связей при наличии связанных приложений получат ссылки на сгенерированные элементы.</p>`;
  footer=`${button('Отмена','close-modal','secondary')}${button('Создать записи','confirm-generate-all','primary','plus')}`;
 }
 if(modal.type==='reset'){
  title='Очистить рабочее пространство?';content=`<p>Загруженная структура, история импортов и все тестовые записи будут удалены из браузера. Вернётся демонстрационная структура.</p><p class="muted small">Перед очисткой можно скачать резервную копию данных.</p>`;
  footer=`${button('Отмена','close-modal','secondary')}${button('Очистить','confirm-reset','danger','alert')}`;
 }
 return `<div class="modal-backdrop" data-action="close-modal"><div role="dialog" aria-modal="true" class="modal ${modal.type==='record'?'modal-wide':''}" ><div class="modal-heading"><h2>${e(title)}</h2><button class="icon-button" data-action="close-modal">${ic('close',20)}</button></div><div class="modal-content">${content}</div>${footer?`<div class="modal-footer">${footer}</div>`:''}</div></div>`;
}
function render(){const route=hashRoute();root.innerHTML=`<div class="app-shell">${renderRail()}${renderSidebar()}<div class="main-shell">${renderHeader()}<main class="content">${route.kind==='app'?renderApp():route.kind==='section'?renderSection():renderOverview()}<footer class="page-footer">ELMA365 Structure Explorer <span>·</span> Browser-only <span>·</span> Неофициальный инструмент</footer></main></div></div><div id="toast-host"></div><div id="modal-host">${renderModal()}</div>`;renderToast();}

async function onImport(file){if(!file)return;
 try{
  if(file.size>80*1024*1024)throw new Error('Файл слишком большой (более 80 МБ).');
  const contents=await file.text();const parsed=JSON.parse(contents);
  if(!parsed || !Array.isArray(parsed.sections))throw new Error('Ожидается JSON-объект с массивом sections.');
  const prior=state.workspace.demo?{sections:[],modules:[],solutions:[]}:state.workspace.structure;
  const before=countStats(prior),afterIncoming=countStats(parsed);
  const merged=mergeStructure(prior,parsed),mergedStats=countStats(merged);
  const present=getApps(parsed).map(x=>x.key);
  const historyEntry={at:new Date().toISOString(),name:file.name,sections:afterIncoming.sections,apps:afterIncoming.apps,newApps:Math.max(0,mergedStats.apps-before.apps),savedApps:mergedStats.apps};
  state.workspace={...state.workspace,structure:merged,history:[historyEntry,...state.workspace.history].slice(0,30),lastPresentApps:present,demo:false};
  refreshRelations();state.expanded=new Set(merged.sections.slice(0,5).map(s=>s.code));
  const previous=hashRoute().key;if(previous&&!relations.byKey.has(previous))location.hash='#/';
  await persist();render();toast(`Импортировано ${afterIncoming.apps} приложений. В объединённой структуре: ${mergedStats.apps}.`);
 }catch(err){toast(`Ошибка импорта: ${err?.message||'не удалось прочитать JSON'}`,'error');}
 finally{fileInput.value='';}
}
fileInput.addEventListener('change',ev=>onImport(ev.target.files?.[0]));
root.addEventListener('input',ev=>{
 if(ev.target.id==='global-search'){
  state.search=ev.target.value;state.searchOpen=true;
  const host=document.getElementById('search-host');if(host)host.innerHTML=searchMarkup();
 }
});
root.addEventListener('click',async ev=>{
 const el=ev.target.closest('[data-action]');
 if(!el){if(state.searchOpen && !ev.target.closest('.search-wrap')){state.searchOpen=false;const host=document.getElementById('search-host');if(host)host.innerHTML='';}return;}
 const action=el.dataset.action;
 try{
  if(action==='import'){fileInput.click();return;}
  if(action==='home'){navigate('#/');return;}
  if(action==='sections'){const first=state.workspace.structure.sections.find(s=>(s.applications||[]).length)||state.workspace.structure.sections[0];if(first)navigate(routeSection(first.code));return;}
  if(action==='goto-crm'){const crm=state.workspace.structure.sections.find(s=>s.code==='_clients')||state.workspace.structure.sections.find(s=>(s.applications||[]).length);if(crm)navigate(routeSection(crm.code));return;}
  if(action==='toggle-section'){const key=el.dataset.key;state.expanded.has(key)?state.expanded.delete(key):state.expanded.add(key);render();return;}
  if(action==='collapse-sidebar'){state.sidebarOpen=!state.sidebarOpen;render();return;}
  if(action==='goto-app'){state.activeTab='records';navigate(routeApp(el.dataset.key));return;}
  if(action==='tab'){state.activeTab=el.dataset.tab;render();return;}
  if(action==='history'){state.modal={type:'history'};render();return;}
  if(action==='help'){state.modal={type:'help'};render();return;}
  if(action==='close-modal'){state.modal=null;render();return;}
  if(action==='open-record'){state.modal={type:'record',index:Number(el.dataset.index),key:el.dataset.key};render();return;}
  if(action==='app-json'){const entry=activeEntry();if(entry){state.modal={type:'json',name:entry.app.name,data:entry.app};render();}return;}
  if(action==='export'){exportJSON('elma365-structure-merged.json',state.workspace.structure);toast('Структура выгружена в JSON.');return;}
  if(action==='export-records'){const entry=activeEntry();if(entry){exportJSON(`elma365-test-data-${entry.section.code}-${entry.app.code}.json`,state.workspace.records[entry.key]||[]);toast('Тестовые записи выгружены.');}return;}
  if(action==='generate'){
   const entry=activeEntry();if(!entry)return;
   state.workspace.records=generateForApp(entry,5,state.workspace.records,relations);
   await persist();render();toast('Добавлено 5 тестовых записей.');return;
  }
  if(action==='generate-all'){state.modal={type:'generate-all'};render();return;}
  if(action==='confirm-generate-all'){
   state.workspace.records=generateForAll(state.workspace.structure,5,state.workspace.records);
   state.modal=null;await persist();render();toast(`Создано ${relations.entries.length*5} тестовых записей.`);return;
  }
  if(action==='reset'){state.modal={type:'reset'};render();return;}
  if(action==='confirm-reset'){
   state.workspace={structure:DEMO,records:{},history:[],lastPresentApps:[],demo:true};
   refreshRelations();state.modal=null;navigate('#/');await persist();render();toast('Рабочее пространство очищено.');return;
  }
 }catch(err){console.error(err);toast(`Ошибка: ${err.message||String(err)}`,'error');}
});
// Modal overlay lives outside the main root; events are delegated separately.
document.getElementById('root').parentElement.addEventListener('click',async ev=>{
 if(root.contains(ev.target))return;
 const el=ev.target.closest('[data-action]');if(!el)return;
 const action=el.dataset.action;
 if(action==='close-modal'){state.modal=null;render();return;}
 if(action==='confirm-generate-all'){
  state.workspace.records=generateForAll(state.workspace.structure,5,state.workspace.records);
  state.modal=null;await persist();render();toast(`Создано ${relations.entries.length*5} тестовых записей.`);return;
 }
 if(action==='confirm-reset'){
  state.workspace={structure:DEMO,records:{},history:[],lastPresentApps:[],demo:true};refreshRelations();state.modal=null;navigate('#/');await persist();render();toast('Рабочее пространство очищено.');return;
 }
});
window.addEventListener('hashchange',()=>{state.activeTab='records';state.searchOpen=false;render();});
window.addEventListener('keydown',ev=>{
 if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='k'){ev.preventDefault();document.getElementById('global-search')?.focus();}
 if(ev.key==='Escape'){if(state.modal){state.modal=null;render();}else if(state.searchOpen){state.searchOpen=false;const host=document.getElementById('search-host');if(host)host.innerHTML='';}}
});
async function init(){try{const saved=await readWorkspace();if(saved?.structure && Array.isArray(saved.structure.sections)){state.workspace={records:{},history:[],lastPresentApps:[],demo:false,...saved};state.expanded=new Set((saved.structure.sections||[]).slice(0,4).map(s=>s.code));}}catch(err){state.storageReady=false;console.warn('IndexedDB unavailable',err);}refreshRelations();render();}
init();
