/* ==========================================================================
   Grandeur SSCBS - Direct Native Supabase Engine (Zero-Dependency REST API)
   Optimized Bandwidth & High Performance Smart Caching Engine
   ========================================================================== */

const SUPABASE_URL = 'https://mtycgxndnaxdusqsvqqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10eWNneG5kbmF4ZHVzcXN2cXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NDU1MDgsImV4cCI6MjEwMDAyMTUwOH0._9CsDcumHsowYMTmzTh-SMcSM9ZexoB7dFhgBsCrNxs';

const READ_HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
};

const WRITE_HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes session TTL

function getSessionCachedData(key) {
    try {
        if (typeof window === 'undefined' || !window.sessionStorage) return null;
        const raw = window.sessionStorage.getItem('gdb_cache_' + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            return parsed.data;
        }
    } catch(e) {}
    return null;
}

function setSessionCachedData(key, data) {
    try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem('gdb_cache_' + key, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        }
    } catch(e) {}
}

function sortPrimersByYearDesc(primers) {
    return (primers || []).sort((a, b) => {
        const extractYear = (p) => {
            const str = String(p.date_label || p.year || '');
            const match = str.match(/\b(20\d\d|19\d\d)\b/);
            if (match) return parseInt(match[1], 10);
            return p.created_at ? new Date(p.created_at).getFullYear() : 0;
        };
        const yearA = extractYear(a);
        const yearB = extractYear(b);
        if (yearB !== yearA) return yearB - yearA;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
    });
}

