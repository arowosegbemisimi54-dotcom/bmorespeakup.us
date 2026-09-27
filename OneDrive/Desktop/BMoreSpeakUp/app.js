
        let map;
        let clusterGroup;
        let rawMarkerList = [];
        let isAddMode = false;
        let currentMapView = 'civic';
        let categoryChartInstance = null;
        let neighborhoodChartInstance = null;
        let isClusteringEnabled = true;
        const SUPABASE_URL = 'https://ykkakgcwftdgvackiqwn.supabase.co';
        const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_BS5hhwVBVHDeYm1DigIx0w_D1a7qvPi';
        const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
        let currentUser = null;
        let currentProfile = null;
        let communityRealtimeChannel = null;
        let upvotedProposalIds = new Set();
        const pendingVoteIds = new Set();

        // Shared visibility state for the matching header and map-control lists.
        let activeSections = {
            publicSafety: false,
            vacant: false,
            safety: true,
            shelter: true
        };

        function toggleSection(sectionKey) {
            activeSections[sectionKey] = !activeSections[sectionKey];
            const checkboxId = {
                publicSafety: 'toggleCrimeZone',
                vacant: 'toggleVacantBuildings',
                safety: 'toggleBuildings',
                shelter: 'toggleShelterPins'
            }[sectionKey];
            if (checkboxId) document.getElementById(checkboxId).checked = activeSections[sectionKey];
            updateSectionToggleButtons();
            renderAllMarkers();
            renderTabLists();
            updateListAndStats();
            
            const nameMap = {
                publicSafety: 'Public Safety',
                vacant: 'Vacant Buildings',
                safety: 'Suggested Community Buildings',
                shelter: 'Suggested Homeless Shelters'
            };
            const status = activeSections[sectionKey] ? 'visible' : 'hidden';
            showToast(`${nameMap[sectionKey]} is now ${status}`, 'info');
        }

        async function syncLayerToggle(sectionKey, isChecked) {
            if (isChecked && ['publicSafety','vacant'].includes(sectionKey)) {
                try { await ensureCityData(); } catch { return; }
            }
            activeSections[sectionKey] = isChecked;
            updateSectionToggleButtons();
            renderAllMarkers();
            updateListAndStats();
        }

        function formatCompactNumber(value) {
            return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
        }

        function showDataSummary() {
            toggleDashboard();
        }

        function handleAddButton() {
            if (!canPublishPins()) {
                requireLeaderAccount();
                return;
            }
            if (currentMapView === 'community') beginCommunityProposal();
            else toggleAddFlagMode();
        }

        function switchMapView(view) {
            currentMapView = view === 'community' ? 'community' : 'civic';
            const isCommunity = currentMapView === 'community';
            const civicButton = document.getElementById('viewBtnCivic');
            const communityButton = document.getElementById('viewBtnCommunity');
            const communityPanel = document.getElementById('communityDecisionPanel');

            civicButton.className = `px-3 py-2 rounded-md text-xs font-bold flex items-center gap-2 ${isCommunity ? 'text-slate-300 hover:bg-slate-800' : 'bg-amber-500 text-slate-950'}`;
            communityButton.className = `px-3 py-2 rounded-md text-xs font-bold flex items-center gap-2 ${isCommunity ? 'bg-purple-500 text-white' : 'text-slate-300 hover:bg-slate-800'}`;
            civicButton.setAttribute('aria-pressed', String(!isCommunity));
            communityButton.setAttribute('aria-pressed', String(isCommunity));

            communityPanel.classList.toggle('hidden', !isCommunity);
            communityPanel.classList.toggle('flex', isCommunity);
            document.getElementById('conditionLayerControls').classList.toggle('hidden', isCommunity);
            document.getElementById('communityLayerControls').classList.toggle('hidden', !isCommunity);
            document.getElementById('addFlagLabel').textContent = isCommunity ? 'Suggest a Project' : 'Report an Issue';
            document.getElementById('headerSubtitle').textContent = isCommunity
                ? 'Community-led projects, transparent locations and one vote per verified account'
                : 'Report neighborhood issues. Suggest improvements. Support community projects.';

            if (isCommunity) {
                document.getElementById('sidebarDrawer').classList.add('translate-x-full');
                renderCommunityBoard();
            }

            if (isAddMode) toggleAddFlagMode();
            renderAllMarkers();
            window.setTimeout(() => map.invalidateSize(), 0);
        }

        function beginCommunityProposal() {
            if (!canPublishPins()) {
                requireLeaderAccount();
                return;
            }
            if (currentMapView !== 'community') switchMapView('community');
            if (!isAddMode) toggleAddFlagMode();
            showToast('Tap the map to choose your project location.', 'info');
        }

        function updateSectionToggleButtons() {
            const configs = [
                { key: 'publicSafety', checkBtnId: 'checkBtnInfra', iconId: 'checkInfra', activeBg: 'bg-red-500 text-white', inactiveBg: 'bg-slate-800 text-slate-500 border-slate-700' },
                { key: 'vacant', checkBtnId: 'checkBtnVacant', iconId: 'checkVacant', activeBg: 'bg-orange-500 text-slate-950', inactiveBg: 'bg-slate-800 text-slate-500 border-slate-700' },
                { key: 'safety', checkBtnId: 'checkBtnSafety', iconId: 'checkSafety', activeBg: 'bg-purple-500 text-white', inactiveBg: 'bg-slate-800 text-slate-500 border-slate-700' },
                { key: 'shelter', checkBtnId: 'checkBtnShelter', iconId: 'checkShelter', activeBg: 'bg-emerald-500 text-slate-950', inactiveBg: 'bg-slate-800 text-slate-500 border-slate-700' }
            ];

            configs.forEach(cfg => {
                const checkBtn = document.getElementById(cfg.checkBtnId);
                const icon = document.getElementById(cfg.iconId);
                const isActive = activeSections[cfg.key];

                if (checkBtn && icon) {
                    if (isActive) {
                        checkBtn.className = `absolute -top-1.5 -right-1.5 ${cfg.activeBg} rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-black shadow-md border border-slate-900 transition-all scale-100 opacity-100`;
                        icon.className = "fa-solid fa-check";
                    } else {
                        checkBtn.className = `absolute -top-1.5 -right-1.5 ${cfg.inactiveBg} rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-black shadow-md border border-slate-900 transition-all scale-90 opacity-60`;
                        icon.className = "fa-solid fa-xmark";
                    }
                }
            });
        }

        // Custom notification toast replacement for alert()
        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            let icon = 'fa-info-circle';
            let borderCol = 'border-amber-500';
            
            if (type === 'success') { icon = 'fa-check-circle'; borderCol = 'border-emerald-500'; }
            else if (type === 'error') { icon = 'fa-exclamation-triangle'; borderCol = 'border-red-500'; }

            toast.className = `glass-panel ${borderCol} text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-xs font-medium pointer-events-auto transition-all transform duration-300 translate-y-2 opacity-0`;
            toast.innerHTML = `<i class="fa-solid ${icon} text-amber-400 text-base"></i><span>${message}</span>`;
            
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.remove('translate-y-2', 'opacity-0');
            }, 10);

            setTimeout(() => {
                toast.classList.add('opacity-0', 'translate-y-2');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        const subcategories = {
            sidewalk: [
                'Cracked / Broken Pavement',
                'Uneven Walkway / Trip Hazard',
                'Obstruction (Overgrown Trees/Debris)',
                'ADA Accessibility Ramp Barrier',
                'Missing Sidewalk Slab'
            ],
            infrastructure: [
                'Pothole / Roadway Collapse',
                'Broken / Non-functioning Streetlight',
                'Water Main Leak / Standing Water',
                'Missing or Damaged Traffic Sign',
                'Storm Drain Blockage'
            ],
            safety: [
                'NIBRS Crime Incident / Public Safety',
                'Poor Street Lighting Hazard',
                'Illegal Dumping Site',
                'Abandoned Vehicle Hazard',
                'Structural / Vacant Building Danger',
                'Graffiti / Property Vandalism'
            ],
            vacant: [
                'Open Vacant Building Notice',
                'Vacant Property Reuse Candidate',
                'Structural Assessment Requested'
            ],
            crime_building: [
                'Youth Recreation & Community Center',
                'Community Violence Intervention (CVI) Hub',
                'Police Substation & Safety Patrol Center',
                'Behavioral Health & Crisis Center',
                'Safety Lighting & Camera Control Hub'
            ],
            community_upgrade: [
                'Full-Service Supermarket & Food Cooperative',
                'Recreation & Workforce Development Center',
                'Stormwater Retention Pond & Pocket Park',
                'Accessible Community Wellness Center',
                'Library, Arts & Social Activities Hub'
            ],
            shelter_proposal: [
                'Low-Barrier Emergency Shelter',
                'Permanent Supportive Housing Facility',
                'Family & Youth Transitional Center',
                'Day Resource & Medical Intake Hub',
                'Safe Haven Night Shelter'
            ]
        };

        // Pre-populated High Crime Hotspot Zones
        const sampleCrimeHotspots = [
            { id: 'ch-1', name: 'West Baltimore Corridor', lat: 39.2980, lng: -76.6450, radius: 450, crimeRate: 'Very High', trendStatus: 'Priority trend review', primaryTypes: 'Larceny, Auto Theft, Assault', recBuilding: 'Youth Rec, Food Market & CVI Hub' },
            { id: 'ch-2', name: 'East Baltimore / Monument St', lat: 39.2995, lng: -76.5850, radius: 400, crimeRate: 'High', trendStatus: 'Priority trend review', primaryTypes: 'Vandalism, Burglary', recBuilding: 'Recreation, Workforce & Health Center' },
            { id: 'ch-3', name: 'Inner Harbor / Pratt Corridor', lat: 39.2840, lng: -76.6120, radius: 350, crimeRate: 'Moderate-High', trendStatus: 'Monitor commercial corridor', primaryTypes: 'Commercial Theft, Robbery', recBuilding: 'Safety Lighting & Camera Hub' }
        ];

        // Illustrative neighborhood condition ratings derived from the pre-populated page flags.
        const sampleConditionHotspots = [
            { id: 'cond-1', name: 'Federal Hill', lat: 39.2778, lng: -76.6119, radius: 280, conditionRating: 'D (40/100)', primaryIssue: 'Critical pavement collapse and accessibility risk', recUpgrade: 'Accessible Community Wellness Center & repaired public plaza' },
            { id: 'cond-2', name: 'Hampden / W 36th St', lat: 39.3622, lng: -76.6351, radius: 300, conditionRating: 'D (42/100)', primaryIssue: 'Persistent water leak, standing water, and slippery public space', recUpgrade: 'Stormwater retention pond, bioswale & pocket park' },
            { id: 'cond-3', name: 'Fells Point Waterfront', lat: 39.2845, lng: -76.6081, radius: 260, conditionRating: 'C- (55/100)', primaryIssue: 'Buckled pedestrian route and reported safety incidents', recUpgrade: 'Walkway repairs, community market & waterfront activities' },
            { id: 'cond-4', name: 'Inner Harbor / Pratt St', lat: 39.2812, lng: -76.6125, radius: 300, conditionRating: 'C (58/100)', primaryIssue: 'Lighting outage and public-safety concern', recUpgrade: 'Lighting improvements & staffed recreation programming' }
        ];

        // Pre-populated Unhoused Population Concentration Zones
        const sampleHomelessHotspots = [
            { id: 'hh-1', name: 'Fallsway / Downtown Corridor', lat: 39.2945, lng: -76.6080, radius: 380, countEstimate: '140+ unsheltered individuals', recShelter: 'Low-Barrier Emergency Shelter (80 Beds)' },
            { id: 'hh-2', name: 'West Baltimore Station Area', lat: 39.2910, lng: -76.6400, radius: 320, countEstimate: '65+ unsheltered individuals', recShelter: 'Permanent Supportive Housing (45 Units)' },
            { id: 'hh-3', name: 'Highlandtown / Pulaski Belt', lat: 39.2870, lng: -76.5650, radius: 300, countEstimate: '40+ unsheltered individuals', recShelter: 'Day Resource & Medical Intake Hub' }
        ];

        // Suggested Buildings to mitigate high crime
        let sampleSuggestedSafetyBuildings = [
            {
                id: 'bldg-1',
                lat: 39.2975,
                lng: -76.6430,
                neighborhood: 'West Baltimore',
                category: 'crime_building',
                subtype: 'Youth Recreation & Community Center',
                severity: 'Critical',
                status: 'Proposed',
                source: 'Crime Data Analytics Engine',
                costEstimate: '$2.8M',
                expectedImpact: '-32% Violent Offenses within 0.5mi radius',
                description: 'West Baltimore Youth & CVI Center - Multipurpose youth sports gym, after-school mentoring rooms, and violent crime intervention office to engage youth in high-risk zones.',
                date: '2026-09-26',
                upvotes: 42
            },
            {
                id: 'bldg-2',
                lat: 39.2990,
                lng: -76.5870,
                neighborhood: 'East Baltimore',
                category: 'crime_building',
                subtype: 'Community Violence Intervention (CVI) Hub',
                severity: 'High',
                status: 'Proposed',
                source: 'Crime Data Analytics Engine',
                costEstimate: '$1.5M',
                expectedImpact: '-25% Assault & Gun Violence Incidents',
                description: 'East Baltimore Violence De-escalation Center - Houses local peace practitioners, mental health counselors, and job placement assistance.',
                date: '2026-09-25',
                upvotes: 38
            },
            {
                id: 'bldg-3',
                lat: 39.2835,
                lng: -76.6110,
                neighborhood: 'Inner Harbor',
                category: 'crime_building',
                subtype: 'Safety Lighting & Camera Control Hub',
                severity: 'Medium',
                status: 'Proposed',
                source: 'Crime Data Analytics Engine',
                costEstimate: '$750K',
                expectedImpact: '-40% Nighttime Larceny & Vehicle Break-ins',
                description: 'Promenade High-Output LED Lighting & CCTV Grid - High visibility security towers and emergency call stations along commercial walkways.',
                date: '2026-09-24',
                upvotes: 29
            },
            {
                id: 'upgrade-1',
                lat: 39.2942,
                lng: -76.6500,
                neighborhood: 'West Baltimore',
                category: 'community_upgrade',
                subtype: 'Full-Service Supermarket & Food Cooperative',
                severity: 'Critical',
                status: 'Proposed',
                source: 'Community Planning Scenario',
                costEstimate: '$3.4M',
                expectedImpact: 'Fresh food access, 70 local jobs, nutrition programs',
                conditionRating: 'D (38/100)',
                needSignal: 'Very-high crime priority area; food-access review recommended',
                description: 'Resident-led grocery cooperative with affordable produce, a teaching kitchen, nutrition services, and flexible space for neighborhood markets and social events.',
                date: '2026-09-26',
                upvotes: 46
            },
            {
                id: 'upgrade-2',
                lat: 39.3030,
                lng: -76.5815,
                neighborhood: 'East Baltimore',
                category: 'community_upgrade',
                subtype: 'Recreation & Workforce Development Center',
                severity: 'High',
                status: 'Proposed',
                source: 'Community Planning Scenario',
                costEstimate: '$4.2M',
                expectedImpact: 'Youth activities, job training, evening programs',
                conditionRating: 'C- (48/100)',
                needSignal: 'High crime-priority corridor; expanded social programming needed',
                description: 'A recreation center with indoor courts, arts rooms, workforce training, youth mentoring, mental-health referrals, and evening community activities.',
                date: '2026-09-26',
                upvotes: 51
            },
            {
                id: 'upgrade-3',
                lat: 39.3640,
                lng: -76.6315,
                neighborhood: 'Hampden',
                category: 'community_upgrade',
                subtype: 'Stormwater Retention Pond & Pocket Park',
                severity: 'Critical',
                status: 'Proposed',
                source: 'Community Planning Scenario',
                costEstimate: '$1.1M',
                expectedImpact: 'Reduced standing water, habitat, shade, public gathering space',
                conditionRating: 'D (42/100)',
                needSignal: 'Critical standing-water and water-main condition flag',
                description: 'A landscaped retention pond and bioswale network with native plants, walking paths, seating, environmental education, and a small community event lawn.',
                date: '2026-09-26',
                upvotes: 44
            },
            {
                id: 'upgrade-4',
                lat: 39.2760,
                lng: -76.6150,
                neighborhood: 'Federal Hill',
                category: 'community_upgrade',
                subtype: 'Accessible Community Wellness Center',
                severity: 'High',
                status: 'Proposed',
                source: 'Community Planning Scenario',
                costEstimate: '$2.1M',
                expectedImpact: 'Accessible recreation, public-health outreach, repaired public realm',
                conditionRating: 'D (40/100)',
                needSignal: 'Critical pavement and accessibility condition flag',
                description: 'An accessible neighborhood center with exercise rooms, senior programs, family activities, public-health outreach, and a rebuilt ADA-friendly plaza.',
                date: '2026-09-26',
                upvotes: 37
            }
        ];

        // Suggested Homeless Shelters based on unhoused population data
        let sampleSuggestedShelters = [
            {
                id: 'sh-1',
                lat: 39.2950,
                lng: -76.6075,
                neighborhood: 'Downtown / Fallsway',
                category: 'shelter_proposal',
                subtype: 'Low-Barrier Emergency Shelter',
                severity: 'Critical',
                status: 'Proposed',
                source: 'Unhoused Data Analytics',
                bedCapacity: '85 Beds',
                transitAccess: 'Excellent (MTA Bus & Light Rail within 0.1mi)',
                description: 'Fallsway Hope Emergency Shelter - 24/7 low-barrier emergency beds, hot meals, shower facilities, and medical intake to serve Fallsway encampment zone.',
                date: '2026-09-26',
                upvotes: 54
            },
            {
                id: 'sh-2',
                lat: 39.2905,
                lng: -76.6385,
                neighborhood: 'West Baltimore',
                category: 'shelter_proposal',
                subtype: 'Permanent Supportive Housing Facility',
                severity: 'High',
                status: 'Proposed',
                source: 'Unhoused Data Analytics',
                bedCapacity: '50 Studio Apartments',
                transitAccess: 'Good (MARC West Baltimore Station)',
                description: 'Westside Supportive Housing Haven - Micro-apartment supportive housing for long-term unhoused adults with onsite caseworkers and counseling.',
                date: '2026-09-25',
                upvotes: 41
            },
            {
                id: 'sh-3',
                lat: 39.2880,
                lng: -76.5660,
                neighborhood: 'Highlandtown',
                category: 'shelter_proposal',
                subtype: 'Day Resource & Medical Intake Hub',
                severity: 'Medium',
                status: 'Proposed',
                source: 'Unhoused Data Analytics',
                bedCapacity: 'Day Facility (300 Daily Visitors)',
                transitAccess: 'Moderate',
                description: 'Eastside Day Navigation Hub - Daytime shelter providing laundry, mail services, case management, and addiction recovery resources.',
                date: '2026-09-23',
                upvotes: 31
            }
        ];

        // Main Flags Dataset (Infrastructure, Safety, Crime Incidents)
        let sampleFlagsData = [
            { id: 'bmore-crime-2263', ccNumber: '251002263', lat: 39.2838, lng: -76.6095, neighborhood: 'Fells Point', category: 'safety', subtype: 'NIBRS Crime Incident / Public Safety', severity: 'Critical', status: 'Open', source: 'NIBRS Crime Log', description: 'CC# 251002263 - Larceny / Commercial Burglary reported along Thames St corridor.', date: '2026-09-24', upvotes: 21 },
            { id: 'bmore-crime-2264', ccNumber: '251002264', lat: 39.2815, lng: -76.6110, neighborhood: 'Inner Harbor', category: 'safety', subtype: 'NIBRS Crime Incident / Public Safety', severity: 'High', status: 'In Progress', source: 'NIBRS Crime Log', description: 'CC# 251002264 - Auto Theft reported at Light St parking structure.', date: '2026-09-25', upvotes: 14 },
            { id: 'bmore-crime-2265', ccNumber: '251002265', lat: 39.2785, lng: -76.6132, neighborhood: 'Federal Hill', category: 'safety', subtype: 'NIBRS Crime Incident / Public Safety', severity: 'High', status: 'Open', source: 'NIBRS Crime Log', description: 'CC# 251002265 - Vandalism and Destruction of Property along S Charles St.', date: '2026-09-23', upvotes: 18 },
            { id: 'bmore-crime-2267', ccNumber: '251002267', lat: 39.3618, lng: -76.6342, neighborhood: 'Hampden', category: 'safety', subtype: 'NIBRS Crime Incident / Public Safety', severity: 'Critical', status: 'Open', source: 'NIBRS Crime Log', description: 'CC# 251002267 - Robbery report along W 36th St retail storefronts.', date: '2026-09-26', upvotes: 30 },
            { id: 'bmore-101', lat: 39.2845, lng: -76.6081, neighborhood: 'Fells Point', category: 'sidewalk', subtype: 'Uneven Walkway / Trip Hazard', severity: 'High', status: 'Open', source: 'Local', description: 'Historic cobblestone sidewalk severely buckled near water edge.', date: '2026-09-20', upvotes: 18 },
            { id: 'bmore-102', lat: 39.2812, lng: -76.6125, neighborhood: 'Inner Harbor', category: 'infrastructure', subtype: 'Broken / Non-functioning Streetlight', severity: 'Medium', status: 'In Progress', source: 'Local', description: 'Light pole dark along promenade near Pratt St.', date: '2026-09-22', upvotes: 8 },
            { id: 'bmore-103', lat: 39.2778, lng: -76.6119, neighborhood: 'Federal Hill', category: 'sidewalk', subtype: 'Cracked / Broken Pavement', severity: 'Critical', status: 'Open', source: 'Local', description: 'Deep pavement collapse adjacent to drainage curb. Tree root upheaval.', date: '2026-09-24', upvotes: 25 },
            { id: 'bmore-105', lat: 39.3622, lng: -76.6351, neighborhood: 'Hampden', category: 'infrastructure', subtype: 'Water Main Leak / Standing Water', severity: 'Critical', status: 'In Progress', source: 'Local', description: 'Continuous seepage on 36th St sidewalk creating persistent slippery moss.', date: '2026-09-18', upvotes: 32 }
        ];

        let uploadedCommunityData = window.communityData || {
            metadata: {},
            crimeHotspots: [],
            vacantBuildings: [],
            neighborhoodSummary: [],
            proposals: []
        };
        let dataMetadata = uploadedCommunityData.metadata;
        let crimeHotspots = uploadedCommunityData.crimeHotspots;
        let vacantBuildings = uploadedCommunityData.vacantBuildings;
        let neighborhoodSummary = uploadedCommunityData.neighborhoodSummary;
        let staticCommunityProposals = uploadedCommunityData.proposals.map(item => ({
            ...item,
            liveDatabase: false
        }));
        let suggestedSafetyBuildings = [...staticCommunityProposals];
        let suggestedShelters = [];

        function allCommunityProposals() {
            return [...suggestedSafetyBuildings, ...suggestedShelters];
        }
        let flagsData = [
            ...crimeHotspots.map((zone, index) => ({
                id: zone.id,
                lat: zone.lat,
                lng: zone.lng,
                neighborhood: zone.name,
                category: 'safety',
                subtype: 'Uploaded NIBRS Crime Concentration',
                severity: index < 5 ? 'Critical' : index < 10 ? 'High' : 'Medium',
                status: 'Partial Dataset',
                source: zone.source,
                description: `${zone.recentCount.toLocaleString()} records in the recent comparison period; ${zone.previousCount.toLocaleString()} in the prior period. Leading types: ${zone.primaryTypes.join(', ')}.`,
                date: dataMetadata.comparisonPeriods?.recent?.[1] || '2026-09-26',
                recentCount: zone.recentCount,
                previousCount: zone.previousCount,
                trendPercent: zone.trendPercent,
                isHotspot: true,
                upvotes: 0
            })),
            ...vacantBuildings.map(building => {
                const noticeYear = Number(building.noticeDate.slice(0, 4));
                return {
                    ...building,
                    category: 'vacant',
                    subtype: 'Open Vacant Building Notice',
                    severity: noticeYear <= 2016 ? 'Critical' : noticeYear <= 2021 ? 'High' : 'Medium',
                    status: 'Open Notice',
                    source: 'Uploaded Vacant Building Notice dataset',
                    description: `${building.address} — Block/Lot ${building.blockLot}; market typology ${building.marketTypology}; Council District ${building.councilDistrict}.`,
                    date: building.noticeDate,
                    ccNumber: building.noticeNumber,
                    upvotes: 0
                };
            })
        ];

        function canPublishPins() {
            return Boolean(currentUser);
        }

        function requireLeaderAccount() {
            if (!currentUser) {
                openAuthModal();
                showToast('Sign in to submit a community report or project.', 'info');
                return;
            }
            showToast('Sign in to submit a community report or project.', 'error');
        }

        function openAuthModal() {
            document.getElementById('authModal').classList.remove('hidden');
            window.setTimeout(() => document.getElementById('authEmail').focus(), 0);
        }

        function closeAuthModal() {
            document.getElementById('authModal').classList.add('hidden');
            document.getElementById('authForm').reset();
        }

        async function handleAuthButton() {
            if (!currentUser) {
                openAuthModal();
                return;
            }

            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                showToast(error.message, 'error');
                return;
            }
            showToast('Signed out successfully.', 'info');
        }

        async function signInWithPassword(event) {
            event.preventDefault();
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;
            const button = document.getElementById('signInButton');
            button.disabled = true;

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            button.disabled = false;
            if (error) {
                showToast(error.message, 'error');
                return;
            }

            closeAuthModal();
            await refreshAuthState(data.user);
            showToast('Signed in successfully.', 'success');
        }

        async function createResidentAccount() {
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;
            if (!email || password.length < 8) {
                showToast('Enter an email and a password of at least eight characters.', 'error');
                return;
            }

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: 'https://www.bmorespeakup.us/' }
            });
            if (error) {
                showToast(error.message, 'error');
                return;
            }

            if (data.session) {
                closeAuthModal();
                await refreshAuthState(data.user);
                showToast('Account created and signed in.', 'success');
            } else {
                showToast('Check your email to confirm your account.', 'success');
            }
        }

        function updateAuthUI() {
            const label = document.getElementById('authLabel');
            const icon = document.getElementById('authIcon');
            const button = document.getElementById('authButton');
            const addButton = document.getElementById('addFlagBtn');
            const role = currentProfile?.role;

            label.textContent = currentUser
                ? 'Account'
                : 'Sign In';
            icon.className = currentUser ? 'fa-solid fa-user' : 'fa-solid fa-right-to-bracket';
            button.title = currentUser ? 'Manage your reports' : 'Sign in';
            addButton.classList.toggle('opacity-60', Boolean(currentUser && !canPublishPins()));
            addButton.title = canPublishPins() ? 'Add a live map pin' : 'Sign in to submit a report';
        }

        async function loadCurrentUserVotes() {
            upvotedProposalIds = new Set();
            if (!currentUser) return;

            const { data, error } = await supabaseClient
                .from('community_pin_votes')
                .select('pin_id').eq('user_id', currentUser.id);
            if (error) throw error;
            upvotedProposalIds = new Set((data || []).map(item => item.pin_id));
        }

        async function refreshAuthState(user) {
            currentUser = user || null;
            currentProfile = null;

            if (currentUser) {
                const { data, error } = await supabaseClient
                    .from('profiles')
                    .select('display_name, role')
                    .eq('id', currentUser.id)
                    .maybeSingle();
                if (error) console.error('Unable to load account role', error);
                currentProfile = data || { role: 'resident' };
            }

            try {
                await loadCurrentUserVotes();
            } catch (error) {
                console.error('Unable to load votes', error);
            }
            updateAuthUI();
            refreshCommunityViews();
        }

        function mapDatabasePin(row) {
            return {
                id: row.id,
                sourceKey: row.source_key,
                lat: row.latitude,
                lng: row.longitude,
                neighborhood: row.neighborhood,
                category: row.category,
                subtype: row.subtype,
                severity: row.severity,
                status: progressLabels[row.progress_status] || 'Submitted',
                progressStatus: row.progress_status || 'submitted',
                updatedAt: row.updated_at || row.created_at,
                createdBy: row.created_by,
                responsibleOrganization: row.responsible_organization || '',
                progressNote: row.progress_note || '',
                source: row.source,
                submitter: row.submitter_name,
                leaderSubmitted: true,
                description: row.description,
                date: String(row.created_at || '').slice(0, 10),
                upvotes: row.vote_count || 0,
                liveDatabase: true
            };
        }

        function refreshCommunityViews() {
            if (!map || !clusterGroup) return;
            renderAllMarkers();
            renderTabLists();
            renderCommunityBoard();
            updateListAndStats();
            renderAccountReports();
        }

        function subscribeToLiveCommunityPins() {
            if (communityRealtimeChannel) supabaseClient.removeChannel(communityRealtimeChannel);
            communityRealtimeChannel = supabaseClient
                .channel('community-pins-live')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'community_pins'
                }, async () => {
                    try {
                        await loadLiveCommunityPins();
                    } catch (error) {
                        console.error('Unable to refresh live pins', error);
                    }
                })
                .subscribe(status => {
                    const badge = document.getElementById('liveBadge');
                    if (status === 'SUBSCRIBED') badge.textContent = 'Live Community Data';
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') badge.textContent = 'Live Sync Unavailable';
                });
        }

        async function initializeLiveCommunityData() {
            try {
                const { data } = await supabaseClient.auth.getSession();
                await refreshAuthState(data.session?.user || null);
                await loadLiveCommunityPins();
                subscribeToLiveCommunityPins();
                supabaseClient.auth.onAuthStateChange((event, session) => {
                    if (event === 'INITIAL_SESSION') return;
                    window.setTimeout(() => refreshAuthState(session?.user || null), 0);
                });
            } catch (error) {
                console.error('Live community database unavailable', error);
                document.getElementById('liveBadge').textContent = 'Static Data Only';
                showToast('Live community data is temporarily unavailable.', 'error');
            }
        }

        window.onload = async function() {
            map = L.map('map', {
                center: [39.2904, -76.6122],
                zoom: 13,
                zoomControl: false
            });

            L.control.zoom({ position: 'topright' }).addTo(map);

            const satelliteTile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Open Baltimore GIS'
            });

            map.streetTile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' });
            map.streetTile.addTo(map);
            map.satelliteTile = satelliteTile;

            clusterGroup = L.markerClusterGroup({
                maxClusterRadius: 40,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false
            });
            map.addLayer(clusterGroup);
            // Leaflet also needs to recalculate after responsive size changes.
            if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(() => map.invalidateSize({ pan: false }))
                    .observe(document.getElementById('map'));
            }

            map.on('click', function(e) {
                if (isAddMode) {
                    openAddModal(e.latlng.lat, e.latlng.lng);
                    toggleAddFlagMode();
                }
            });

            renderAllMarkers();
            renderTabLists();
            renderCommunityBoard();
            updateListAndStats();
            updateSubtypeOptions();
            updateSectionToggleButtons();
            initializeEnhancements();
            await initializeLiveCommunityData();
            await openLinkedReport();
            if ('requestIdleCallback' in window) requestIdleCallback(() => ensureCityData().catch(() => {}), { timeout: 5000 });
            else setTimeout(() => ensureCityData().catch(() => {}), 1500);
        };

        async function fetchLive311Data() {
            const spinner = document.getElementById('syncSpinner');
            if (spinner) spinner.classList.add('fa-spin');

            try {
                const arcgisUrl = "https://services1.arcgis.com/U26yA9M2S461A42B/arcgis/rest/services/311_Customer_Service_Requests_2025/FeatureServer/0/query?where=SRType%20LIKE%20'%25Footways%25'%20OR%20SRType%20LIKE%20'%25Street%25'%20OR%20SRType%20LIKE%20'%25Dumping%25'&outFields=SRType,SRStatus,Neighborhood,CreatedDate,Latitude,Longitude,Address&resultRecordCount=20&f=json";
                
                const response = await fetch(arcgisUrl);
                if (response.ok) {
                    const json = await response.json();
                    if (json.features && json.features.length > 0) {
                        let liveAdded = 0;
                        json.features.forEach(feat => {
                            const attr = feat.attributes;
                            if (attr.Latitude && attr.Longitude) {
                                const id = 'open311-' + Math.random().toString(36).substr(2, 6);
                                if (!flagsData.some(f => f.lat === attr.Latitude && f.lng === attr.Longitude)) {
                                    let cat = 'infrastructure';
                                    let srType = attr.SRType || '311 Issue';
                                    if (srType.toLowerCase().includes('footway') || srType.toLowerCase().includes('sidewalk')) cat = 'sidewalk';
                                    if (srType.toLowerCase().includes('dumping') || srType.toLowerCase().includes('sanitation')) cat = 'safety';

                                    flagsData.unshift({
                                        id: id,
                                        lat: attr.Latitude,
                                        lng: attr.Longitude,
                                        neighborhood: attr.Neighborhood || 'Baltimore City',
                                        category: cat,
                                        subtype: srType,
                                        severity: 'Medium',
                                        status: attr.SRStatus && attr.SRStatus.includes('Closed') ? 'Resolved' : 'Open',
                                        source: 'Open311',
                                        description: `Official Open311 Request at ${attr.Address || 'Baltimore location'}.`,
                                        date: attr.CreatedDate ? new Date(attr.CreatedDate).toISOString().split('T')[0] : '2026-09-26',
                                        upvotes: 1
                                    });
                                    liveAdded++;
                                }
                            }
                        });
                        if (liveAdded > 0) {
                            renderAllMarkers();
                            updateListAndStats();
                            showToast(`Synced ${liveAdded} live Open311 requests!`, 'success');
                        }
                    }
                }
            } catch (err) {
                console.log('Open311 Live Fetch Fallback: Utilizing enhanced pre-populated dataset.', err);
            } finally {
                if (spinner) spinner.classList.remove('fa-spin');
            }
        }

        function toggleClustering() {
            isClusteringEnabled = document.getElementById('clusterToggle').checked;
            renderAllMarkers();
        }

        function getCategoryStyle(category) {
            if (category === 'safety') return { color: '#ef4444', icon: 'fa-triangle-exclamation' };
            if (category === 'vacant') return { color: '#f97316', icon: 'fa-house-crack' };
            if (category === 'crime_building') return { color: '#a855f7', icon: 'fa-building-shield' };
            if (category === 'community_upgrade') return { color: '#22c55e', icon: 'fa-seedling' };
            if (category === 'shelter_proposal') return { color: '#06b6d4', icon: 'fa-house-chimney-medical' };
            return { color: '#f59e0b', icon: 'fa-flag' };
        }

        function renderMarkersNow() {
            markerLookup.clear();
            clusterGroup.clearLayers();
            rawMarkerList.forEach(m => map.removeLayer(m));
            rawMarkerList = [];

            // Uploaded NIBRS records are aggregated into privacy-conscious hotspot areas.
            if (currentMapView === 'civic' && activeSections.publicSafety && document.getElementById('toggleCrimeZone').checked) {
                crimeHotspots.forEach(zone => {
                    if (!matchesDateFilter({ date: dataMetadata.comparisonPeriods?.recent?.[1] })) return;
                    const trendLabel = zone.trendPercent == null
                        ? 'Comparison unavailable'
                        : `${zone.trendPercent >= 0 ? '+' : ''}${zone.trendPercent}% versus prior period`;
                    const circle = L.circle([zone.lat, zone.lng], {
                        color: '#ef4444',
                        fillColor: '#f87171',
                        fillOpacity: 0.2,
                        radius: zone.radius
                    }).bindPopup(`
                        <div class="p-3 text-xs">
                            <span class="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-2 py-0.5 rounded uppercase">Uploaded NIBRS Concentration</span>
                            <h4 class="font-bold text-sm text-white mt-1">${zone.name}</h4>
                            <div class="text-red-300 mt-1"><strong>Recent records:</strong> ${zone.recentCount.toLocaleString()}</div>
                            <div class="text-amber-300 mt-1"><strong>Trend:</strong> ${trendLabel}</div>
                            <div class="text-slate-300 mt-1"><strong>Leading types:</strong> ${zone.primaryTypes.join(', ')}</div>
                            <div class="text-[10px] text-slate-400 mt-2">Partial uploaded NIBRS file; counts are not population-adjusted rates.</div>
                        </div>
                    `);
                    circle.addTo(map);
                    rawMarkerList.push(circle);
                });
            }

            let combinedData;
            if (currentMapView === 'community') {
                combinedData = allCommunityProposals().filter(matchesActiveFilters);
            } else {
                combinedData = getFilteredData().filter(item => item.category !== 'safety' || !item.isHotspot);
                if (activeSections.safety && document.getElementById('toggleBuildings').checked) {
                    suggestedSafetyBuildings.forEach(b => {
                        if (matchesActiveFilters(b) && !combinedData.some(x => x.id === b.id)) combinedData.push(b);
                    });
                }
                if (activeSections.shelter && document.getElementById('toggleShelterPins').checked) {
                    suggestedShelters.forEach(s => {
                        if (matchesActiveFilters(s) && !combinedData.some(x => x.id === s.id)) combinedData.push(s);
                    });
                }

                if (!activeSections.vacant || !document.getElementById('toggleVacantBuildings').checked) {
                    combinedData = combinedData.filter(item => item.liveDatabase || item.category !== 'vacant');
                }
            }

            const clusteredMarkers = [];
            const visibleBounds = map.getBounds().pad(0.25);
            combinedData.filter(item => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)) && visibleBounds.contains([item.lat, item.lng])).forEach(item => {
                const style = getCategoryStyle(item.category);
                let pulseClass = '';
                if (item.severity === 'Critical' && item.category !== 'vacant') pulseClass = 'marker-pulse-critical';
                else if (item.category === 'crime_building' || item.category === 'community_upgrade') pulseClass = 'marker-pulse-building';
                else if (item.category === 'shelter_proposal') pulseClass = 'marker-pulse-shelter';

                const markerSize = item.category === 'vacant' ? 22 : 32;
                const iconSize = item.category === 'vacant' ? 'text-[10px]' : 'text-sm';

                const customIcon = L.divIcon({
                    className: 'custom-map-flag-icon',
                    html: `
                        <div class="map-marker-dot rounded-full ${pulseClass}" style="width:${markerSize}px;height:${markerSize}px;background-color:${style.color};box-shadow:0 4px 10px rgba(0,0,0,0.6);">
                            <span class="map-marker-symbol"><i class="fa-solid ${item.icon || style.icon} text-slate-950 ${iconSize}"></i></span>
                            ${item.status === 'Resolved' ? '<span class="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center"><i class="fa-solid fa-check"></i></span>' : ''}
                        </div>
                    `,
                    iconSize: [markerSize, markerSize],
                    iconAnchor: [markerSize / 2, markerSize / 2]
                });

                const marker = L.marker([item.lat, item.lng], { icon: customIcon });

                const popupContent = `
                    <div class="p-3">
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getSeverityBadgeClass(item.severity)}">
                                ${escapeHtml(item.severity)} Priority
                            </span>
                            <span class="text-[10px] font-medium text-slate-400">${escapeHtml(item.date)}</span>
                        </div>
                        <h4 class="font-bold text-sm text-white leading-tight mb-1">${escapeHtml(item.subtype)}</h4>
                        <div class="text-xs text-amber-400 font-medium mb-2"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(item.neighborhood)}</div>
                        <p class="text-xs text-slate-300 mb-2 bg-slate-800/80 p-2 rounded border border-slate-700/50">${escapeHtml(item.description)}</p>
                        
                        ${item.costEstimate ? `<div class="text-[11px] text-purple-300"><strong>Cost Est:</strong> ${item.costEstimate} | <strong>Impact:</strong> ${item.expectedImpact}</div>` : ''}
                        ${item.conditionRating ? `<div class="text-[11px] text-orange-300 mt-1"><strong>Condition:</strong> ${item.conditionRating} | <strong>Need:</strong> ${item.needSignal}</div>` : ''}
                        ${item.bedCapacity ? `<div class="text-[11px] text-emerald-300"><strong>Capacity:</strong> ${item.bedCapacity} | <strong>Transit:</strong> ${item.transitAccess}</div>` : ''}

                        <div class="flex items-center justify-between text-xs pt-2 mt-2 border-t border-slate-700/60">
                            <div class="flex items-center gap-1.5">
                                ${['crime_building', 'community_upgrade', 'shelter_proposal'].includes(item.category) ? `
                                    <button onclick="upvoteFlag('${item.id}')" class="${getVoteButtonClass(item.id)}" aria-pressed="${upvotedProposalIds.has(item.id)}" title="${upvotedProposalIds.has(item.id) ? 'Remove your vote' : 'Support this proposal'}">
                                        <i class="${getVoteIconClass(item.id)}"></i> <span>${item.upvotes || 0}</span>
                                    </button>
                                ` : ''}
                                ${item.category === 'vacant' ? getNoticeButton(item) : ''}
                                ${getPinActions(item)}
                            </div>
                            <span class="text-[11px] font-semibold text-amber-400">
                                ${escapeHtml(item.status)}
                            </span>
                        </div>
                    </div>
                `;

                marker.bindPopup(() => popupContent, { maxHeight: 360 });
                markerLookup.set(String(item.id), marker);

                if (isClusteringEnabled) clusteredMarkers.push(marker);
                else {
                    marker.addTo(map);
                    rawMarkerList.push(marker);
                }
            });

            if (isClusteringEnabled && clusteredMarkers.length) clusterGroup.addLayers(clusteredMarkers);
        }

        function getVoteButtonClass(id) {
            return upvotedProposalIds.has(id)
                ? 'text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 border border-amber-300 font-bold'
                : 'text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 border border-slate-700 font-semibold';
        }

        function getVoteIconClass(id) {
            return `fa-${upvotedProposalIds.has(id) ? 'solid' : 'regular'} fa-thumbs-up`;
        }

        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>'"]/g, character => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            })[character]);
        }

        function findMapItemById(id) {
            return flagsData.find(item => item.id === id) ||
                suggestedSafetyBuildings.find(item => item.id === id) ||
                suggestedShelters.find(item => item.id === id);
        }

        function getNoticeButton(item) {
            const encodedId = encodeURIComponent(String(item.id));
            return `
                <button onclick="openNoticeDetails('${encodedId}')" class="text-xs bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 px-2.5 py-1.5 rounded-md border border-orange-500/30 font-semibold" title="Open notice details">
                    <i class="fa-solid fa-file-lines mr-1"></i>Open Notice
                </button>
            `;
        }

        function openNoticeDetails(encodedId) {
            const item = findMapItemById(decodeURIComponent(encodedId));
            if (!item || item.category !== 'vacant') {
                showToast('Notice details are unavailable.', 'error');
                return;
            }

            const detailRows = [
                ['Notice number', item.ccNumber || item.noticeNumber || 'Not listed'],
                ['Address', item.address || 'Not listed'],
                ['Neighborhood', item.neighborhood || 'Not listed'],
                ['Notice date', item.noticeDate || item.date || 'Not listed'],
                ['Block / Lot', item.blockLot || 'Not listed'],
                ['Council district', item.councilDistrict || 'Not listed'],
                ['Market typology', item.marketTypology || 'Not listed'],
                ['Condition', item.severity ? `${escapeHtml(item.severity)} priority` : 'Not rated'],
                ['Source', item.source || 'Not listed']
            ];

            document.getElementById('noticeDetails').innerHTML = `
                <dl class="grid grid-cols-[minmax(110px,auto)_1fr] gap-x-4 gap-y-2">
                    ${detailRows.map(([label, value]) => `
                        <dt class="text-xs font-semibold text-slate-400">${escapeHtml(label)}</dt>
                        <dd class="text-xs text-slate-100 break-words">${escapeHtml(value)}</dd>
                    `).join('')}
                </dl>
                <div class="mt-4 pt-4 border-t border-slate-800">
                    <div class="text-xs font-semibold text-slate-400 mb-1">Notice summary</div>
                    <p class="text-xs leading-relaxed text-slate-200">${escapeHtml(item.description || 'No additional description is available.')}</p>
                </div>
            `;
            document.getElementById('noticeModal').classList.remove('hidden');
        }

        function closeNoticeModal() {
            document.getElementById('noticeModal').classList.add('hidden');
        }

        function renderCommunityBoard() {
            const list = document.getElementById('communityProposalList');
            if (!list) return;
            const proposals = allCommunityProposals();
            const sortMode = document.getElementById('communitySort')?.value || 'votes';
            const priorityRank = { Critical: 4, High: 3, Medium: 2, Low: 1 };

            proposals.sort((a, b) => {
                if (sortMode === 'newest') return String(b.date || '').localeCompare(String(a.date || ''));
                if (sortMode === 'priority') return (priorityRank[b.severity] || 0) - (priorityRank[a.severity] || 0);
                return (b.upvotes || 0) - (a.upvotes || 0) || String(b.date || '').localeCompare(String(a.date || ''));
            });

            document.getElementById('communityProposalCount').textContent = `${proposals.length} proposal${proposals.length === 1 ? '' : 's'}`;
            list.innerHTML = proposals.length ? proposals.map((proposal, index) => `
                <article class="bg-slate-900/95 border ${proposal.leaderSubmitted ? 'border-purple-400/50' : 'border-slate-700'} p-3 rounded-lg shadow-lg">
                    <div class="flex items-center justify-between gap-3 mb-2">
                        <span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded ${getSeverityBadgeClass(proposal.severity)}">${escapeHtml(proposal.severity)} Priority</span>
                        <span class="text-[10px] text-slate-400">#${index + 1}</span>
                    </div>
                    <h3 class="text-sm font-bold text-white leading-tight">${escapeHtml(proposal.subtype)}</h3>
                    <div class="text-[11px] text-amber-300 mt-1"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(proposal.neighborhood)}</div>
                    <p class="text-[11px] text-slate-300 leading-relaxed mt-2">${escapeHtml(proposal.description)}</p>
                    <div class="text-[10px] text-slate-400 mt-2">Submitted by <span class="text-slate-200 font-semibold">${escapeHtml(proposal.submitter || proposal.source || 'Community planning analysis')}</span></div>
                    <div class="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800">
                        <button onclick="panToCoords(${proposal.lat}, ${proposal.lng})" class="p-2 text-purple-300 hover:text-white hover:bg-slate-800 rounded-md" title="Focus proposal on map">
                            <i class="fa-solid fa-crosshairs"></i>
                        </button>
                        <button onclick="upvoteFlag('${proposal.id}')" class="${getVoteButtonClass(proposal.id)}" aria-pressed="${upvotedProposalIds.has(proposal.id)}" title="${upvotedProposalIds.has(proposal.id) ? 'Remove your vote' : 'Support this proposal'}">
                            <i class="${getVoteIconClass(proposal.id)}"></i>
                            <span>${proposal.upvotes || 0}</span>
                            <span>${upvotedProposalIds.has(proposal.id) ? 'Supported' : 'Support'}</span>
                        </button>
                        ${getPinActions(proposal)}
                    </div>
                </article>
            `).join('') : '<div class="text-center text-slate-400 p-6 text-xs">No community proposals yet. Use the plus button to place the first one.</div>';
        }

        function getSeverityBadgeClass(severity) {
            switch(severity) {
                case 'Critical': return 'bg-red-500/20 text-red-400 border border-red-500/30';
                case 'High': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
                case 'Medium': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
                case 'Low': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
                default: return 'bg-slate-500/20 text-slate-400';
            }
        }

        function parseRecordDate(value) {
            const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (!match) return null;
            return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
        }

        function getActiveDateRange() {
            const period = document.getElementById('filterTimePeriod')?.value || 'ALL';
            if (period === 'ALL') return { start: null, end: null };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let start = new Date(today);
            let end = new Date(today);

            if (period === '7_DAYS') start.setDate(start.getDate() - 6);
            else if (period === '30_DAYS') start.setDate(start.getDate() - 29);
            else if (period === '90_DAYS') start.setDate(start.getDate() - 89);
            else if (period === 'THIS_YEAR') start = new Date(today.getFullYear(), 0, 1);
            else if (period === 'CUSTOM') {
                const fromValue = document.getElementById('filterDateFrom')?.value;
                const toValue = document.getElementById('filterDateTo')?.value;
                start = fromValue ? new Date(`${fromValue}T00:00:00`) : null;
                end = toValue ? new Date(`${toValue}T00:00:00`) : null;
                if (start && end && start > end) [start, end] = [end, start];
            }

            return {
                start: start ? start.getTime() : null,
                end: end ? end.getTime() : null
            };
        }

        function matchesDateFilter(item) {
            const range = getActiveDateRange();
            if (range.start == null && range.end == null) return true;
            const itemDate = parseRecordDate(item?.date);
            if (itemDate == null) return false;
            return (range.start == null || itemDate >= range.start) &&
                (range.end == null || itemDate <= range.end);
        }

        function matchesActiveFilters(item) {
            const search = document.getElementById('searchInput').value.trim().toLowerCase();
            const cat = document.getElementById('filterCategory').value;
            const sev = document.getElementById('filterSeverity').value;

            const searchableText = [
                item.description,
                item.neighborhood,
                item.subtype,
                item.ccNumber,
                item.address,
                item.blockLot
            ].filter(Boolean).join(' ').toLowerCase();

            return searchableText.includes(search) &&
                (cat === 'ALL' || item.category === cat) &&
                (sev === 'ALL' || item.severity === sev) &&
                matchesDateFilter(item);
        }

        function handleTimePeriodChange() {
            const isCustom = document.getElementById('filterTimePeriod').value === 'CUSTOM';
            document.getElementById('customDateRange').classList.toggle('hidden', !isCustom);
            applyFilters();
        }

        function clearDateFilters() {
            document.getElementById('filterTimePeriod').value = 'ALL';
            document.getElementById('filterDateFrom').value = '';
            document.getElementById('filterDateTo').value = '';
            document.getElementById('customDateRange').classList.add('hidden');
            applyFilters();
        }

        function getFilteredData() {

            return flagsData.filter(item => {
                if (item.liveDatabase) return matchesActiveFilters(item);
                if (item.category === 'safety') {
                    if (!activeSections.publicSafety) return false;
                } else if (item.category === 'vacant') {
                    if (!activeSections.vacant) return false;
                } else if (item.category === 'crime_building' || item.category === 'community_upgrade') {
                    if (!activeSections.safety) return false;
                } else if (item.category === 'shelter_proposal') {
                    if (!activeSections.shelter) return false;
                }

                return matchesActiveFilters(item);
            });
        }

        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                try {
                    if (file.name.endsWith('.json')) {
                        const parsed = JSON.parse(content);
                        const items = Array.isArray(parsed) ? parsed : (parsed.features || parsed.data || [parsed]);
                        let addedCount = 0;
                        items.forEach(item => {
                            const attr = item.attributes || item;
                            const lat = parseFloat(attr.lat || attr.Latitude || attr.latitude || (item.geometry && item.geometry.y));
                            const lng = parseFloat(attr.lng || attr.Longitude || attr.longitude || (item.geometry && item.geometry.x));

                            if (!isNaN(lat) && !isNaN(lng)) {
                                flagsData.unshift({
                                    id: 'imported-' + Math.random().toString(36).substr(2, 6),
                                    ccNumber: attr.ccNumber || attr.CCNumber || '',
                                    lat: lat,
                                    lng: lng,
                                    neighborhood: attr.neighborhood || attr.Neighborhood || 'Imported Location',
                                    category: attr.category || 'infrastructure',
                                    subtype: attr.subtype || attr.SRType || 'Imported Record',
                                    severity: attr.severity || 'Medium',
                                    status: attr.status || 'Open',
                                    source: 'Imported File',
                                    description: attr.description || attr.Address || 'Imported Baltimore dataset entry',
                                    date: attr.date || new Date().toISOString().split('T')[0],
                                    upvotes: attr.upvotes || 1
                                });
                                addedCount++;
                            }
                        });
                        showToast(`Successfully imported ${addedCount} location flags!`, 'success');
                    } else if (file.name.endsWith('.csv')) {
                        const lines = content.split('\n');
                        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                        let addedCount = 0;

                        for (let i = 1; i < lines.length; i++) {
                            if (!lines[i].trim()) continue;
                            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                            const row = {};
                            headers.forEach((h, idx) => row[h] = cols[idx] || '');

                            const lat = parseFloat(row.lat || row.Latitude || row.y);
                            const lng = parseFloat(row.lng || row.Longitude || row.x);

                            if (!isNaN(lat) && !isNaN(lng)) {
                                flagsData.unshift({
                                    id: 'imported-csv-' + Math.random().toString(36).substr(2, 6),
                                    lat: lat,
                                    lng: lng,
                                    neighborhood: row.neighborhood || row.Neighborhood || 'Imported Location',
                                    category: row.category || 'infrastructure',
                                    subtype: row.subtype || 'CSV Flag Record',
                                    severity: row.severity || 'Medium',
                                    status: row.status || 'Open',
                                    source: 'Imported CSV',
                                    description: row.description || row.Address || 'Imported CSV record',
                                    date: row.date || new Date().toISOString().split('T')[0],
                                    upvotes: 1
                                });
                                addedCount++;
                            }
                        }
                        showToast(`Successfully imported ${addedCount} flags from CSV!`, 'success');
                    }
                    renderAllMarkers();
                    updateListAndStats();
                } catch (err) {
                    showToast('Failed to parse uploaded dataset file.', 'error');
                }
            };
            reader.readAsText(file);
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebarDrawer');
            sidebar.classList.toggle('translate-x-full');
        }

        function openTab(tabName) {
            if (currentMapView === 'community') switchMapView('civic');
            const sidebar = document.getElementById('sidebarDrawer');
            if (sidebar.classList.contains('translate-x-full')) {
                sidebar.classList.remove('translate-x-full');
            }
            switchDrawerTab(tabName);
            if (window.matchMedia('(max-width: 1023px)').matches) {
                sidebar.scrollIntoView({ block: 'start', behavior: 'smooth' });
            }
        }

        function openDataTab(category) {
            document.getElementById('filterCategory').value = category;
            openTab('flags');
            applyFilters();
        }

        function switchDrawerTab(tabName) {
            const tabs = ['flags', 'crime', 'shelter', 'proposals'];
            
            tabs.forEach(t => {
                const capitalKey = t.charAt(0).toUpperCase() + t.slice(1);
                const btn = document.getElementById(`tabBtn${capitalKey}`);
                const content = document.getElementById(`tabContent${capitalKey}`);
                
                if (btn) {
                    btn.className = "px-3 py-2 text-xs font-bold rounded-t-lg bg-slate-950 text-slate-400 hover:text-white flex items-center gap-1.5 border-t border-x border-transparent";
                }
                if (content) {
                    content.classList.add('hidden');
                }
            });

            const activeCapitalKey = tabName.charAt(0).toUpperCase() + tabName.slice(1);
            const activeBtn = document.getElementById(`tabBtn${activeCapitalKey}`);
            const activeContent = document.getElementById(`tabContent${activeCapitalKey}`);
            
            if (activeBtn) {
                activeBtn.className = "px-3 py-2 text-xs font-bold rounded-t-lg bg-slate-800 text-amber-400 border-t border-x border-slate-700 flex items-center gap-1.5";
            }
            if (activeContent) {
                activeContent.classList.remove('hidden');
            }
        }

        function toggleAddFlagMode() {
            isAddMode = !isAddMode;
            const banner = document.getElementById('dropModeBanner');
            const mapContainer = document.getElementById('map');
            
            if (isAddMode) {
                banner.classList.remove('hidden');
                if (window.matchMedia('(max-width: 1023px)').matches) {
                    banner.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }
                mapContainer.style.cursor = 'crosshair';
            } else {
                banner.classList.add('hidden');
                mapContainer.style.cursor = '';
            }
        }

        function openAddModal(lat, lng) {
            const isCommunityProposal = currentMapView === 'community';
            const categorySelect = document.getElementById('formCategory');
            [...categorySelect.options].forEach(option => {
                const proposalCategory = ['crime_building', 'community_upgrade', 'shelter_proposal'].includes(option.value);
                option.disabled = isCommunityProposal && !proposalCategory;
                option.hidden = isCommunityProposal && !proposalCategory;
            });
            if (isCommunityProposal) categorySelect.value = 'community_upgrade';
            document.getElementById('proposalModalTitle').textContent = isCommunityProposal
                ? 'Submit a Community Project Proposal'
                : 'Report Location / Submit Proposal Pin';
            document.getElementById('formSubmitter').required = isCommunityProposal;
            document.getElementById('formLat').value = lat;
            document.getElementById('formLng').value = lng;
            document.getElementById('coordsDisplay').innerText = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
            updateSubtypeOptions();
            document.getElementById('addFlagModal').classList.remove('hidden');
        }

        function closeAddModal() {
            document.getElementById('addFlagModal').classList.add('hidden');
            document.getElementById('flagForm').reset();
            document.getElementById('formSubmitter').required = false;
            updateSubtypeOptions();
        }

        function updateSubtypeOptions() {
            const categorySelect = document.getElementById('formCategory');
            if (!categorySelect) return;
            const category = categorySelect.value;
            const subtypeSelect = document.getElementById('formSubtype');
            subtypeSelect.innerHTML = '';
            
            const options = subcategories[category] || [];
            options.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                subtypeSelect.appendChild(opt);
            });
        }

        async function upvoteFlag(id) {
            let item = flagsData.find(f => f.id === id) || suggestedSafetyBuildings.find(b => b.id === id) || suggestedShelters.find(s => s.id === id);
            if (!item) return;
            if (!item.liveDatabase) {
                showToast('This analysis proposal must be imported before live voting is available.', 'info');
                return;
            }
            if (!currentUser) {
                openAuthModal();
                showToast('Sign in to vote on community proposals.', 'info');
                return;
            }
            if (pendingVoteIds.has(id)) return;

            pendingVoteIds.add(id);
            const hadVote = upvotedProposalIds.has(id);
            const request = hadVote
                ? supabaseClient.from('community_pin_votes').delete().eq('pin_id', id).eq('user_id', currentUser.id)
                : supabaseClient.from('community_pin_votes').insert({ pin_id: id, user_id: currentUser.id });
            const { error } = await request;

            if (error) {
                console.error('Unable to update vote', error);
                showToast(error.message, 'error');
            } else {
                await Promise.all([loadCurrentUserVotes(), loadLiveCommunityPins()]);
                showToast(hadVote ? 'Your vote was removed.' : 'Your vote was added.', hadVote ? 'info' : 'success');
            }
            pendingVoteIds.delete(id);
        }

        function applyFilters() {
            renderAllMarkers();
            updateListAndStats();
        }

        function renderTabLists() {
            // Crime Buildings List
            const bList = document.getElementById('crimeBuildingsList');
            document.getElementById('crimeBuildingCount').innerText = suggestedSafetyBuildings.length;
            document.getElementById('buildingBadge').innerText = suggestedSafetyBuildings.length;

            bList.innerHTML = suggestedSafetyBuildings.map(b => `
                <div class="bg-slate-900 border border-purple-500/30 p-3.5 rounded-xl space-y-2 shadow-lg">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                            ${escapeHtml(b.severity)} Priority
                        </span>
                        <span class="text-xs text-amber-400 font-medium"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(b.neighborhood)}</span>
                    </div>
                    <h4 class="font-bold text-sm text-white">${escapeHtml(b.subtype)}</h4>
                    <p class="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">${escapeHtml(b.description)}</p>
                    <div class="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-400">
                        <div><strong class="text-slate-200">Cost:</strong> ${b.costEstimate || 'N/A'}</div>
                        <div><strong class="text-purple-300">Target Impact:</strong> ${b.expectedImpact || 'High'}</div>
                    </div>
                    ${b.conditionRating ? `
                    <div class="text-[11px] bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg text-orange-200">
                        <strong>Condition:</strong> ${escapeHtml(b.conditionRating)}<br>
                        <strong>Need signal:</strong> ${escapeHtml(b.needSignal)}
                    </div>` : ''}
                    <div class="flex items-center justify-between pt-2 border-t border-slate-800">
                        <button onclick="panToCoords(${b.lat}, ${b.lng})" class="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1">
                            <i class="fa-solid fa-crosshairs"></i> Focus Map
                        </button>
                        <button onclick="upvoteFlag('${b.id}')" class="${getVoteButtonClass(b.id)}" aria-pressed="${upvotedProposalIds.has(b.id)}" title="${upvotedProposalIds.has(b.id) ? 'Remove your vote' : 'Support this proposal'}">
                            <i class="${getVoteIconClass(b.id)}"></i> <span>${b.upvotes || 0}</span>
                        </button>
                    </div>
                </div>
            `).join('');

            // Shelter Proposals List
            const sList = document.getElementById('shelterProposalsList');
            document.getElementById('shelterProposalCount').innerText = suggestedShelters.length;
            document.getElementById('shelterBadge').innerText = suggestedShelters.length;

            sList.innerHTML = suggestedShelters.length ? suggestedShelters.map(s => `
                <div class="bg-slate-900 border border-emerald-500/30 p-3.5 rounded-xl space-y-2 shadow-lg">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                            ${escapeHtml(s.severity)} Priority
                        </span>
                        <span class="text-xs text-amber-400 font-medium"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(s.neighborhood)}</span>
                    </div>
                    <h4 class="font-bold text-sm text-white">${escapeHtml(s.subtype)}</h4>
                    <p class="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">${escapeHtml(s.description)}</p>
                    <div class="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-400">
                        <div><strong class="text-slate-200">Capacity:</strong> ${s.bedCapacity || 'N/A'}</div>
                        <div><strong class="text-emerald-300">Transit Access:</strong> ${s.transitAccess || 'Good'}</div>
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t border-slate-800">
                        <button onclick="panToCoords(${s.lat}, ${s.lng})" class="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
                            <i class="fa-solid fa-crosshairs"></i> Focus Map
                        </button>
                        <button onclick="upvoteFlag('${s.id}')" class="${getVoteButtonClass(s.id)}" aria-pressed="${upvotedProposalIds.has(s.id)}" title="${upvotedProposalIds.has(s.id) ? 'Remove your vote' : 'Support this proposal'}">
                            <i class="${getVoteIconClass(s.id)}"></i> <span>${s.upvotes || 0}</span>
                        </button>
                    </div>
                </div>
            `).join('') : '<div class="text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs">No verified shelter dataset has been uploaded.</div>';

            renderCommunityBoard();
        }

        function panToCoords(lat, lng) {
            if (window.matchMedia('(max-width: 1023px)').matches) {
                document.getElementById('map').scrollIntoView({ block: 'start', behavior: 'smooth' });
            }
            map.flyTo([lat, lng], 16, { duration: 1.2 });
            showToast('Focused map view on location', 'info');
        }

        function deployAllBuildingSuggestions() {
            activeSections.safety = true;
            document.getElementById('toggleBuildings').checked = true;
            updateSectionToggleButtons();
            renderAllMarkers();
            showToast('Deployed all community building suggestions to map!', 'success');
        }

        function deployAllShelterSuggestions() {
            if (!suggestedShelters.length) {
                showToast('No verified shelter dataset has been uploaded.', 'info');
                return;
            }
            activeSections.shelter = true;
            document.getElementById('toggleShelterPins').checked = true;
            updateSectionToggleButtons();
            renderAllMarkers();
            showToast('Deployed all homeless shelter proposals to map!', 'success');
        }

        function updateListAndStats() {
            const filtered = getFilteredData();
            const displayed = filtered.slice(0, 200);

            document.getElementById('badgeCount').innerText = formatCompactNumber(dataMetadata.crimeRecordsParsed);
            document.getElementById('vacantBadge').innerText = formatCompactNumber(dataMetadata.vacancyRecords);

            const listContainer = document.getElementById('flagList');
            if (filtered.length === 0) {
                listContainer.innerHTML = '<div class="text-center text-slate-500 py-8 text-xs">No matching records found.</div>';
            } else {
                listContainer.innerHTML = `${filtered.length > displayed.length ? `<div class="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">Showing ${displayed.length.toLocaleString()} of ${filtered.length.toLocaleString()} matching records. Refine the search to narrow the list; pins load as you move the map.</div>` : ''}${displayed.map(item => `
                    <div class="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3 rounded-xl transition shadow-md">
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getSeverityBadgeClass(item.severity)}">
                                ${escapeHtml(item.severity)}
                            </span>
                            <span class="text-[10px] text-slate-400 font-mono">${item.ccNumber ? `${item.category === 'vacant' ? 'VBN ' : 'CC#'}${item.ccNumber}` : item.date}</span>
                        </div>
                        <div class="text-xs font-bold text-slate-100 leading-tight mb-1">${escapeHtml(item.subtype)}</div>
                        <div class="text-[11px] text-amber-400 font-medium mb-1.5"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(item.neighborhood)}</div>
                        <p class="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80 mb-2">${escapeHtml(item.description)}</p>
                        <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                            <button onclick="panToCoords(${item.lat}, ${item.lng})" class="text-slate-400 hover:text-amber-400 flex items-center gap-1 transition">
                                <i class="fa-solid fa-crosshairs"></i> Focus map
                            </button>
                            <div class="flex items-center gap-1.5">
                                ${item.category === 'vacant' ? getNoticeButton(item) : ''}
                                ${getPinActions(item)}
                                <span class="font-semibold text-amber-400">${escapeHtml(item.status)}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}`;
            }

            const total = (dataMetadata.crimeRecordsParsed || 0) + (dataMetadata.vacancyRecords || 0) + suggestedSafetyBuildings.length + suggestedShelters.length;
            const crimeCount = dataMetadata.crimeRecordsParsed || 0;
            const proposalsCount = suggestedSafetyBuildings.length + suggestedShelters.length;

            document.getElementById('statTotal').innerText = total.toLocaleString();
            document.getElementById('statCrime').innerText = crimeCount.toLocaleString();
            document.getElementById('statVacant').innerText = (dataMetadata.vacancyRecords || 0).toLocaleString();
            document.getElementById('statProposals').innerText = proposalsCount.toLocaleString();

            if (document.getElementById('dashboardModal') && !document.getElementById('dashboardModal').classList.contains('hidden')) {
                updateCharts();
            }
        }

        function generateProposalText() {
            const focus = document.getElementById('proposalFocus').value;
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            
            let title = "BALTIMORE CITY CAPITAL IMPROVEMENT & URBAN SAFETY GRANT PROPOSAL";
            if (focus === 'crime') title = "BALTIMORE CRIME REDUCTION & YOUTH FACILITY INVESTMENT PLAN";
            if (focus === 'shelter') title = "BALTIMORE UNHOUSED SHELTER & SUPPORTIVE HOUSING EXPANSION PROPOSAL";
            if (focus === 'vacancy') title = "BALTIMORE VACANT BUILDING REUSE & COMMUNITY INVESTMENT PLAN";

            let proposal = `========================================================================
