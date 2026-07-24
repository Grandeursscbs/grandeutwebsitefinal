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

    // 9. LIVE PROJECTS
    async getLiveProjects() {
        const cached = getSessionCachedData('live_projects');
        if (cached) return cached;
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/live_projects?select=*&order=display_order.asc,created_at.desc`, { headers: READ_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    setSessionCachedData('live_projects', data);
                    try { localStorage.setItem('gdb_fallback_live_projects', JSON.stringify(data)); } catch(e) {}
                    return data;
                }
            }
        } catch(e) {}

        // Fallback to local storage
        try {
            const local = localStorage.getItem('gdb_fallback_live_projects');
            if (local) return JSON.parse(local);
        } catch(e) {}

        return [];
    },

    async insertLiveProject(data) {
        let success = false;
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/live_projects`, {
                method: 'POST',
                headers: WRITE_HEADERS,
                body: JSON.stringify(data)
            });
            if (res.ok) success = true;
        } catch(e) {}

        // Always sync with local storage fallback
        try {
            const local = JSON.parse(localStorage.getItem('gdb_fallback_live_projects') || '[]');
            const newItem = { id: data.id || Date.now(), created_at: new Date().toISOString(), ...data };
            local.unshift(newItem);
            localStorage.setItem('gdb_fallback_live_projects', JSON.stringify(local));
            success = true;
        } catch(e) {}

        window.GrandeurDB.clearCache();
        return success;
    },

    async updateLiveProject(id, data) {
        let success = false;
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/live_projects?id=eq.${id}`, {
                method: 'PATCH',
                headers: WRITE_HEADERS,
                body: JSON.stringify(data)
            });
            if (res.ok) success = true;
        } catch(e) {}

        try {
            let local = JSON.parse(localStorage.getItem('gdb_fallback_live_projects') || '[]');
            local = local.map(item => String(item.id) === String(id) ? { ...item, ...data } : item);
            localStorage.setItem('gdb_fallback_live_projects', JSON.stringify(local));
            success = true;
        } catch(e) {}

        window.GrandeurDB.clearCache();
        return success;
    },

    async deleteLiveProject(id) {
        let success = false;
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/live_projects?id=eq.${id}`, {
                method: 'DELETE',
                headers: WRITE_HEADERS
            });
            if (res.ok) success = true;
        } catch(e) {}

        try {
            let local = JSON.parse(localStorage.getItem('gdb_fallback_live_projects') || '[]');
            local = local.filter(item => String(item.id) !== String(id));
            localStorage.setItem('gdb_fallback_live_projects', JSON.stringify(local));
            success = true;
        } catch(e) {}

        window.GrandeurDB.clearCache();
        return success;
    }
};

console.log("⚡ GrandeurDB Optimized Egress Engine loaded!");

