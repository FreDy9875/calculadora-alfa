(function(root){
  'use strict';
  const E_CHARGE=1.602176634e-19, COULOMB=8.9875517862e9;
  const MEV_J=1e6*E_CHARGE, COUPLING=COULOMB*E_CHARGE*E_CHARGE/MEV_J*1e15;
  function number(value,label){
    const s=String(value).trim().replace(',','.');
    if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) throw Error(label+': escribe un número válido.');
    const n=Number(s); if(!Number.isFinite(n)||(n===0&&/[1-9]/.test(s.split(/e/i)[0]))) throw Error(label+': el valor está fuera del rango numérico.');
    return n;
  }
  function calculate({energy,energyUnit='MeV',z,mode='b',value,distanceUnit='fm',angleUnit='deg'}){
    if(!['MeV','J'].includes(energyUnit)||!['fm','m'].includes(distanceUnit)||!['deg','rad'].includes(angleUnit)||!['b','theta'].includes(mode)) throw Error('Unidad o modo no reconocido.');
    const K=number(energy,'Energía')/(energyUnit==='J'?MEV_J:1), Z=number(z,'Número atómico');
    if(!(K>0)) throw Error('La energía debe ser mayor que cero.');
    if(!Number.isInteger(Z)||Z<1||Z>118) throw Error('Z debe ser un entero entre 1 y 118.');
    const a=COUPLING*Z/K, v=number(value,mode==='b'?'Parámetro de impacto':'Ángulo');
    let b,theta;
    if(mode==='b'){
      if(v<0) throw Error('El parámetro de impacto debe ser mayor o igual que cero.');
      b=v*(distanceUnit==='m'?1e15:1); theta=2*Math.atan2(a,b);
    }else{
      theta=v*(angleUnit==='deg'?Math.PI/180:1);
      if(!(theta>0&&theta<=Math.PI)) throw Error('El ángulo debe estar entre 0 y 180° (π rad), sin incluir 0.');
      b=theta===Math.PI?0:a/Math.tan(theta/2);
    }
    const rho=Math.hypot(a,b), rmin=a+rho, sinHalf=a/rho;
    const logSigma=2*Math.log(a)-Math.log(4)-4*Math.log(sinHalf);
    const sigma=Math.exp(logSigma);
    if(![K,a,b,theta,rmin,sigma].every(Number.isFinite)||a<=0||theta<=0||sigma<=0||rmin*1e-15===0||sigma*1e-30===0||K*MEV_J===0||K*MEV_J===Infinity||(v>0&&mode==='b'&&b===0)) throw Error('Estos valores exceden el rango numérico admitido. Usa valores menos extremos.');
    return {K,Z,a,b,theta,rho,rmin,sigma,energyJ:K*MEV_J};
  }
  // Exact repulsive hyperbola in units of r_min. Both axes use the same scale.
  function trajectory(r,count=401){
    const s=r.a/r.rho,c=r.b/r.rho,lim=Math.acosh(1+6*(r.rmin/r.rho)),points=[];
    for(let i=0;i<count;i++){
      const u=-lim+2*lim*i/(count-1),X=r.rho/r.rmin+r.a/r.rmin*Math.cosh(u),Y=r.b/r.rmin*Math.sinh(u);
      points.push({x:-s*X+c*Y,y:c*X+s*Y});
    }
    return points;
  }
  const api={calculate,trajectory,number,E_CHARGE,COULOMB,MEV_J,COUPLING};
  if(typeof module==='object'&&module.exports) module.exports=api; else root.AlphaPhysics=api;
})(typeof globalThis!=='undefined'?globalThis:this);
