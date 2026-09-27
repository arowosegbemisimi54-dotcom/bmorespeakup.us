/* Community experience additions. Database permissions live in supabase-setup.sql. */
const progressLabels = { submitted: 'Submitted', under_review: 'Under review', referred: 'Referred', resolved: 'Resolved' };
const markerLookup = new Map();
let mapRenderTimer, liveLoadPromise, liveReloadRequested = false;
let editPinId = null, accountPins = [], detailPinId = null, detailsRequest = 0;
let chartLoadPromise, searchInFlight = false, lastSearchTime = 0;
const searchCache = new Map();
let searchResults = [], placeIndex = [];
let cityDataPromise, liveDataLoaded=false;

async function ensureCityData() {
    if (cityDataPromise) return cityDataPromise;
    cityDataPromise = new Promise((resolve, reject) => {
        const script=document.createElement('script'); script.src='./community-data.js';
        script.onload=()=>{
            if (!window.communityData) {cityDataPromise=null;reject(new Error('City dataset is unavailable.'));return;}
            uploadedCommunityData=window.communityData;
            dataMetadata=uploadedCommunityData.metadata||{};
            crimeHotspots=uploadedCommunityData.crimeHotspots||[];
            vacantBuildings=uploadedCommunityData.vacantBuildings||[];
            neighborhoodSummary=uploadedCommunityData.neighborhoodSummary||[];
            staticCommunityProposals=(uploadedCommunityData.proposals||[]).map(p=>({...p,liveDatabase:false}));
            if(!liveDataLoaded)suggestedSafetyBuildings=[...staticCommunityProposals];
            flagsData=[...flagsData.filter(p=>p.liveDatabase),...crimeHotspots.map((zone,index)=>({
                id:zone.id,lat:zone.lat,lng:zone.lng,neighborhood:zone.name,category:'safety',subtype:'Uploaded NIBRS Crime Concentration',
                severity:index<5?'Critical':index<10?'High':'Medium',status:'Partial Dataset',source:zone.source,
                description:`${zone.recentCount.toLocaleString()} records in the recent comparison period; ${zone.previousCount.toLocaleString()} in the prior period.`,
                date:dataMetadata.comparisonPeriods?.recent?.[1]||'',isHotspot:true,upvotes:0
            })),...vacantBuildings.map(building=>({...building,category:'vacant',subtype:'Open Vacant Building Notice',
                severity:Number(building.noticeDate?.slice(0,4))<=2016?'Critical':Number(building.noticeDate?.slice(0,4))<=2021?'High':'Medium',status:'Open Notice',source:'Uploaded Vacant Building Notice dataset',
                description:`${building.address} — Block/Lot ${building.blockLot}; market typology ${building.marketTypology}; Council District ${building.councilDistrict}.`,date:building.noticeDate,ccNumber:building.noticeNumber,upvotes:0
            }))];
            buildPlaceIndex();refreshCommunityViews();resolve();
        };
        script.onerror=()=>{script.remove();cityDataPromise=null;showToast('City data could not load. Community reports are still available.','info');reject(new Error('City dataset could not load.'));};
        document.head.appendChild(script);
    });
    return cityDataPromise;
}

function renderAllMarkers() {
    clearTimeout(mapRenderTimer);
    mapRenderTimer = setTimeout(() => { if (map && clusterGroup) renderMarkersNow(); }, 100);
}

async function loadLiveCommunityPins() {
    if (liveLoadPromise) { liveReloadRequested = true; return liveLoadPromise; }
    liveLoadPromise = (async () => {
        do {
            liveReloadRequested = false;
            const rows = [];
            for (let offset = 0; ; offset += 500) {
                const { data, error } = await supabaseClient.from('community_pins').select('*')
                    .eq('status','published').order('created_at',{ascending:false}).order('id')
                    .range(offset, offset + 499);
                if (error) throw error;
                rows.push(...data);
                if (data.length < 500) break;
            }
            const pins = rows.map(mapDatabasePin);
            liveDataLoaded=true;
            flagsData = flagsData.filter(p => !p.liveDatabase);
            flagsData.push(...pins.filter(p => !['crime_building','community_upgrade','shelter_proposal'].includes(p.category)));
            suggestedSafetyBuildings = pins.filter(p => ['crime_building','community_upgrade'].includes(p.category));
            suggestedShelters = pins.filter(p => p.category === 'shelter_proposal');
            refreshCommunityViews();
        } while (liveReloadRequested);
    })();
    try { await liveLoadPromise; } finally { liveLoadPromise = null; }
}