${title}
Prepared via Baltimore Urban Safety & Infrastructure Intelligence Network
Date: ${dateStr}
Target Authority: Baltimore City Council / MD Department of Housing & Community Development
========================================================================

I. DATA BASIS & EXECUTIVE SUMMARY
This screening proposal uses ${dataMetadata.vacancyRecords?.toLocaleString() || 0} open vacant-building notices and ${dataMetadata.crimeRecordsParsed?.toLocaleString() || 0} complete records parsed from the uploaded NIBRS file. The NIBRS download is incomplete; crime totals are partial and are not population-adjusted rates. Recommendations identify candidates for further community, zoning, ownership, engineering, environmental and financial review.

II. PROPOSED COMMUNITY BUILDINGS & SAFETY INTERVENTIONS
${suggestedSafetyBuildings.map((b, i) => `${i+1}. ${escapeHtml(b.subtype)} (${escapeHtml(b.neighborhood)})
   - Purpose: ${escapeHtml(b.description)}
   - Estimated Capital Cost: ${escapeHtml(b.costEstimate)}
   - Condition / Need Signal: ${b.conditionRating || 'Not rated'}${b.needSignal ? ` — ${escapeHtml(b.needSignal)}` : ''}
   - Anticipated Impact: ${escapeHtml(b.expectedImpact)}`).join('\n\n')}

