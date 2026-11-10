'use strict';
const $=id=>document.getElementById(id), P=AlphaPhysics;
let result=null,mode='b',units={energyUnit:'MeV',distanceUnit:'fm',angleUnit:'deg'};
const symbols='H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
function fmt(n){if(n===0)return '0';return Math.abs(n)>=1e6||Math.abs(n)<.001?n.toExponential(5):new Intl.NumberFormat('es-CO',{maximumSignificantDigits:6}).format(n);}
function raw(n){return String(Number(n.toPrecision(15)));}
function setupMode(){
  $('distanceUnit').hidden=mode!=='b';$('angleUnit').hidden=mode!=='theta';
  $('valueLabel').textContent=mode==='b'?'Parámetro de impacto b':'Ángulo de dispersión θ';
  $('value-help').textContent=mode==='b'?'Distancia perpendicular entre el núcleo y la línea de entrada sin desvío.':'Cambio de dirección entre la entrada y la salida: mayor que 0 y hasta 180° (π rad).';
  $('dependentLabel').textContent=mode==='b'?'ÁNGULO DE DISPERSIÓN':'PARÁMETRO DE IMPACTO';$('dependentUnit').textContent=mode==='b'?'°':'fm';
}
function update(){
  try{
    result=P.calculate({energy:$('energy').value,energyUnit:$('energyUnit').value,z:$('z').value,mode,value:$('value').value,distanceUnit:$('distanceUnit').value,angleUnit:$('angleUnit').value});
    const r=result;
    $('error').hidden=true;$('plotEmpty').hidden=true;$('plot').hidden=false;$('status').textContent='● En tiempo real';
    $('element').textContent=symbols[r.Z-1]+(r.Z===79?' · Oro':' · Z = '+r.Z);
    $('dependent').textContent=fmt(mode==='b'?r.theta*180/Math.PI:r.b);
    $('dependentAlt').textContent=mode==='b'?fmt(r.theta)+' rad':fmt(r.b*1e-15)+' m';
    $('rmin').textContent=fmt(r.rmin);$('rminAlt').textContent=fmt(r.rmin*1e-15)+' m';
    $('sigma').textContent=fmt(r.sigma/100);$('sigmaAlt').textContent=fmt(r.sigma*1e-30)+' m²/sr · '+fmt(r.sigma)+' fm²/sr';
    const warnings=[];
    if(r.Z<=20)warnings.push('Blanco ligero: el retroceso puede ser importante. Este cálculo mantiene el núcleo fijo.');
    if(r.K>=37)warnings.push('Energía elevada: revisa la aproximación no relativista (K es al menos el 1 % de la energía de reposo de α).');
    if(r.theta<Math.PI/180)warnings.push('Ángulo menor que 1°: la divergencia ideal y el apantallamiento electrónico pueden limitar la interpretación.');
    $('warning').hidden=!warnings.length;$('warning').textContent=warnings.join(' ');
    draw(r);
  }catch(e){result=null;$('error').textContent=e.message;$('error').hidden=false;$('warning').hidden=true;$('plot').hidden=true;$('plotEmpty').hidden=false;$('status').textContent='Revisa los datos';$('element').textContent='Z: 1–118';for(const id of ['dependent','dependentAlt','rmin','rminAlt','sigma','sigmaAlt'])$(id).textContent='—';$('plotNote').textContent='La gráfica se actualizará al corregir los datos.';}
}
function draw(r){
  const svg=$('plot'),ns='http://www.w3.org/2000/svg';svg.replaceChildren();
  const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs||{}))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;svg.appendChild(el);return el;};
  add('title',{id:'plotTitle'},'Trayectoria de Rutherford');add('desc',{id:'plotDesc'},'Ángulo '+fmt(r.theta*180/Math.PI)+' grados; distancia mínima '+fmt(r.rmin)+' femtómetros. El núcleo es simbólico.');
  const pts=P.trajectory(r),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),minX=Math.min(-.7,...xs),maxX=Math.max(1.3,...xs),minY=Math.min(-1,...ys),maxY=Math.max(1.5,...ys);
  const scale=Math.min(630/(maxX-minX),280/(maxY-minY)),ox=380-(minX+maxX)/2*scale,oy=185+(minY+maxY)/2*scale;
  const xy=p=>({x:ox+p.x*scale,y:oy-p.y*scale});
  const line=(a,b,attrs={})=>{a=xy(a);b=xy(b);return add('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#dce4dd','stroke-width':1,...attrs});};
  const tick=Math.pow(10,Math.floor(Math.log10((maxX-minX)/5))),step=(maxX-minX)/tick>12?tick*2:tick;
  for(let x=Math.ceil(minX/step)*step;x<=maxX;x+=step){line({x,y:minY},{x,y:maxY},{stroke:'#edf1ec'});const p=xy({x,y:minY});add('text',{x:p.x,y:355,'text-anchor':'middle',fill:'#819087','font-size':10},fmt(x*r.rmin));}
  line({x:minX,y:0},{x:maxX,y:0});
  for(let y=Math.ceil(minY/step)*step;y<=maxY;y+=step){line({x:minX,y},{x:maxX,y},{stroke:'#edf1ec'});const p=xy({x:minX,y});add('text',{x:Math.max(9,p.x-10),y:p.y+3,'text-anchor':'end',fill:'#819087','font-size':10},fmt(y*r.rmin));}
  add('text',{x:735,y:375,'text-anchor':'end',fill:'#63736c','font-size':11},'x (fm)');add('text',{x:25,y:22,fill:'#63736c','font-size':11},'y (fm)');
  const bnorm=r.b/r.rmin,ct=Math.cos(r.theta),st=Math.sin(r.theta),v={x:ct,y:st},n={x:-st,y:ct};
  line({x:minX,y:bnorm},{x:maxX,y:bnorm},{stroke:'#a3b3a9','stroke-dasharray':'5 5'});
  const extent=Math.max(maxX-minX,maxY-minY);
  const out0={x:-bnorm*n.x,y:-bnorm*n.y};
  const defs=add('defs',{}),clip=document.createElementNS(ns,'clipPath');clip.id='clip';const rect=document.createElementNS(ns,'rect');rect.setAttribute('x','40');rect.setAttribute('y','25');rect.setAttribute('width','680');rect.setAttribute('height','310');clip.appendChild(rect);defs.appendChild(clip);
  line({x:out0.x-v.x*extent,y:out0.y-v.y*extent},{x:out0.x+v.x*extent,y:out0.y+v.y*extent},{stroke:'#a3b3a9','stroke-dasharray':'5 5','clip-path':'url(#clip)'});
  const path=points=>points.map((p,i)=>{p=xy(p);return(i?'L':'M')+p.x.toFixed(3)+','+p.y.toFixed(3)}).join(' ');
  const mid=200;
  add('path',{d:path(pts.slice(0,mid+1)),fill:'none',stroke:'#126d5c','stroke-width':2.8});add('path',{d:path(pts.slice(mid)),fill:'none',stroke:r.b===0?'#c59d4f':'#126d5c','stroke-width':r.b===0?1.6:2.8,'stroke-dasharray':r.b===0?'7 5':'none'});
  for(const i of [65,335]){const a=xy(pts[i-3]),b=xy(pts[i+3]),p=xy(pts[i]),ang=Math.atan2(b.y-a.y,b.x-a.x);add('path',{d:'M-8,-4 L0,0 L-8,4',fill:'none',stroke:'#126d5c','stroke-width':2.5,transform:`translate(${p.x} ${p.y}) rotate(${ang*180/Math.PI})`});}
  const near=pts[mid],pn=xy(near);line({x:0,y:0},near,{stroke:'#c59d4f','stroke-width':1.5,'stroke-dasharray':'3 3'});
  add('circle',{cx:pn.x,cy:pn.y,r:4,fill:'#126d5c',stroke:'white','stroke-width':2});add('text',{x:pn.x+10,y:pn.y-11,fill:'#126d5c','font-size':12},'r min');
  add('circle',{cx:ox,cy:oy,r:14,fill:'#c59d4f',opacity:.12});add('circle',{cx:ox,cy:oy,r:6,fill:'#c59d4f'});add('text',{x:ox+13,y:oy+19,fill:'#8f702f','font-size':12},symbols[r.Z-1]+' · +'+r.Z+'e');
  add('text',{x:745,y:22,'text-anchor':'end',fill:'#126d5c','font-size':13},'θ = '+fmt(r.theta*180/Math.PI)+'°');
  $('plotNote').textContent=(r.b===0?'Choque frontal: entrada y retorno se superponen. ':'')+'Escala automática en fm · Núcleo simbólico · Flechas de dirección';
}
$('form').addEventListener('submit',e=>e.preventDefault());
for(const id of ['energy','z','value'])$(id).addEventListener('input',update);
for(const id of ['energyUnit','distanceUnit','angleUnit'])$(id).addEventListener('change',()=>{
  const old=units[id],next=$(id).value,target=id==='energyUnit'?'energy':'value';
  try{let n=P.number($(target).value,'Valor');if(id==='energyUnit')n*=next==='J'?P.MEV_J:1/P.MEV_J;else if(id==='distanceUnit')n*=next==='m'?1e-15:1e15;else n*=next==='rad'?Math.PI/180:180/Math.PI;$(target).value=raw(n);}catch{}
  units[id]=next;update();
});
document.querySelectorAll('[name=mode]').forEach(el=>el.addEventListener('change',()=>{const r=result;mode=el.value;setupMode();if(r)$('value').value=raw(mode==='b'?r.b*($('distanceUnit').value==='m'?1e-15:1):r.theta*($('angleUnit').value==='deg'?180/Math.PI:1));else $('value').value=mode==='b'?'25':'90';update();}));
function example(name){$('energy').value='5';$('energyUnit').value='MeV';$('z').value='79';$('distanceUnit').value='fm';$('angleUnit').value='deg';units={energyUnit:'MeV',distanceUnit:'fm',angleUnit:'deg'};mode=name==='right'?'theta':'b';document.querySelector('[name=mode][value='+mode+']').checked=true;$('value').value=name==='right'?'90':name==='frontal'?'0':'25';setupMode();update();}
document.querySelectorAll('[data-example]').forEach(el=>el.addEventListener('click',()=>example(el.dataset.example)));$('reset').addEventListener('click',()=>example('gold'));setupMode();update();