function canManagePin(item) {
    return Boolean(currentUser && item?.liveDatabase &&
        (currentProfile?.role === 'admin' || item.createdBy === currentUser.id));
}
function getManagedItem(id) { return findMapItemById(id) || accountPins.find(p => p.id === id); }
function safePinId(id) { return escapeHtml(encodeURIComponent(String(id)).replaceAll("'",'%27')); }
function getPinActions(item) {
    if (!item.liveDatabase) return '';
    const id = safePinId(item.id);
    return `<div class="pin-actions"><button onclick="openReportDetails('${id}')">Progress & share</button>${canManagePin(item) ?
        `<button onclick="editCommunityPin('${id}')">Edit</button><button class="danger" onclick="deleteCommunityPin('${id}')">Delete</button>` : ''}</div>`;
}

function toggleLayers(force) {
    const panel = document.getElementById('mapControls');
    const open = typeof force === 'boolean' ? force : panel.hidden;
    panel.hidden = !open;
    document.getElementById('layersButton').setAttribute('aria-expanded', String(open));
}
function setBasemap(type) {
    if (!map) return;
    const satellite = type === 'satellite';
    map.removeLayer(satellite ? map.streetTile : map.satelliteTile);
    (satellite ? map.satelliteTile : map.streetTile).addTo(map);
    document.getElementById('layerSatellite').setAttribute('aria-pressed',String(satellite));
    document.getElementById('layerStreet').setAttribute('aria-pressed',String(!satellite));
}
function selectMobile(name) {
    document.querySelectorAll('[data-mobile]').forEach(button => {
        if (button.dataset.mobile === name) button.setAttribute('aria-current','page');
        else button.removeAttribute('aria-current');
    });
}
function showMap() {
    toggleLayers(false);
    document.getElementById('sidebarDrawer').classList.add('translate-x-full');
    if (currentMapView !== 'civic') switchMapView('civic');
    selectMobile('map');
    document.getElementById('map').scrollIntoView({block:'start',behavior:'smooth'});
}
function startReport() {
    if (!currentUser) { openAuthModal(); showToast('Sign in to submit a report.','info'); return; }
    showMap();
    if (!isAddMode) toggleAddFlagMode();
    selectMobile('report');
}
function showProjects() {
    toggleLayers(false);
    switchMapView('community');
    selectMobile('projects');
    if (matchMedia('(max-width: 1023px)').matches) document.getElementById('communityDecisionPanel').scrollIntoView({block:'start',behavior:'smooth'});
}

