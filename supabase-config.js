/* ==========================================================================
   Grandeur SSCBS - Static Data Engine (Zero External DB Dependencies)
   ========================================================================== */

function getLocalStore(key, defaultData) {
    try {
        const raw = localStorage.getItem('gdb_local_' + key);
        if (raw) return JSON.parse(raw);
    } catch(e) {}
    return defaultData;
}

function setLocalStore(key, data) {
    try {
        localStorage.setItem('gdb_local_' + key, JSON.stringify(data));
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

    // 1. TEAM MEMBERS (Current Active Team)
    async getTeamMembers() {
        const staticTeam = (window.GRANDEUR_STATIC_DATA && window.GRANDEUR_STATIC_DATA.activeTeam) || [];
        return getLocalStore('team_members', staticTeam);
    },

    async insertTeamMember(data) {
        const list = await this.getTeamMembers();
        const newItem = { id: 'tm_' + Date.now(), created_at: new Date().toISOString(), ...data };
        const updated = [newItem, ...list];
        setLocalStore('team_members', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async updateTeamMember(id, data) {
        const list = await this.getTeamMembers();
        const updated = list.map(item => String(item.id) === String(id) ? { ...item, ...data } : item);
        setLocalStore('team_members', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async deleteTeamMember(id) {
        const list = await this.getTeamMembers();
        const updated = list.filter(item => String(item.id) !== String(id));
        setLocalStore('team_members', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    // 2. RECRUITMENT SETTINGS
    async getRecruitment() {
        const staticRec = (window.GRANDEUR_STATIC_DATA && window.GRANDEUR_STATIC_DATA.recruitment) || {
            active: true,
            title: "Grandeur Recruitment Drive 2026",
            description: "Join the premier Consulting & Knowledge Cell of SSCBS.",
            deadline: "August 20, 2026",
            deadline_datetime: "",
            custom_questions: []
        };
        return getLocalStore('recruitment_settings', staticRec);
    },

    async updateRecruitment(data) {
        const current = await this.getRecruitment();
        const updated = { ...current, ...data };
        setLocalStore('recruitment_settings', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    // 3. ANNOUNCEMENTS / BANNER
    async getBanner() {
        return getLocalStore('announcements', { id: 1, active: false, text: '', link: '' });
    },

    async updateBanner(data) {
        setLocalStore('announcements', data);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    // 4. KNOWLEDGE PRIMERS / PUBLICATIONS
    async getKnowledgePrimers() {
        const staticPrimers = (window.GRANDEUR_STATIC_DATA && window.GRANDEUR_STATIC_DATA.primers) || [];
        const list = getLocalStore('knowledge_primers', staticPrimers);
        return sortPrimersByYearDesc(list);
    },

    async insertKnowledgePrimer(data) {
        const list = await this.getKnowledgePrimers();
        const newItem = { id: 'kp_' + Date.now(), created_at: new Date().toISOString(), ...data };
        const updated = [newItem, ...list];
        setLocalStore('knowledge_primers', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async updateKnowledgePrimer(id, data) {
        const list = await this.getKnowledgePrimers();
        const updated = list.map(item => String(item.id) === String(id) ? { ...item, ...data } : item);
        setLocalStore('knowledge_primers', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async deleteKnowledgePrimer(id) {
        const list = await this.getKnowledgePrimers();
        const updated = list.filter(item => String(item.id) !== String(id));
        setLocalStore('knowledge_primers', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    // 5. ACHIEVEMENTS
    async getAchievements() {
        const staticAch = (window.GRANDEUR_STATIC_DATA && window.GRANDEUR_STATIC_DATA.achievements) || [];
        return getLocalStore('achievements', staticAch);
    },

    async insertAchievement(data) {
        const list = await this.getAchievements();
        const newItem = { id: 'ach_' + Date.now(), created_at: new Date().toISOString(), ...data };
        const updated = [newItem, ...list];
        setLocalStore('achievements', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async updateAchievement(id, data) {
        const list = await this.getAchievements();
        const updated = list.map(item => String(item.id) === String(id) ? { ...item, ...data } : item);
        setLocalStore('achievements', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async deleteAchievement(id) {
        const list = await this.getAchievements();
        const updated = list.filter(item => String(item.id) !== String(id));
        setLocalStore('achievements', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    // 6. CONTACT INQUIRIES (INBOX)
    async getContactInquiries() {
        return getLocalStore('contact_inquiries', []);
    },

    async insertContactInquiry(data) {
        const list = await this.getContactInquiries();
        const newItem = { id: 'inq_' + Date.now(), created_at: new Date().toISOString(), ...data };
        const updated = [newItem, ...list];
        setLocalStore('contact_inquiries', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async deleteContactInquiry(id) {
        const list = await this.getContactInquiries();
        const updated = list.filter(item => String(item.id) !== String(id));
        setLocalStore('contact_inquiries', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    // 7. ALUMNI MEMBERS
    async getAlumniMembers() {
        const staticAlumni = (window.GRANDEUR_STATIC_DATA && window.GRANDEUR_STATIC_DATA.alumniMembers) || [];
        return getLocalStore('alumni_members', staticAlumni);
    },

    async insertAlumniMember(data) {
        const list = await this.getAlumniMembers();
        const newItem = { id: 'alm_' + Date.now(), created_at: new Date().toISOString(), ...data, tier: 'board' };
        const updated = [newItem, ...list];
        setLocalStore('alumni_members', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async updateAlumniMember(id, data) {
        const list = await this.getAlumniMembers();
        const updated = list.map(item => String(item.id) === String(id) ? { ...item, ...data, tier: 'board' } : item);
        setLocalStore('alumni_members', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async deleteAlumniMember(id) {
        const list = await this.getAlumniMembers();
        const updated = list.filter(item => String(item.id) !== String(id));
        setLocalStore('alumni_members', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    // 8. RECRUITMENT APPLICATIONS
    async getRecruitmentApplications() {
        return getLocalStore('recruitment_applications', []);
    },

    async insertRecruitmentApplication(data) {
        const list = await this.getRecruitmentApplications();
        const newItem = { id: 'app_' + Date.now(), created_at: new Date().toISOString(), ...data };
        const updated = [newItem, ...list];
        setLocalStore('recruitment_applications', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async deleteRecruitmentApplication(id) {
        const list = await this.getRecruitmentApplications();
        const updated = list.filter(item => String(item.id) !== String(id));
        setLocalStore('recruitment_applications', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async getLiveProjects() {
        const staticLp = (window.GRANDEUR_STATIC_DATA && window.GRANDEUR_STATIC_DATA.liveProjects) || [];
        const local = getLocalStore('live_projects', staticLp);
        if (Array.isArray(local)) {
            return local.map(item => {
                const match = staticLp.find(s => String(s.id) === String(item.id) || (item.title && s.title && String(s.title).toLowerCase() === String(item.title).toLowerCase()));
                if (match && match.logo && !item.logo) {
                    return { ...item, logo: match.logo };
                }
                return item;
            });
        }
        return staticLp;
    },

    async insertLiveProject(data) {
        const list = await this.getLiveProjects();
        const newItem = { id: 'lp_' + Date.now(), created_at: new Date().toISOString(), ...data };
        const updated = [newItem, ...list];
        setLocalStore('live_projects', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async updateLiveProject(id, data) {
        const list = await this.getLiveProjects();
        const updated = list.map(item => String(item.id) === String(id) ? { ...item, ...data } : item);
        setLocalStore('live_projects', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    async deleteLiveProject(id) {
        const list = await this.getLiveProjects();
        const updated = list.filter(item => String(item.id) !== String(id));
        setLocalStore('live_projects', updated);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    },

    // 10. EVENTS
    async getEvents() {
        const staticEvents = (window.GRANDEUR_STATIC_DATA && window.GRANDEUR_STATIC_DATA.events) || [];
        return getLocalStore('events', staticEvents);
    },

    async updateEvents(data) {
        setLocalStore('events', data);
        window.dispatchEvent(new Event('grandeur_store_updated'));
        return true;
    }
};

console.log("⚡ Grandeur Static Local Data Engine loaded (0 External DB Dependencies)");
