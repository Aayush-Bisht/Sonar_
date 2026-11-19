const API = 'http://localhost:4000/api';
const token = localStorage.getItem('sonar_token');
const gpsWatchers = {};
const gpsLastSent = {};
async function request(path, options={}) {
  const response = await fetch(API + path, { ...options, headers: { 'Content-Type':'application/json', Authorization:'Bearer '+token, ...(options.headers||{}) } });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}
function esc(value='') { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
async function load() {
  if (!token) { location.href='index.html#/login'; return; }
  try {
    const me = await request('/auth/me');
    if (me.user.role !== 'admin') throw new Error('This account is not an administrator.');
    const [summary,buses,routes,students] = await Promise.all([request('/admin/summary'),request('/buses'),request('/routes'),request('/admin/students')]);
    studentCount.textContent=summary.students; busCount.textContent=summary.buses; routeCount.textContent=summary.routes;
    busRows.innerHTML=buses.buses.map(b=>`<tr><td>${esc(b.busNumber)}</td><td>${esc(b.plate)}</td><td>${esc(b.driver)}</td><td>${esc(b.routeId)}</td><td>${esc(b.status)}</td><td>${b.lastUpdated ? esc(new Date(b.lastUpdated).toLocaleString()) : 'No GPS fix'}</td><td><button class="btn btn-outline" data-gps="${b._id}">${gpsWatchers[b._id] ? 'Stop GPS sharing' : 'Start GPS sharing'}</button> <button class="btn btn-outline" data-status="${b._id}">Toggle status</button> <button class="btn btn-danger" data-delete="${b._id}">Delete</button></td></tr>`).join('') || '<tr><td colspan="7">No buses added yet.</td></tr>';
    routeRows.innerHTML=routes.routes.map(r=>`<tr><td>${esc(r.routeId)}</td><td>${esc(r.name)}</td><td>${esc((r.stops||[]).map(s=>s.name).join(' → '))}</td><td><button class="btn btn-danger" data-route-delete="${r._id}">Delete</button></td></tr>`).join('') || '<tr><td colspan="4">No routes added yet.</td></tr>';
    studentRows.innerHTML=students.students.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${esc(s.roll)}</td><td>${esc(s.routeId)}</td><td>${esc(s.stop)}</td></tr>`).join('') || '<tr><td colspan="5">No students registered yet.</td></tr>';
    status.textContent='Connected • Signed in as '+me.user.email;
  } catch(e) { status.textContent=e.message; }
}
routeForm.addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(routeForm));data.stops=data.stops.split(',').map((name,i)=>({name:name.trim(),sequence:i+1,etaMinutes:i*8})).filter(s=>s.name);try{await request('/routes',{method:'POST',body:JSON.stringify(data)});routeForm.reset();await load();}catch(e){alert(e.message);}});
routeRows.addEventListener('click',async e=>{const id=e.target.dataset.routeDelete;if(!id)return;if(!confirm('Delete this route?'))return;try{await request('/routes/'+id,{method:'DELETE'});await load();}catch(err){alert(err.message);}});
busForm.addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(busForm));data.capacity=Number(data.capacity||50);try{await request('/buses',{method:'POST',body:JSON.stringify(data)});busForm.reset();await load();}catch(e){alert(e.message);}});
busRows.addEventListener('click',async e=>{const gpsId=e.target.dataset.gps;if(gpsId){if(!navigator.geolocation){alert('Geolocation is not supported by this browser.');return;}if(gpsWatchers[gpsId] !== undefined){navigator.geolocation.clearWatch(gpsWatchers[gpsId]);delete gpsWatchers[gpsId];delete gpsLastSent[gpsId];e.target.textContent='Start GPS sharing';status.textContent='GPS sharing stopped for '+gpsId;return;}e.target.disabled=true;e.target.textContent='Starting…';gpsWatchers[gpsId]=null;gpsLastSent[gpsId]=0;const watchId=navigator.geolocation.watchPosition(async position=>{const now=Date.now();if(now-gpsLastSent[gpsId]<5000)return;gpsLastSent[gpsId]=now;try{const result=await request('/buses/'+gpsId+'/location',{method:'POST',body:JSON.stringify({latitude:position.coords.latitude,longitude:position.coords.longitude})});status.textContent='GPS sharing active for '+result.bus.busNumber+' · '+result.bus.latitude.toFixed(5)+', '+result.bus.longitude.toFixed(5);const row=e.target.closest('tr');if(row)row.children[5].textContent=new Date(result.bus.lastUpdated).toLocaleString();}catch(err){status.textContent='GPS update failed: '+err.message;}},err=>{alert('Could not read device location: '+err.message+'. Allow location permission and use localhost or HTTPS.');if(gpsWatchers[gpsId]!==undefined)delete gpsWatchers[gpsId];e.target.textContent='Start GPS sharing';e.target.disabled=false;},{enableHighAccuracy:true,maximumAge:3000,timeout:20000});gpsWatchers[gpsId]=watchId;e.target.textContent='Stop GPS sharing';e.target.disabled=false;status.textContent='GPS sharing active for '+gpsId+' · keep this page open';return;}const id=e.target.dataset.delete||e.target.dataset.status;if(!id)return;try{if(e.target.dataset.delete){if(!confirm('Delete this bus?'))return;await request('/buses/'+id,{method:'DELETE'});}else{const row=e.target.closest('tr');const current=row.children[4].textContent;await request('/buses/'+id,{method:'PATCH',body:JSON.stringify({status:current==='Active'?'Delayed':'Active'})});}await load();}catch(err){alert(err.message);}});
logoutBtn.addEventListener('click',()=>{localStorage.removeItem('sonar_token');localStorage.removeItem('ct_session');location.href='index.html#/login';});
load();