function buildPlaceIndex() {
    const groups = new Map();
    for (const pin of [...flagsData,...allCommunityProposals()]) {
        if (!pin.neighborhood || !Number.isFinite(Number(pin.lat)) || !Number.isFinite(Number(pin.lng))) continue;
        const key = pin.neighborhood.toLowerCase();
        if (!groups.has(key)) groups.set(key,{label:pin.neighborhood,lat:0,lng:0,count:0});
        const item = groups.get(key); item.lat += Number(pin.lat); item.lng += Number(pin.lng); item.count++;
    }
    placeIndex = [...groups.values()].map(p => ({label:p.label,lat:p.lat/p.count,lng:p.lng/p.count,zoom:14}));
    const select = document.getElementById('formNeighborhood');
    for (const place of placeIndex.sort((a,b)=>a.label.localeCompare(b.label))) {
        if (![...select.options].some(o=>o.value===place.label)) select.add(new Option(place.label,place.label));
    }
}
async function searchLocation(event) {
    event.preventDefault();
    const query = document.getElementById('locationQuery').value.trim();
    if (!query || searchInFlight) return;
    const message = document.getElementById('searchMessage');
    const button = document.getElementById('locationSearchButton');
    document.getElementById('locationResults').replaceChildren();
    const normalized = query.toLowerCase();
    let results = placeIndex.filter(p=>p.label.toLowerCase().includes(normalized)).slice(0,6);
    if (!results.length) results = flagsData.filter(p=>p.address?.toLowerCase().includes(normalized)).slice(0,6).map(p=>({label:p.address+', '+p.neighborhood,lat:p.lat,lng:p.lng,zoom:17}));
    searchInFlight = true; button.disabled = true; message.textContent = 'Finding your location…';
    try {
        if (!results.length) {
            if (searchCache.has(normalized)) results = searchCache.get(normalized);
            else {
                if (Date.now()-lastSearchTime < 1200) throw new Error('Please wait a moment before searching again.');
                lastSearchTime=Date.now();
                const params = new URLSearchParams({q:query+', Baltimore, Maryland',format:'jsonv2',limit:'5',countrycodes:'us',viewbox:'-76.75,39.38,-76.50,39.19',bounded:'1'});
                const controller = new AbortController();
                const timeout = setTimeout(()=>controller.abort(),10000);
                try {
                    const response = await fetch('https://nominatim.openstreetmap.org/search?'+params,{signal:controller.signal});
                    if (!response.ok) throw new Error('Address search is unavailable. Try a neighborhood or choose a point on the map.');
                    results = (await response.json()).map(p=>({label:p.display_name,lat:Number(p.lat),lng:Number(p.lon),zoom:16}));
                    searchCache.set(normalized,results);
                } finally { clearTimeout(timeout); }
            }
        }
        searchResults = results;
        message.textContent = results.length ? 'Choose a location:' : 'No match in Baltimore. Try a street address or neighborhood.';
        const container = document.getElementById('locationResults');
        results.forEach((result,index)=> {
            const choice = document.createElement('button'); choice.type='button'; choice.textContent=result.label;
            choice.addEventListener('click',()=>focusSearchResult(index)); container.appendChild(choice);
        });
    } catch(error) { message.textContent=error.name==='AbortError'?'Search timed out. Try a neighborhood or choose the location on the map.':error.message; }
    finally { searchInFlight=false; button.disabled=false; }
}
function focusSearchResult(index) {
    const result=searchResults[index]; if(!result) return;
    map.flyTo([result.lat,result.lng],result.zoom);
    document.getElementById('locationResults').replaceChildren();
    document.getElementById('searchMessage').textContent='Showing '+result.label;
    if (matchMedia('(max-width: 1023px)').matches) document.getElementById('map').scrollIntoView({block:'start',behavior:'smooth'});
}
function useMyLocation() {
    const message=document.getElementById('searchMessage');
    if(!navigator.geolocation) { message.textContent='Location is unavailable. Search an address instead.'; return; }
    message.textContent='Waiting for location permission…';
    navigator.geolocation.getCurrentPosition(position=>{
        const {latitude,longitude}=position.coords;
        if(latitude<39.19||latitude>39.38||longitude< -76.75||longitude> -76.50) { message.textContent='You appear to be outside Baltimore. Search a Baltimore address instead.';return; }
        map.flyTo([latitude,longitude],16); message.textContent='Map centered near your location. Your location was not saved.';
    },()=>{message.textContent='Could not access your location. Search an address instead.';},{timeout:10000,maximumAge:60000});
}

