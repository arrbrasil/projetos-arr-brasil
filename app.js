const $=x=>document.getElementById(x),fmt=n=>new Intl.NumberFormat('pt-BR').format(n),compact=n=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(n);
let page=1,filtered=[];const fields=['registry','status','category','method'];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function options(id,key){$(id).innerHTML='<option>Todos</option>'+[...new Set(PROJECTS.map(x=>x[key]).filter(Boolean))].sort().map(x=>'<option>'+esc(x)+'</option>').join('')}
function count(key,n=10){const o={};filtered.forEach(x=>{const k=x[key]||'Não informado';o[k]=(o[k]||0)+1});return Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n)}
function grouped(){const o={};filtered.forEach(x=>{const s=(x.status||'').toLowerCase();let g='Outras situações';if(s==='registered'||s.includes('certified project')||s.includes('certificates issued'))g='Registrado, certificado ou emitido';else if(s.includes('withdraw')||s.includes('reject')||s.includes('inactive')||s.includes('on hold')||s.includes('denied'))g='Interrompido ou não aprovado';else if(s.includes('validation')||s.includes('approval requested')||s.includes('registration requested')||s.includes('certified design'))g='Em validação ou aprovação';else if(s.includes('pipeline')||s==='listed')g='Em desenvolvimento';o[g]=(o[g]||0)+1});return Object.entries(o).sort((a,b)=>b[1]-a[1])}
function bars(id,data,color='#1f7a59'){const max=Math.max(...data.map(x=>x[1]),1);$(id).innerHTML=data.map(x=>'<div class="bar"><div class="barMeta"><span title="'+esc(x[0])+'">'+esc(x[0])+'</span><b>'+fmt(x[1])+'</b></div><div class="track"><i style="width:'+(x[1]/max*100)+'%;background:'+color+'"></i></div></div>').join('')||'<p class="empty">Nenhum dado no recorte.</p>'}
function quality(id,items){$(id).innerHTML='<div class="qualityGrid">'+items.map(x=>'<article><strong>'+fmt(x[1])+'</strong><span>'+esc(x[0])+'</span><small>'+Math.round(x[1]/Math.max(filtered.length,1)*100)+'% do recorte</small></article>').join('')+'</div>'}
function render(){
 const q=$('q').value.toLowerCase().trim();
 filtered=PROJECTS.filter(x=>fields.every(k=>$(k).value==='Todos'||x[k]===$(k).value)&&(!q||[x.id,x.name,x.developer,x.state].some(v=>(v||'').toLowerCase().includes(q))));
 const pages=Math.max(1,Math.ceil(filtered.length/15));page=Math.min(page,pages);
 $('total').textContent=fmt(filtered.length);
 const cert=filtered.filter(x=>x.status==='Registered'||x.status==='Gold Standard Certified Project'||x.status==='Certificates issued').length;
 $('certified').textContent=fmt(cert);$('certifiedPct').textContent=filtered.length?Math.round(cert/filtered.length*100)+'% do recorte':'—';
 const v=filtered.filter(x=>x.registry==='Verra').length,g=filtered.filter(x=>x.registry==='Gold Standard').length,i=filtered.filter(x=>x.registry==='Isometric').length;
 $('split').textContent=v+' / '+g+' / '+i;
 $('credits').textContent=compact(filtered.reduce((a,x)=>a+(Number(x.credits)||0),0))+' tCO₂e';
 bars('registries',count('registry'),'#1f7a59');bars('groupedStatuses',grouped(),'#d29a45');bars('statuses',count('status',8),'#d29a45');
 bars('categories',count('category',10),'#397f68');bars('methods',count('method',10),'#8d6d38');bars('developers',count('developer',10),'#55766b');
 bars('states',count('state',12),'#1f7a59');
 const stateOk=filtered.filter(x=>x.state&&x.state!=='Não informado').length,methodOk=filtered.filter(x=>x.method).length,creditOk=filtered.filter(x=>Number(x.credits)>0).length,developerOk=filtered.filter(x=>x.developer).length;
 quality('quality',[['Com estado informado',stateOk],['Com metodologia',methodOk],['Com estimativa anual',creditOk],['Com desenvolvedor',developerOk]]);
 quality('locationQuality',[['Com estado informado',stateOk],['Sem estado informado',filtered.length-stateOk]]);
 $('results').textContent=fmt(filtered.length)+' resultados';
 $('body').innerHTML=filtered.slice((page-1)*15,page*15).map((x,n)=>'<tr data-i="'+((page-1)*15+n)+'"><td class="id">'+esc(x.id)+'<small>'+esc(x.registry)+'</small></td><td><strong>'+esc(x.name||'Nome não informado')+'</strong><small>'+esc(x.developer||'Desenvolvedor não informado')+'</small></td><td>'+esc(x.state||'Não informado')+'</td><td><span class="tag">'+esc(x.category)+'</span></td><td>'+esc(x.method||'—')+'</td><td><span class="status '+((x.status==='Registered'||x.status==='Gold Standard Certified Project'||x.status==='Certificates issued')?'ok':'')+'">'+esc(x.status)+'</span></td></tr>').join('');
 $('page').textContent='Página '+page+' de '+pages;$('prev').disabled=page===1;$('next').disabled=page===pages;
 document.querySelectorAll('tbody tr').forEach(tr=>tr.onclick=()=>detail(filtered[+tr.dataset.i]));
}
function detail(x){$('detailTag').textContent=x.registry+' · PROJETO '+x.id;$('detailTitle').textContent=x.name||'Nome não informado';$('detailGrid').className='detailGrid';$('detailGrid').innerHTML=[['Situação',x.status],['Estado',x.state],['Desenvolvedor',x.developer],['Atividade',x.category],['Metodologia',x.method],['Créditos anuais estimados',x.credits],['Certificados emitidos',x.issued],['Remoções projetadas',x.projected],['Área elegível',x.area]].filter(x=>x[1]).map(x=>'<div><span>'+x[0]+'</span><p>'+esc(x[1])+'</p></div>').join('');$('detailLink').href=x.url;$('detail').showModal()}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button,.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active')});
options('registry','registry');options('status','status');options('category','category');options('method','method');
[...fields,'q'].forEach(id=>$(id).oninput=()=>{page=1;render()});
$('clear').onclick=()=>{fields.forEach(x=>$(x).value='Todos');$('q').value='';page=1;render()};
$('prev').onclick=()=>{page--;render()};$('next').onclick=()=>{page++;render()};document.querySelector('.x').onclick=()=>$('detail').close();render();
