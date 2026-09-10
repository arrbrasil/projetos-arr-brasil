let ARR_MAP=null,OVERVIEW_DATA=null,SELECTED_LAYER=null,MARKER_LAYER=null,BASE_LAYER=null,ACTIVE_PROJECT_ID='';
const DETAIL_CACHE=new Map();
const MAP_PROJECTS=()=>PROJECTS.filter(p=>p.registry==='Verra');
function mapEsc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function projectById(id){return PROJECTS.find(p=>p.registry==='Verra'&&String(p.id)===String(id))}
function featureId(feature){return String(feature?.properties?.projectId||'')}
function geometryProjects(data){return new Set((data?.features||[]).map(featureId).filter(Boolean))}
function projectLabel(id){const p=projectById(id);return p?`${p.id} — ${p.name}`:`Projeto Verra ${id}`}
function setMapStatus(text,kind=''){const el=document.getElementById('mapStatus');if(el){el.textContent=text;el.className=`mapStatus ${kind}`.trim()}}
async function fetchJson(url){const response=await fetch(url,{cache:'force-cache'});if(!response.ok)throw new Error('Arquivo geográfico indisponível');return response.json()}
async function fetchGzipJson(url){const response=await fetch(url,{cache:'force-cache'});if(!response.ok)throw new Error('Arquivo geográfico indisponível');if(typeof DecompressionStream!=='function')throw new Error('Navegador sem suporte à descompactação');const stream=response.body.pipeThrough(new DecompressionStream('gzip'));return new Response(stream).json()}
async function loadBoundary(id){
 const key=String(id);if(DETAIL_CACHE.has(key))return DETAIL_CACHE.get(key);
 setMapStatus(`Carregando o limite do projeto ${key}…`,'loading');
 const request=fetchGzipJson(`project-limits/${encodeURIComponent(key)}.geo.json.gz?v=23`).catch(error=>{DETAIL_CACHE.delete(key);throw error});
 DETAIL_CACHE.set(key,request);return request;
}
function popupHtml(id){const p=projectById(id);if(!p)return `<strong>Projeto Verra ${mapEsc(id)}</strong>`;return `<div class="projectPopup"><small>VERRA ${mapEsc(p.id)}</small><strong>${mapEsc(p.name)}</strong><span>${mapEsc(p.idesamState||p.state||'Localização não informada')}</span><span>Clique no ponto para carregar o limite.</span><button type="button" data-project-detail="${mapEsc(p.id)}">Abrir ficha do projeto</button></div>`}
function bindBoundaryFeature(feature,layer){const id=featureId(feature);layer.bindTooltip(projectLabel(id),{sticky:true,direction:'top'});layer.bindPopup(popupHtml(id),{maxWidth:320})}
function makeMarker(feature){
 const id=featureId(feature),coordinates=feature?.geometry?.coordinates;if(!id||!Array.isArray(coordinates))return null;
 const marker=L.circleMarker([coordinates[1],coordinates[0]],{radius:7,color:'#7d2608',weight:2,fillColor:'#ff7a22',fillOpacity:.96,renderer:L.canvas()});
 marker.bindTooltip(projectLabel(id),{sticky:true,direction:'top'}).bindPopup(popupHtml(id),{maxWidth:320});marker.on('click',()=>selectMapProject(id,true));return marker;
}
function rebuildOverview(rows=PROJECTS){
 if(!ARR_MAP||!OVERVIEW_DATA)return;
 const visible=new Set(rows.filter(p=>p.registry==='Verra').map(p=>String(p.id)));
 MARKER_LAYER.clearLayers();OVERVIEW_DATA.features.filter(f=>visible.has(featureId(f))).forEach(f=>{const marker=makeMarker(f);if(marker)MARKER_LAYER.addLayer(marker)});
 const count=OVERVIEW_DATA.features.filter(f=>visible.has(featureId(f))).length;
 if(ACTIVE_PROJECT_ID&&!visible.has(ACTIVE_PROJECT_ID))clearMapSelection(false);else if(!ACTIVE_PROJECT_ID)setMapStatus(`${count} projetos com limite confirmado neste recorte.`);
}
async function selectMapProject(id,loadExact=true){
 if(!id||!ARR_MAP)return;ACTIVE_PROJECT_ID=String(id);const select=document.getElementById('mapProjectSearch');if(select)select.value=ACTIVE_PROJECT_ID;
 const point=OVERVIEW_DATA.features.find(f=>featureId(f)===ACTIVE_PROJECT_ID);if(point){const c=point.geometry.coordinates;ARR_MAP.flyTo([c[1],c[0]],Math.max(ARR_MAP.getZoom(),9),{animate:true,duration:.5})}
 if(!loadExact)return;
 try{
  const selected=await loadBoundary(ACTIVE_PROJECT_ID);if(ACTIVE_PROJECT_ID!==String(id))return;
  if(SELECTED_LAYER){ARR_MAP.removeLayer(SELECTED_LAYER);SELECTED_LAYER=null}
  SELECTED_LAYER=L.geoJSON(selected,{renderer:L.canvas({padding:.8}),style:{color:'#8f2f0b',weight:3,opacity:1,fillColor:'#ff9a55',fillOpacity:.18},onEachFeature:bindBoundaryFeature});
  if(document.getElementById('layerLimits')?.checked!==false)SELECTED_LAYER.addTo(ARR_MAP);
  const bounds=SELECTED_LAYER.getBounds();if(bounds.isValid())ARR_MAP.fitBounds(bounds.pad(.12),{maxZoom:18,animate:true});
  setMapStatus(`Limite detalhado ativo: ${projectLabel(ACTIVE_PROJECT_ID)}`,'active');
 }catch(_error){setMapStatus(`Não foi possível carregar o limite do projeto ${id}.`,'error')}
}
function clearMapSelection(fit=true){
 ACTIVE_PROJECT_ID='';const select=document.getElementById('mapProjectSearch');if(select)select.value='';
 if(SELECTED_LAYER){ARR_MAP.removeLayer(SELECTED_LAYER);SELECTED_LAYER=null}
 if(fit)ARR_MAP.fitBounds([[-34.2,-74.2],[5.5,-34.2]],{padding:[15,15]});
 setMapStatus(`${geometryProjects(OVERVIEW_DATA).size} projetos com limite confirmado.`);
}
function setupMapControls(){
 const select=document.getElementById('mapProjectSearch'),ids=geometryProjects(OVERVIEW_DATA);
 select.innerHTML='<option value="">Selecione por nome ou ID…</option>'+MAP_PROJECTS().filter(p=>ids.has(String(p.id))).sort((a,b)=>String(a.name).localeCompare(String(b.name),'pt-BR')).map(p=>`<option value="${mapEsc(p.id)}">${mapEsc(p.id)} — ${mapEsc(p.name)}</option>`).join('');
 select.onchange=()=>select.value&&selectMapProject(select.value,true);document.getElementById('mapClearSelection').onclick=()=>clearMapSelection(true);
 document.getElementById('layerLimits').onchange=e=>{if(!SELECTED_LAYER)return;if(e.target.checked)SELECTED_LAYER.addTo(ARR_MAP);else ARR_MAP.removeLayer(SELECTED_LAYER)};
 document.getElementById('layerMarkers').onchange=e=>e.target.checked?MARKER_LAYER.addTo(ARR_MAP):ARR_MAP.removeLayer(MARKER_LAYER);
 document.getElementById('layerBasemap').onchange=e=>e.target.checked?BASE_LAYER.addTo(ARR_MAP):ARR_MAP.removeLayer(BASE_LAYER);
 document.getElementById('brazilMap').addEventListener('click',event=>{const btn=event.target.closest('[data-project-detail]');if(btn){const p=projectById(btn.dataset.projectDetail);if(p)detail(p)}});
}
function refreshVisibleMap(){if(!ARR_MAP)return;setTimeout(()=>{ARR_MAP.invalidateSize(true);if(!ACTIVE_PROJECT_ID)ARR_MAP.fitBounds([[-34.2,-74.2],[5.5,-34.2]],{padding:[15,15],animate:false})},80)}
async function initMap(){
 if(typeof L==='undefined'){setMapStatus('Não foi possível carregar o componente do mapa.','error');return}
 ARR_MAP=L.map('brazilMap',{zoomControl:true,preferCanvas:true,minZoom:3,maxZoom:19,worldCopyJump:false});
 BASE_LAYER=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,updateWhenIdle:true,keepBuffer:2,attribution:'© OpenStreetMap contributors'}).addTo(ARR_MAP);
 MARKER_LAYER=L.layerGroup().addTo(ARR_MAP);ARR_MAP.fitBounds([[-34.2,-74.2],[5.5,-34.2]],{padding:[15,15]});
 try{OVERVIEW_DATA=await fetchJson('project-points.geo.json?v=23');setupMapControls();rebuildOverview(PROJECTS)}catch(_error){setMapStatus('Não foi possível carregar os pontos dos projetos.','error')}
 const locationTab=document.querySelector('[data-tab="localizacao"]');if(locationTab)locationTab.addEventListener('click',refreshVisibleMap);
}
window.updateMap=rows=>rebuildOverview(rows);window.refreshArrMap=refreshVisibleMap;window.addEventListener('DOMContentLoaded',initMap);