async function handleFormSubmit(event) {
    event.preventDefault();
    if (!currentUser) { requireLeaderAccount(); return; }
    const button=document.getElementById('formSubmitButton'); if(button.disabled)return;
    const payload={latitude:Number(document.getElementById('formLat').value),longitude:Number(document.getElementById('formLng').value),
        neighborhood:document.getElementById('formNeighborhood').value,category:document.getElementById('formCategory').value,
        subtype:document.getElementById('formSubtype').value,severity:document.getElementById('formSeverity').value,
        description:document.getElementById('formDescription').value.trim(),
        submitter_name:document.getElementById('formSubmitter').value.trim()||currentProfile?.display_name||'Community member',
        source:'Community Submission',status:'published',created_by:currentUser.id};
    if(!Number.isFinite(payload.latitude)||!Number.isFinite(payload.longitude)||!payload.description){showToast('Choose a location and enter a description.','error');return;}
    button.disabled=true;button.textContent='Submitting…';
    try {
        const {data,error}=await supabaseClient.from('community_pins').insert(payload).select('*').single();
        if(error)throw error;
        const created=mapDatabasePin(data); accountPins.unshift(created);
        closeAddModal();
        try { await loadLiveCommunityPins(); } catch { showToast('Saved successfully. The map will refresh when the connection returns.','info'); }
        await openReportDetails(encodeURIComponent(data.id));
        showToast('Submitted. Use this report link to follow its progress.','success');
    } catch(error){showToast('Could not submit: '+error.message,'error');}
    finally{button.disabled=false;button.textContent='Submit Entry';}
}

function editCommunityPin(encodedId) {
    const item=getManagedItem(decodeURIComponent(encodedId));
    if(!canManagePin(item)){showToast('You can edit only your own flags. Administrators can edit any community flag.','error');return;}
    editPinId=item.id;
    for(const [id,value] of Object.entries({editSubtype:item.subtype,editNeighborhood:item.neighborhood,editLatitude:item.lat,editLongitude:item.lng,editCategory:item.category,editSeverity:item.severity,editDescription:item.description,editProgress:item.progressStatus,editOrganization:item.responsibleOrganization,editNote:item.progressNote}))document.getElementById(id).value=value||'';
    document.getElementById('adminProgress').hidden=currentProfile?.role!=='admin';
    document.getElementById('editError').textContent='';
    document.getElementById('editModal').classList.remove('hidden');
    document.getElementById('editSubtype').focus();
}
function closeEdit(){document.getElementById('editModal').classList.add('hidden');editPinId=null;}
async function savePinEdits(event) {
    event.preventDefault();
    const item=getManagedItem(editPinId),button=document.getElementById('saveEditButton');
    if(!canManagePin(item)||button.disabled)return;
    const payload={subtype:document.getElementById('editSubtype').value.trim(),neighborhood:document.getElementById('editNeighborhood').value.trim(),latitude:Number(document.getElementById('editLatitude').value),longitude:Number(document.getElementById('editLongitude').value),category:document.getElementById('editCategory').value,severity:document.getElementById('editSeverity').value,description:document.getElementById('editDescription').value.trim()};
    if(currentProfile?.role==='admin')Object.assign(payload,{progress_status:document.getElementById('editProgress').value,responsible_organization:document.getElementById('editOrganization').value.trim(),progress_note:document.getElementById('editNote').value.trim()});
    button.disabled=true;
    try{
        const {data,error}=await supabaseClient.from('community_pins').update(payload).eq('id',item.id).select('*').single();
        if(error)throw error;
        const saved=mapDatabasePin(data);accountPins=accountPins.filter(p=>p.id!==saved.id);accountPins.unshift(saved);
        closeEdit(); closeDetail();
        try{await loadLiveCommunityPins();}catch{showToast('Changes saved. Refresh the map when your connection returns.','info');}
        showToast('Changes saved.','success');
    }catch(error){document.getElementById('editError').textContent='Could not save: '+error.message;}
    finally{button.disabled=false;}
}
async function deleteCommunityPin(encodedId) {
    const id=decodeURIComponent(encodedId),item=getManagedItem(id);
    if(!canManagePin(item)){showToast('You can delete only your own flags.','error');return;}
    if(!confirm('Delete “'+item.subtype+'”? This permanently removes the flag, its votes and progress history.'))return;
    try{
        const {error}=await supabaseClient.rpc('bmore_delete_pin',{target_id:id});
        if(error)throw error;
        accountPins=accountPins.filter(p=>p.id!==id);flagsData=flagsData.filter(p=>p.id!==id);
        suggestedSafetyBuildings=suggestedSafetyBuildings.filter(p=>p.id!==id);suggestedShelters=suggestedShelters.filter(p=>p.id!==id);
        map.closePopup();closeDetail();refreshCommunityViews();
        showToast('Flag deleted.','success');
    }catch(error){showToast('Could not delete: '+error.message,'error');}
}

