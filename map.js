let MAP_DATA=null,MAP_ROWS=PROJECTS;
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function projectStates(p){
 const raw=norm(p.state);if(!raw||raw==='nao informado')return[];
 const names=['Acre','Alagoas','Amapá','Amazonas','Bahia','Ceará','Distrito Federal','Espírito Santo','Goiás','Maranhão','Mato Grosso do Sul','Mato Grosso','Minas Gerais','Pará','Paraíba','Paraná','Pernambuco','Piauí','Rio de Janeiro','Rio Grande do Norte','Rio Grande do Sul','Rondônia','Roraima','Santa Catarina','São Paulo','Sergipe','Tocantins'];
 const found=[];
 names.forEach(name=>{const n=norm(name);let test=raw;if(name==='Mato Grosso')test=raw.replace(/mato grosso do sul/g,'');const re=new RegExp('(^|[^a-z])'+n.replace(/ /g,'\\s+')+'([^a-z]|$)');if(re.test(test))found.push(name)});
 if(raw.trim()==='ms'&&!found.includes('Mato Grosso do Sul'))found.push('Mato Grosso do Sul');
 if(/\(mg\)/.test(raw)&&!found.includes('Minas Gerais'))found.push('Minas Gerais');
 if(raw.includes('rio de janiero')&&!found.includes('Rio de Janeiro'))found.push('Rio de Janeiro');
 return found;
}
function walkCoords(c,fn){if(typeof c[0]==='number')fn(c);else c.forEach(x=>walkCoords(x,fn))}
function renderMap(rows){
 if(!MAP_DATA)return;MAP_ROWS=rows;
 const counts={};rows.forEach(p=>[...new Set(projectStates(p))].forEach(s=>counts[s]=(counts[s]||0)+1));
 let minX=180,maxX=-180,minY=90,maxY=-90;MAP_DATA.features.forEach(f=>walkCoords(f.geometry.coordinates,c=>{minX=Math.min(minX,c[0]);maxX=Math.max(maxX,c[0]);minY=Math.min(minY,c[1]);maxY=Math.max(maxY,c[1])}));
 const W=800,H=720,pad=28,project=c=>[pad+(c[0]-minX)/(maxX-minX)*(W-pad*2),pad+(maxY-c[1])/(maxY-minY)*(H-pad*2)];
 function polyPath(poly){return poly.map(r=>r.map((c,i)=>{const q=project(c);return(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join('')+'Z').join('')}
 function path(f){return f.geometry.type==='Polygon'?polyPath(f.geometry.coordinates):f.geometry.coordinates.map(polyPath).join('')}
 const max=Math.max(...Object.values(counts),1),color=n=>{if(!n)return'#e6ece9';const t=.2+.8*n/max;const a=[231,243,237],b=[31,122,89];return'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')+')'};
 const shapes=MAP_DATA.features.map((f,n)=>{const name=f.properties.name,c=counts[name]||0;return'<path class="stateShape" tabindex="0" data-n="'+n+'" d="'+path(f)+'" fill="'+color(c)+'" aria-label="'+name+': '+c+' projetos"></path>'}).join('');
 const labels=MAP_DATA.features.map(f=>{let ax=Infinity,bx=-Infinity,ay=Infinity,by=-Infinity;walkCoords(f.geometry.coordinates,c=>{ax=Math.min(ax,c[0]);bx=Math.max(bx,c[0]);ay=Math.min(ay,c[1]);by=Math.max(by,c[1])});const q=project([(ax+bx)/2,(ay+by)/2]);return'<text class="stateLabel" x="'+q[0]+'" y="'+q[1]+'">'+f.properties['postal-code']+'</text>'}).join('');
 $('brazilMap').innerHTML='<div class="mapTooltip" id="mapTooltip"></div><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Mapa do Brasil com número de projetos ARR por estado">'+shapes+labels+'</svg>';
 const tip=$('mapTooltip');$('brazilMap').querySelectorAll('.stateShape').forEach(el=>{const f=MAP_DATA.features[+el.dataset.n],name=f.properties.name,c=counts[name]||0;const show=e=>{tip.style.display='block';tip.textContent=name+': '+c+' projeto'+(c===1?'':'s');const r=$('brazilMap').getBoundingClientRect();tip.style.left=Math.min(e.clientX-r.left+12,r.width-180)+'px';tip.style.top=(e.clientY-r.top+12)+'px'};el.onmousemove=show;el.onmouseleave=()=>tip.style.display='none';el.onclick=()=>applyDrill(name,p=>projectStates(p).includes(name));el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}}});
 $('mapLegend').innerHTML='<span>0</span><i style="background:#e6ece9"></i><i style="background:#b9dacb"></i><i style="background:#6eaa90"></i><i style="background:#1f7a59"></i><span>'+max+' projetos</span>';
}
window.updateMap=rows=>renderMap(rows);
fetch('brazil-states.geo.json?v=8').then(r=>r.json()).then(data=>{MAP_DATA=data;renderMap(MAP_ROWS)}).catch(()=>$('brazilMap').innerHTML='<p>Não foi possível carregar a malha estadual.</p>');