III. UNHOUSED POPULATION & SHELTER PLACEMENT STRATEGY
${suggestedShelters.length ? suggestedShelters.map((s, i) => `${i+1}. ${escapeHtml(s.subtype)} (${escapeHtml(s.neighborhood)})
   - Rationale: ${escapeHtml(s.description)}
   - Target Capacity: ${s.bedCapacity}
   - Transit Connectivity: ${s.transitAccess}`).join('\n\n') : 'No verified shelter or unhoused-services dataset has been uploaded.'}

IV. VACANCY & PUBLIC SAFETY SCREENING
Open vacant-building notices: ${dataMetadata.vacancyRecords?.toLocaleString() || 0}
Parsed NIBRS records: ${dataMetadata.crimeRecordsParsed?.toLocaleString() || 0} (partial download)
Comparison period: ${dataMetadata.comparisonPeriods?.recent?.join(' through ') || 'Not available'}

V. CONCLUSION & REQUESTED ACTION
We request site-level feasibility review and structured community consultation before any acquisition, funding or construction decision.
`;

            document.getElementById('proposalOutput').value = proposal;
            showToast('Generated City Council & Grant proposal draft!', 'success');
        }

        function copyProposalToClipboard() {
            const text = document.getElementById('proposalOutput').value;
            if (!text) {
                showToast('Please generate a proposal first!', 'error');
                return;
            }
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Proposal copied to clipboard!', 'success');
        }

        function updateCharts() {
            if (typeof Chart === 'undefined') return;

            const ctxCat = document.getElementById('categoryChart');
            if (ctxCat) {
                if (categoryChartInstance) categoryChartInstance.destroy();
                categoryChartInstance = new Chart(ctxCat, {
                    type: 'doughnut',
                    data: {
                        labels: ['NIBRS Records (Partial)', 'Vacant Notices', 'Community Candidates', 'Shelter Proposals'],
                        datasets: [{
                            data: [
                                dataMetadata.crimeRecordsParsed || 0,
                                dataMetadata.vacancyRecords || 0,
                                suggestedSafetyBuildings.length,
                                suggestedShelters.length
                            ],
                            backgroundColor: ['#ef4444', '#f97316', '#a855f7', '#06b6d4'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } }
                    }
                });
            }

            const ctxNeigh = document.getElementById('neighborhoodChart');
            if (ctxNeigh) {
                if (neighborhoodChartInstance) neighborhoodChartInstance.destroy();
                const topNeighborhoods = neighborhoodSummary.slice(0, 6);
                neighborhoodChartInstance = new Chart(ctxNeigh, {
                    type: 'bar',
                    data: {
                        labels: topNeighborhoods.map(item => item.name),
                        datasets: [
                            {
                                label: 'Recent NIBRS records',
                                data: topNeighborhoods.map(item => item.recentCrime),
                                backgroundColor: '#ef4444',
                                borderRadius: 4
                            },
                            {
                                label: 'Open vacant notices',
                                data: topNeighborhoods.map(item => item.vacantBuildings),
                                backgroundColor: '#f97316',
                                borderRadius: 4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { labels: { color: '#94a3b8', font: { size: 9 } } } },
                        scales: {
                            x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } },
                            y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                        }
                    }
                });
            }
        }