function closeDetail(){document.getElementById('detailModal').classList.add('hidden');detailPinId=null;detailsRequest++;}
function showHelp(){
    document.getElementById('detailTitle').textContent='How BMoreSpeakUp works';
    document.getElementById('detailBody').innerHTML='<p>Find your neighborhood, sign in, then report an issue or suggest a project.</p><ol><li><strong>Submitted:</strong> Your flag is visible on this community map.</li><li><strong>Under review:</strong> An administrator is reviewing it.</li><li><strong>Referred:</strong> An administrator has recorded a referral.</li><li><strong>Resolved:</strong> An administrator has marked it resolved.</li></ol><p>Status changes appear only when recorded by an administrator. Submission does not guarantee review or city action and does not create an official city service request.</p><p>Use My Reports to edit or delete your flags. Share a report link so neighbors can follow its progress. Imported city records remain read-only.</p>';
    document.getElementById('detailModal').classList.remove('hidden');
}
async function openReportDetails(encodedId) {
    const id=decodeURIComponent(encodedId),request=++detailsRequest;
    let item=getManagedItem(id);detailPinId=id;
    document.getElementById('detailTitle').textContent='Report progress';
    document.getElementById('detailBody').textContent='Loading report…';
    document.getElementById('detailModal').classList.remove('hidden');
    try {
        if(!item){const {data,error}=await supabaseClient.from('community_pins').select('*').eq('id',id).maybeSingle();if(error)throw error;if(!data)throw new Error('This report is unavailable or has been deleted.');item=mapDatabasePin(data);accountPins.push(item);}
        if(request!==detailsRequest)return;
        const url=new URL(location.href);url.hash='';url.search='';url.searchParams.set('pin',id);
        document.getElementById('detailBody').innerHTML=`<h3>${escapeHtml(item.subtype)}</h3><p>${escapeHtml(item.neighborhood)}</p><p>${escapeHtml(item.description)}</p><p class="status-pill">${escapeHtml(item.status)}</p><p>Last updated: ${escapeHtml(item.updatedAt ? new Date(item.updatedAt).toLocaleString() : item.date)}</p><p>Responsible organization: ${escapeHtml(item.responsibleOrganization||'Not assigned')}</p><p>${escapeHtml(item.progressNote||'No progress note yet.')}</p><p class="muted">Community submission — not an official city service request.</p><label for="shareLink">Share this report</label><input id="shareLink" readonly value="${escapeHtml(url.href)}"><button class="action secondary" onclick="copyReportLink()">Copy link</button>${getPinActions(item)}<h3>Progress history</h3><div id="progressHistory">Loading history…</div>`;
        const {data,error}=await supabaseClient.from('community_pin_history').select('progress_status,note,responsible_organization,created_at').eq('pin_id',id).order('created_at',{ascending:false}).limit(100);
        if(request!==detailsRequest)return;
        document.getElementById('progressHistory').innerHTML=error?'<p>History is unavailable. The database setup may still be required.</p>':data.length?`<ol>${data.map(row=>`<li><strong>${escapeHtml(progressLabels[row.progress_status]||row.progress_status)}</strong> · ${escapeHtml(new Date(row.created_at).toLocaleString())}<p>${escapeHtml(row.note||'')}</p>${row.responsible_organization?`<p>${escapeHtml(row.responsible_organization)}</p>`:''}</li>`).join('')}</ol>`:'<p>No recorded progress changes yet.</p>';
    } catch(error){if(request===detailsRequest)document.getElementById('detailBody').textContent=error.message;}
}
async function copyReportLink(){const input=document.getElementById('shareLink');try{await navigator.clipboard.writeText(input.value);showToast('Report link copied.','success');}catch{input.select();showToast('Select and copy the report link.','info');}}
async function openLinkedReport(){const id=new URL(location.href).searchParams.get('pin');if(id&&/^[0-9a-f-]{36}$/i.test(id))await openReportDetails(encodeURIComponent(id));}
async function openMyReports() {
    if(!currentUser){openAuthModal();return;}
    selectMobile('account');detailPinId=null;
    const request=++detailsRequest;
    document.getElementById('detailTitle').textContent=currentProfile?.role==='admin'?'Manage community flags':'My reports';
    document.getElementById('detailBody').textContent='Loading your reports…';
    document.getElementById('detailModal').classList.remove('hidden');
    try{
        const rows=[];
        for(let offset=0;;offset+=500){
            let query=supabaseClient.from('community_pins').select('*').order('created_at',{ascending:false}).order('id').range(offset,offset+499);
            if(currentProfile?.role!=='admin')query=query.eq('created_by',currentUser.id);
            const {data,error}=await query;if(error)throw error;rows.push(...data);if(data.length<500)break;
        }
        if(request!==detailsRequest)return;accountPins=rows.map(mapDatabasePin);
        document.getElementById('detailBody').innerHTML='<div id="accountReportList"></div><button class="action secondary" onclick="closeDetail();handleAuthButton()">Sign out</button>';
        renderAccountReports();
    }catch(error){if(request===detailsRequest)document.getElementById('detailBody').textContent='Unable to load reports: '+error.message;}
}
function renderAccountReports(){const list=document.getElementById('accountReportList');if(!list)return;list.innerHTML=accountPins.filter(p=>canManagePin(p)).map(p=>`<article class="account-report"><h3>${escapeHtml(p.subtype)}</h3><p>${escapeHtml(p.neighborhood)} · ${escapeHtml(p.status)}</p>${getPinActions(p)}</article>`).join('')||'<p>No reports yet. Use Report to drop your first flag.</p>';}

