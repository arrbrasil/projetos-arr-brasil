let ARR_MAP=null,OVERVIEW_DATA=null,DETAIL_DATA=null,DETAIL_PROMISE=null;
let OVERVIEW_LAYER=null,SELECTED_LAYER=null,MARKER_LAYER=null,BASE_LAYER=null,ACTIVE_PROJECT_ID='';
const MAP_PROJECTS=()=>PROJECTS.filter(p=>p.registry==='Verra');
function mapEsc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function projectById(id){return PROJECTS.find(p=>p.registry==='Verra'&&String(p.id)===String(id))}
function featureId(feature){return String(feature?.properties?.projectId||'')}
function geometryProjects(data){return new Set((data?.features||[]).map(featureId).filter(Boolean))}
function projectLabel(id){const p=projectById(id);return p?`${p.id} — ${p.name}`:`Projeto Verra ${id}`}
function setMapStatus(text,kind=''){const el=document.getElementById('mapStatus');if(el){el.textContent=text;el.className=`mapStatus ${kind}`.trim()}}
async function fetchGzipJson(url){const response=await fetch(url);if(!response.ok)throw new Error('Arquivo de limites indisponível');if(typeof DecompressionStream!=='function')throw new Error('Este navegador não suporta a descompactação necessária');const stream=response.body.pipeThrough(new DecompressionStream('gzip'));return new Response(stream).json()}
async function loadDetailed(){if(DETAIL_DATA)return DETAIL_DATA;if(DETAIL_PROMISE)return DETAIL_PROMISE;setMapStatus('Carregando o limite selecionado…','loading');DETAIL_PROMISE=fetchGzipJson('verra-projects-confirmed.geo.json.gz?v=22').then(data=>{DETAIL_DATA=data;return data}).catch(error=>{DETAIL_PROMISE=null;setMapStatus(error.message,'error');throw error});return DETAIL_PROMISE}
function popupHtml(id){const p=projectById(id);if(!p)return `<strong>Projeto Verra ${mapEsc(id)}</strong>`;return `<div class="projectPopup"><small>VERRA ${mapEsc(p.id)}</small><strong>${mapEsc(p.name)}</strong><span>${mapEsc(p.idesamState||p.state||'Localização não informada')}</span><button type="button" data-project-detail="${mapEsc(p.id)}">Abrir ficha do projeto</button></div>`}
function bindProjectFeature(feature,layer){const id=featureId(feature);layer.bindTooltip(projectLabel(id),{sticky:true,direction:'top'});layer.bindPopup(popupHtml(id),{maxWidth:320});layer.on('click',()=>selectMapProject(id,true))}
function overviewStyle(feature){const selected=featureId(feature)===ACTIVE_PROJECT_ID;return{color:selected?'#6f2208':'#b84716',weight:selected?4:2,opacity:selected?1:.9,fillColor:'#ef7d32',fillOpacity:selected?.32:.13}}
function makeMarker(feature){const id=featureId(feature),layer=L.geoJSON(feature),bounds=layer.getBounds();if(!bounds.isValid())return null;const marker=L.circleMarker(bounds.getCenter(),{radius:6,color:'#7d2608',weight:2,fillColor:'#ff7a22',fillOpacity:.95,renderer:L.canvas()});marker.bindTooltip(projectLabel(id),{sticky:true,direction:'top'}).bindPopup(popupHtml(id),{maxWidth:320});marker.on('click',()=>selectMapProject(id,true));return marker}
function rebuildOverview(rows=PROJECTS){
 if(!ARR_MAP||!OVERVIEW_DATA)return;const visible=new Set(rows.filter(p=>p.registry==='Verra').map(p=>String(p.id))),filtered={type:'FeatureCollection',features:OVERVIEW_DATA.features.filter(f=>visible.has(featureId(f)))};
 if(OVERVIEW_LAYER){ARR_MAP.removeLayer(OVERVIEW_LAYER);OVERVIEW_LAYER=null}OVERVIEW_LAYER=L.geoJSON(filtered,{renderer:L.canvas({padding:.5}),style:overviewStyle,onEachFeature:bindProjectFeature});
 MARKER_LAYER.clearLayers();filtered.features.forEach(f=>{const marker=makeMarker(f);if(marker)MARKER_LAYER.addLayer(marker)});if(document.getElementById('layerLimits')?.checked!==false)OVERVIEW_LAYER.addTo(ARR_MAP);setMapStatus(`${geometryProjects(filtered).size} projetos com geometria disponíveis no recorte.`);
}
async function selectMapProject(id,loadExact=true){
 if(!id||!ARR_MAP)return;ACTIVE_PROJECT_ID=String(id);document.getElementById('mapProjectSearch').value=ACTIVE_PROJECT_ID;if(OVERVIEW_LAYER)OVERVIEW_LAYER.setStyle(overviewStyle);
 const overviewFeature=OVERVIEW_DATA.features.find(f=>featureId(f)===ACTIVE_PROJECT_ID);if(overviewFeature){const b=L.geoJSON(overviewFeature).getBounds();if(b.isValid())ARR_MAP.fitBounds(b.pad(.18),{maxZoom:15,animate:true})}if(!loadExact)return;
 try{const detailed=await loadDetailed(),selected={type:'FeatureCollection',features:detailed.features.filter(f=>featureId(f)===ACTIVE_PROJECT_ID)};if(SELECTED_LAYER){SELECTED_LAYER.remove();SELECTED_LAYER=null}SELECTED_LAYER=L.geoJSON(selected,{renderer:L.canvas({padding:.8}),style:{color:'#7d2608',weight:4,opacity:1,fillColor:'#ff9a55',fillOpacity:.22},onEachFeature:bindProjectFeature}).addTo(ARR_MAP);SELECTED_LAYER.bringToFront();const bounds=SELECTED_LAYER.getBounds();if(bounds.isValid())ARR_MAP.fitBounds(bounds.pad(.12),{maxZoom:18,animate:true});setMapStatus(`Limite detalhado ativo: ${projectLabel(ACTIVE_PROJECT_ID)}`,'active')}catch(_error){}
}
function clearMapSelection(){ACTIVE_PROJECT_ID='';document.getElementById('mapProjectSearch').value='';if(SELECTED_LAYER){SELECTED_LAYER.remove();SELECTED_LAYER=null}if(OVERVIEW_LAYER)OVERVIEW_LAYER.setStyle(overviewStyle);ARR_MAP.fitBounds([[-34.2,-74.2],[5.5,-34.2]],{padding:[15,15]});setMapStatus(`${geometryProjects(OVERVIEW_DATA).size} projetos com geometria disponíveis.`)}
function setupMapControls(){
 const select=document.getElementById('mapProjectSearch'),ids=geometryProjects(OVERVIEW_DATA);select.innerHTML='<option value="">Selecione por nome ou ID…</option>'+MAP_PROJECTS().filter(p=>ids.has(String(p.id))).sort((a,b)=>String(a.name).localeCompare(String(b.name),'pt-BR')).map(p=>`<option value="${mapEsc(p.id)}">${mapEsc(p.id)} — ${mapEsc(p.name)}</option>`).join('');select.onchange=()=>select.value&&selectMapProject(select.value,true);document.getElementById('mapClearSelection').onclick=clearMapSelection;
 document.getElementById('layerLimits').onchange=e=>{if(e.target.checked){OVERVIEW_LAYER.addTo(ARR_MAP);OVERVIEW_LAYER.bringToBack()}else ARR_MAP.removeLayer(OVERVIEW_LAYER)};document.getElementById('layerMarkers').onchange=e=>e.target.checked?MARKER_LAYER.addTo(ARR_MAP):ARR_MAP.removeLayer(MARKER_LAYER);document.getElementById('layerBasemap').onchange=e=>e.target.checked?BASE_LAYER.addTo(ARR_MAP):ARR_MAP.removeLayer(BASE_LAYER);
 document.getElementById('brazilMap').addEventListener('click',event=>{const btn=event.target.closest('[data-project-detail]');if(btn){const p=projectById(btn.dataset.projectDetail);if(p)detail(p)}});
}
function refreshVisibleMap(){
 if(!ARR_MAP)return;
 setTimeout(()=>{ARR_MAP.invalidateSize(true);if(!ACTIVE_PROJECT_ID)ARR_MAP.fitBounds([[-34.2,-74.2],[5.5,-34.2]],{padding:[15,15],animate:false})},80);
}
async function initMap(){
 if(typeof L==='undefined'){setMapStatus('Não foi possível carregar o componente do mapa.','error');return}ARR_MAP=L.map('brazilMap',{zoomControl:true,preferCanvas:true,minZoom:3,maxZoom:19,worldCopyJump:false});BASE_LAYER=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(ARR_MAP);MARKER_LAYER=L.layerGroup().addTo(ARR_MAP);ARR_MAP.fitBounds([[-34.2,-74.2],[5.5,-34.2]],{padding:[15,15]});
 try{OVERVIEW_DATA=await fetchGzipJson('verra-projects-confirmed.geo.json.gz?v=22');DETAIL_DATA=OVERVIEW_DATA;setupMapControls();rebuildOverview(PROJECTS)}catch(_error){setMapStatus('Não foi possível carregar os limites confirmados.','error')}
 const locationTab=document.querySelector('[data-tab="localizacao"]');if(locationTab)locationTab.addEventListener('click',refreshVisibleMap);
}
window.updateMap=rows=>rebuildOverview(rows);window.refreshArrMap=refreshVisibleMap;window.addEventListener('DOMContentLoaded',initMap);