window.GrandeurDB = {
    clearCache() {
        try {
            ['sessionStorage', 'localStorage'].forEach(st => {
                const store = window[st];
                if (store) {
                    Object.keys(store).forEach(k => {
                        if (k.startsWith('gdb_cache_')) store.removeItem(k);
                    });
                }
            });
        } catch(e) {}
    },

    // 1. TEAM MEMBERS CRUD (Current Team Only)
    async getTeamMembers() {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members?select=id,name,role,tier,photo,linkedin&role=not.ilike.*batch%20of*&order=created_at.asc`, { headers: READ_HEADERS });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const rows = await res.json();
        return (rows || []).filter(m => !m.role || !m.role.toLowerCase().includes('batch of'));
    },

    async insertTeamMember(data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members`, {
            method: 'POST',
            headers: WRITE_HEADERS,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        window.GrandeurDB.clearCache();
        return true;
    },

    async updateTeamMember(id, data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members?id=eq.${id}`, {
            method: 'PATCH',
            headers: WRITE_HEADERS,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        window.GrandeurDB.clearCache();
        return true;
    },

    async deleteTeamMember(id) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members?id=eq.${id}`, {
            method: 'DELETE',
            headers: WRITE_HEADERS
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        window.GrandeurDB.clearCache();
        return true;
    },

    // 2. RECRUITMENT SETTINGS
    async getRecruitment() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/recruitment_settings?select=*&id=eq.1`, { headers: READ_HEADERS });
            if (!res.ok) return null;
            const rows = await res.json();
            return (rows && rows.length > 0) ? rows[0] : null;
        } catch(e) { return null; }
    },

    async updateRecruitment(data) {
        try {
            const payload = { id: 1, ...data };
            let updatedRows = [];
            
            // 1. Try PATCH with return=representation to see if row 1 exists
            let res = await fetch(`${SUPABASE_URL}/rest/v1/recruitment_settings?id=eq.1`, {
                method: 'PATCH',
                headers: { ...READ_HEADERS, 'Prefer': 'return=representation' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                try { updatedRows = await res.json(); } catch(e) {}
            }
            
            // 2. If row 1 did not exist, insert it via POST
            if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
                res = await fetch(`${SUPABASE_URL}/rest/v1/recruitment_settings`, {
                    method: 'POST',
                    headers: { ...READ_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=representation' },
                    body: JSON.stringify(payload)
                });
            }
            
            window.GrandeurDB.clearCache();
            return true;
        } catch(e) {
            console.warn("updateRecruitment error:", e);
            return false;
        }
    },

    // 3. ANNOUNCEMENTS / BANNER
    async getBanner() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/announcements?select=id,text,link,active,created_at`, { headers: READ_HEADERS });
            if (!res.ok) return null;
            const rows = await res.json();
            return rows.length > 0 ? rows[0] : null;
        } catch(e) { return null; }
    },

    async updateBanner(data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/announcements`, {
            method: 'POST',
            headers: { ...WRITE_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({ id: 1, ...data })
        });
        window.GrandeurDB.clearCache();
        return res.ok;
    },

    // 4. KNOWLEDGE PRIMERS / PUBLICATIONS
    async getKnowledgePrimers() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_primers?select=id,title,category,date_label,read_time,pdf_url,created_at&order=created_at.desc`, { headers: READ_HEADERS });
            if (!res.ok) return [];
            const rows = await res.json();
            return sortPrimersByYearDesc(rows);
        } catch(e) { return []; }
    },

    async insertKnowledgePrimer(data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_primers`, {
            method: 'POST',
            headers: WRITE_HEADERS,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        window.GrandeurDB.clearCache();
        return true;
    },

    async updateKnowledgePrimer(id, data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_primers?id=eq.${id}`, {
            method: 'PATCH',
            headers: WRITE_HEADERS,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        window.GrandeurDB.clearCache();
        return true;
    },

    async deleteKnowledgePrimer(id) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_primers?id=eq.${id}`, {
            method: 'DELETE',
            headers: WRITE_HEADERS
        });
        window.GrandeurDB.clearCache();
        return res.ok;
    },

    // 5. ACHIEVEMENTS
    async getAchievements() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/achievements?select=id,event_name,position,year,team_name,created_at&order=created_at.desc`, { headers: READ_HEADERS });
            if (!res.ok) return [];
            return await res.json();
        } catch(e) { return []; }
    },

    async insertAchievement(data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/achievements`, {
            method: 'POST',
            headers: WRITE_HEADERS,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        window.GrandeurDB.clearCache();
        return true;
    },

    async updateAchievement(id, data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/achievements?id=eq.${id}`, {
            method: 'PATCH',
            headers: WRITE_HEADERS,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        window.GrandeurDB.clearCache();
        return true;
    },

    async deleteAchievement(id) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/achievements?id=eq.${id}`, {
            method: 'DELETE',
            headers: WRITE_HEADERS
        });
        window.GrandeurDB.clearCache();
        return res.ok;
    },

    // 6. CONTACT INQUIRIES (INBOX)
    async getContactInquiries() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_inquiries?select=id,name,email,subject,message,created_at&order=created_at.desc`, { headers: READ_HEADERS });
            if (!res.ok) return [];
            return await res.json();
        } catch(e) { return []; }
    },

    async insertContactInquiry(data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_inquiries`, {
            method: 'POST',
            headers: WRITE_HEADERS,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        return true;
    },

    async deleteContactInquiry(id) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_inquiries?id=eq.${id}`, {
            method: 'DELETE',
            headers: WRITE_HEADERS
        });
        return res.ok;
    },

    // 7. ALUMNI MEMBERS (Alumni Only)
    async getAlumniMembers() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members?select=id,name,role,tier,photo,linkedin&role=ilike.*batch%20of*&order=created_at.asc`, { headers: READ_HEADERS });
            if (!res.ok) return [];
            const rows = await res.json();
            return (rows || []).filter(m => m.role && m.role.toLowerCase().includes('batch of'));
        } catch(e) { return []; }
    },

    async insertAlumniMember(data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members`, {
            method: 'POST',
            headers: WRITE_HEADERS,
            body: JSON.stringify({ ...data, tier: 'board' })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        window.GrandeurDB.clearCache();
        return true;
    },

    async updateAlumniMember(id, data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members?id=eq.${id}`, {
            method: 'PATCH',
            headers: WRITE_HEADERS,
            body: JSON.stringify({ ...data, tier: 'board' })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        window.GrandeurDB.clearCache();
        return true;
    },

    async deleteAlumniMember(id) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members?id=eq.${id}`, {
            method: 'DELETE',
            headers: WRITE_HEADERS
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        window.GrandeurDB.clearCache();
        return true;
    },

    // 8. RECRUITMENT APPLICATIONS
    async getRecruitmentApplications() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/recruitment_applications?select=id,full_name,email,phone,course,year,team_preference,answers,created_at&order=created_at.desc`, { headers: READ_HEADERS });
            if (!res.ok) return [];
            return await res.json();
        } catch(e) { return []; }
    },

    async insertRecruitmentApplication(data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/recruitment_applications`, {
            method: 'POST',
            headers: WRITE_HEADERS,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        return true;
    },

    async deleteRecruitmentApplication(id) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/recruitment_applications?id=eq.${id}`, {
            method: 'DELETE',
            headers: WRITE_HEADERS
        });
        return res.ok;
    },

    // 9. LIVE PROJECTS & UNIVERSAL CROSS-DEVICE SYNC ENGINE
    async getLiveProjects() {
        const cached = getSessionCachedData('live_projects');
        if (cached && Array.isArray(cached) && cached.length > 0) return cached;

        const DEFAULT_LIVE_PROJECTS = [
            { id: 'lp_krg', title: 'KRG Consultancy', domain_tag: 'GTM & Market Entry', year: '2026', description: 'Formulated market entry roadmap and strategic expansion plan for enterprise clients in consulting.', logo: 'collab-krg.png' },
            { id: 'lp_honasa', title: 'Honasa Consumer (Mamaearth)', domain_tag: 'Growth Strategy', year: '2025-26', description: 'Analyzed multi-channel customer acquisition tactics, retention metrics, and competitive positioning.', logo: 'collab-honasa.png' },
            { id: 'lp_skilled_sapiens', title: 'Skilled Sapiens', domain_tag: 'Operational Excellence', year: '2025', description: 'Streamlined workflow processes and evaluated strategic partnership opportunities to optimize performance.', logo: 'collab-skilled-sapiens.png' },
            { id: 'lp_upsurge', title: 'Upsurge', domain_tag: 'Financial Advisory', year: '2025', description: 'Developed financial modeling frameworks and valuation assessments for emerging tech platforms.', logo: 'collab-upsurge.png' },
            { id: 'lp_thev', title: 'TheV Consulting', domain_tag: 'Market Research', year: '2024-25', description: 'Executed deep TAM/SAM/SOM market sizing and competitor benchmarking across sectors.', logo: 'collab-thev.png' },
            { id: 'lp_atmoz', title: 'Atmoz', domain_tag: 'Brand Strategy', year: '2024', description: 'Designed GTM positioning and promotional channel strategies for digital growth.', logo: 'collab-atmoz.png' }
        ];

        try {
            const cmsPayload = await getSupabaseCMSPayload();
            if (cmsPayload && Array.isArray(cmsPayload.live_projects) && cmsPayload.live_projects.length > 0) {
                setSessionCachedData('live_projects', cmsPayload.live_projects);
                try { localStorage.setItem('gdb_fallback_live_projects', JSON.stringify(cmsPayload.live_projects)); } catch(e) {}
                return cmsPayload.live_projects;
            }
        } catch(e) {}

        // Fallback to local storage
        try {
            const local = localStorage.getItem('gdb_fallback_live_projects');
            if (local) {
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch(e) {}

        return DEFAULT_LIVE_PROJECTS;
    },

    async insertLiveProject(data) {
        let success = false;
        try {
            const current = await this.getLiveProjects();
            const newItem = { id: data.id || ('lp_' + Date.now()), created_at: new Date().toISOString(), ...data };
            const updated = [newItem, ...current.filter(i => String(i.id) !== String(newItem.id))];
            
            success = await updateSupabaseCMSPayload({ live_projects: updated });
            try { localStorage.setItem('gdb_fallback_live_projects', JSON.stringify(updated)); } catch(e) {}
        } catch(e) {}

        window.GrandeurDB.clearCache();
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return success;
    },

    async updateLiveProject(id, data) {
        let success = false;
        try {
            const current = await this.getLiveProjects();
            const updated = current.map(item => String(item.id) === String(id) ? { ...item, ...data } : item);
            
            success = await updateSupabaseCMSPayload({ live_projects: updated });
            try { localStorage.setItem('gdb_fallback_live_projects', JSON.stringify(updated)); } catch(e) {}
        } catch(e) {}

        window.GrandeurDB.clearCache();
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return success;
    },

    async deleteLiveProject(id) {
        let success = false;
        try {
            const current = await this.getLiveProjects();
            const updated = current.filter(item => String(item.id) !== String(id));
            
            success = await updateSupabaseCMSPayload({ live_projects: updated });
            try { localStorage.setItem('gdb_fallback_live_projects', JSON.stringify(updated)); } catch(e) {}
        } catch(e) {}

        window.GrandeurDB.clearCache();
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return success;
    },

    // 10. EVENTS (WHAT WE DO) CRUD & FALLBACK ENGINE
    async getEvents() {
        const cached = getSessionCachedData('events');
        if (cached && Array.isArray(cached) && cached.length > 0) return cached;
        
        const DEFAULT_EVENTS = [
            {
                id: 'invicta',
                title: 'INVICTA',
                tagline: 'Flagship Case Competition',
                description: "Grandeur's premier national case study competition bringing together sharp business minds from across top universities to solve complex corporate and strategic challenges.",
                slides: [
                    { image: 'invicta-1.jpg', badge: 'Annual Flagship Event', title: "INVICTA '26", sub: 'National Case Competition' },
                    { image: 'invicta-2.jpg', badge: 'Annual Flagship Event', title: '1,500+ Participants', sub: 'Top B-Schools & DU Circuit' },
                    { image: 'invicta-1.jpg', badge: 'Annual Flagship Event', title: 'Cash Prizes & Goodies', sub: 'Evaluated by Industry Experts' }
                ]
            },
            {
                id: 'echelon',
                title: 'Echelon',
                tagline: 'The Simulation Challenge',
                description: 'An annual summit featuring keynote addresses from partner consultants, interactive strategy workshops, and high-impact corporate networking for aspiring business strategists.',
                slides: [
                    { image: 'echelon-1.jpg', badge: 'Crescendo Event', title: 'ECHELON', sub: 'Strategic Leadership Convention' },
                    { image: 'echelon-2.jpg', badge: 'Crescendo Event', title: 'Industry Stalwarts', sub: 'Leaders from MBB & Big4' },
                    { image: 'echelon-1.jpg', badge: 'Crescendo Event', title: 'Executive Mixers', sub: 'Connect with Industry Mentors' }
                ]
            },
            {
                id: 'ranneeti',
                title: 'Ranneeti',
                tagline: 'Intra-College Direct PI Competition',
                description: 'The premier strategy battleground designed to hone analytical thinking, GTM formulation, and presentation skills through live corporate case simulations and peer challenges.',
                slides: [
                    { image: '', gradient: 'gradient-ranneeti-1', badge: 'Pre-Recruitment Event', title: 'RANNEETI', sub: 'Intra-College Strategy Battle' },
                    { image: '', gradient: 'gradient-ranneeti-2', badge: 'Pre-Recruitment Event', title: 'Market Entry Pitch', sub: 'Real-World Case Simulations' },
                    { image: '', gradient: 'gradient-ranneeti-3', badge: 'Pre-Recruitment Event', title: '1-on-1 Feedback', sub: 'Guidance from Senior Consultants' }
                ]
            }
        ];

        try {
            const cmsPayload = await getSupabaseCMSPayload();
            if (cmsPayload && Array.isArray(cmsPayload.events) && cmsPayload.events.length > 0) {
                setSessionCachedData('events', cmsPayload.events);
                try { localStorage.setItem('gdb_fallback_events', JSON.stringify(cmsPayload.events)); } catch(e) {}
                return cmsPayload.events;
            }
        } catch(e) {}

        // Fallback to Local Storage
        try {
            const local = localStorage.getItem('gdb_fallback_events');
            if (local) {
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch(e) {}

        return DEFAULT_EVENTS;
    },

    async updateEvents(data) {
        let success = false;
        const payloadStr = JSON.stringify(data);

        try {
            success = await updateSupabaseCMSPayload({ events: data });
        } catch(e) {}

        try {
            localStorage.setItem('gdb_fallback_events', payloadStr);
            const store = JSON.parse(localStorage.getItem('grandeur_admin_store') || '{}');
            store.events = data;
            localStorage.setItem('grandeur_admin_store', JSON.stringify(store));
        } catch(e) {}

        window.GrandeurDB.clearCache();
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return success;
    }
};

// Global Supabase CMS Payload Engine Helpers
async function getSupabaseCMSPayload() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/recruitment_settings?select=form_url&id=eq.1`, { headers: READ_HEADERS });
        if (res.ok) {
            const rows = await res.json();
            if (rows && rows.length > 0 && rows[0].form_url) {
                try {
                    const parsed = JSON.parse(rows[0].form_url);
                    if (parsed && typeof parsed === 'object') return parsed;
                } catch(e) {}
            }
        }
    } catch(e) {}
    return null;
}

async function updateSupabaseCMSPayload(storeUpdate) {
    try {
        let currentStore = (await getSupabaseCMSPayload()) || {};
        const updatedStore = { ...currentStore, ...storeUpdate };
        const res = await fetch(`${SUPABASE_URL}/rest/v1/recruitment_settings?id=eq.1`, {
            method: 'PATCH',
            headers: { ...WRITE_HEADERS, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ form_url: JSON.stringify(updatedStore) })
        });
        return res.ok;
    } catch(e) {
        return false;
    }
}

console.log("⚡ GrandeurDB Optimized Egress Engine loaded!");