async function toggleDashboard(){
    const modal=document.getElementById('dashboardModal');modal.classList.toggle('hidden');if(modal.classList.contains('hidden'))return;
    try{
        await ensureCityData();
        if(typeof Chart==='undefined'){
            if(!chartLoadPromise)chartLoadPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js';script.onload=resolve;script.onerror=()=>{script.remove();chartLoadPromise=null;reject(new Error('Unable to load charts. Try again.'));};document.head.appendChild(script);});
            await chartLoadPromise;
        }
        if(!modal.classList.contains('hidden'))updateCharts();
    }catch(error){showToast(error.message,'error');}
}
function initializeEnhancements(){
    setBasemap('street');buildPlaceIndex();map.on('moveend',renderAllMarkers);
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>document.documentElement.style.setProperty('--header-height',entries[0].target.offsetHeight+'px')).observe(document.getElementById('siteHeader'));
    document.getElementById('toastContainer').setAttribute('role','status');
    document.getElementById('toastContainer').setAttribute('aria-live','polite');
    // Associate the existing form labels with their controls.
    document.querySelectorAll('#flagForm label').forEach(label=>{const input=label.parentElement.querySelector('input,select,textarea');if(input?.id)label.htmlFor=input.id;});
    document.addEventListener('keydown',event=>{
        if(event.key==='Escape'){closeEdit();closeDetail();closeAuthModal();closeNoticeModal();toggleLayers(false);if(isAddMode)toggleAddFlagMode();}
        if(event.key==='Tab'){
            const modal=[...document.querySelectorAll('.custom-modal,#authModal,#addFlagModal,#noticeModal,#dashboardModal')].reverse().find(m=>!m.classList.contains('hidden'));
            if(!modal)return;const controls=[...modal.querySelectorAll('button,input,select,textarea,a[href]')].filter(e=>!e.disabled&&e.getClientRects().length);
            if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];
            if(event.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){event.preventDefault();last.focus();}
            else if(!event.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){event.preventDefault();first.focus();}
        }
    });
}
