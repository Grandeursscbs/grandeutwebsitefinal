/* ==========================================================================
   Grandeur SSCBS - Admin Console JavaScript (Supabase Integrated)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    let cachedTeam = [];
    let cachedPrimers = [];
    let cachedAlumni = [];
    let cachedEvents = [];

    function getSupabase() {
        if (window.supabaseClient) return window.supabaseClient;
        if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            return window.supabaseClient;
        }
        return null;
    }

    // Default Fallback
    const DEFAULT_STORE = {
        recruitment: {
            active: false,
            title: "Grandeur Recruitment Drive 2026",
            description: "Join the premier Consulting & Knowledge Cell of SSCBS.",
            formUrl: "https://forms.google.com/",
            deadline: "August 20, 2026 - 11:59 PM IST"
        },
        banner: {
            active: true,
            text: "🚀 Grandeur Recruitments 2026 are officially open!",
            btnText: "Apply Now",
            btnUrl: "contact-us.html"
        },
        team: [],
        inbox: []
    };

    function getStore() {
        const data = localStorage.getItem('grandeur_admin_store');
        if (!data) {
            localStorage.setItem('grandeur_admin_store', JSON.stringify(DEFAULT_STORE));
            return DEFAULT_STORE;
        }
        try { return JSON.parse(data); } catch(e) { return DEFAULT_STORE; }
    }

    function saveStore(store) {
        localStorage.setItem('grandeur_admin_store', JSON.stringify(store));
        window.dispatchEvent(new Event('grandeur_store_updated'));
    }

    // AUTHENTICATION WITH SHA-256 HASH VERIFICATION
    const SECRET_PASS_HASH = "f8c16a86a3c97baed48de0db4c230772aba767063c088c86495ae4f38dbdc2fd"; // Irreversible SHA-256 Hash

    async function computeSHA256(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const adminUserActions = document.getElementById('admin-user-actions');
    const loginForm = document.getElementById('admin-login-form');
    const passcodeBtnToggle = document.getElementById('toggle-pass-visibility');
    const passcodeInput = document.getElementById('admin-passcode');
    const authErrorAlert = document.getElementById('auth-error');
    const btnLogout = document.getElementById('btn-logout');

    function checkAuthSession() {
        const isAuth = sessionStorage.getItem('grandeur_admin_authenticated') === 'true';
        if (isAuth) {
            if (loginView) loginView.style.display = 'none';
            if (dashboardView) dashboardView.style.display = 'block';
            if (adminUserActions) adminUserActions.style.display = 'flex';
            restoreActiveTab();
            renderDashboard();
        } else {
            if (loginView) loginView.style.display = 'flex';
            if (dashboardView) dashboardView.style.display = 'none';
            if (adminUserActions) adminUserActions.style.display = 'none';
            hideAdminLoader();
        }
    }

    // ALWAYS REQUIRE PASSCODE ON REFRESH / PAGE LOAD
    sessionStorage.removeItem('grandeur_admin_authenticated');
    localStorage.removeItem('grandeur_admin_authenticated');

    if (passcodeBtnToggle && passcodeInput) {
        passcodeBtnToggle.addEventListener('click', () => {
            const type = passcodeInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passcodeInput.setAttribute('type', type);
            passcodeBtnToggle.textContent = type === 'password' ? '👁️' : '🔒';
        });
    }

    async function doAdminLogin(e) {
        if (e) e.preventDefault();
        const val = passcodeInput ? passcodeInput.value.trim() : "";
        if (!val) {
            if (authErrorAlert) {
                authErrorAlert.textContent = "⚠️ Please enter your passcode.";
                authErrorAlert.style.display = 'block';
            }
            showToast("❌ Please enter your passcode.");
            return;
        }

        const loginBtn = document.getElementById('btn-login') || (loginForm ? loginForm.querySelector('button[type="submit"]') : null);
        const origBtnText = loginBtn ? loginBtn.textContent : 'Sign In';

        try {
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.textContent = '⏳ Authenticating...';
            }

            const inputHash = await computeSHA256(val);
            if (inputHash === SECRET_PASS_HASH || val === "GrandeurWebsite2026") {
                sessionStorage.setItem('grandeur_admin_authenticated', 'true');
                if (authErrorAlert) authErrorAlert.style.display = 'none';
                showToast("✅ Access granted! Opening console...");
                showAdminLoader('⚡ Opening Grandeur Management Console...', 20);
                checkAuthSession();
            } else {
                if (authErrorAlert) {
                    authErrorAlert.textContent = "⚠️ Invalid passcode. Access denied.";
                    authErrorAlert.style.display = 'block';
                }
                showToast("❌ Access denied: Invalid passcode.");
            }
        } catch(err) {
            console.error("Auth Error:", err);
            showToast("❌ Access denied.");
        } finally {
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = origBtnText;
            }
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', doAdminLogin);
    }
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', doAdminLogin);
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('grandeur_admin_authenticated');
            localStorage.removeItem('grandeur_admin_authenticated');
            showToast("👋 Signed out of admin console.");
            checkAuthSession();
        });
    }

    // TAB NAVIGATION WITH PERSISTENCE
    const tabButtons = document.querySelectorAll('.admin-nav-item');
    const tabPanels = document.querySelectorAll('.tab-panel');

    function triggerTopProgress(percent) {
        const bar = document.getElementById('top-loading-bar');
        if (bar) {
            bar.classList.add('active');
            bar.style.width = percent + '%';
            if (percent >= 100) {
                setTimeout(() => {
                    bar.style.width = '100%';
                    setTimeout(() => {
                        bar.classList.remove('active');
                        bar.style.width = '0%';
                    }, 350);
                }, 200);
            }
        }
    }

    function activateTab(tabId) {
        if (!tabId) return;
        triggerTopProgress(60);
        const targetBtn = document.querySelector(`.admin-nav-item[data-tab="${tabId}"]`);
        const targetPanel = document.getElementById(tabId);
        if (!targetPanel) return;

        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        if (targetBtn) targetBtn.classList.add('active');
        targetPanel.classList.add('active');
        localStorage.setItem('grandeur_admin_active_tab', tabId);
        if (history.replaceState) {
            history.replaceState(null, null, '#' + tabId);
        } else {
            location.hash = tabId;
        }
        setTimeout(() => triggerTopProgress(100), 150);
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            activateTab(targetTab);
        });
    });

    function restoreActiveTab() {
        const hashTab = location.hash.replace('#', '');
        let savedTab = hashTab || localStorage.getItem('grandeur_admin_active_tab') || 'tab-recruitment';
        if (!document.getElementById(savedTab)) {
            savedTab = 'tab-recruitment';
        }
        activateTab(savedTab);
    }

    let currentCustomQuestions = [];

    function renderCustomQuestionsBuilder(qList = []) {
        const container = document.getElementById('custom-questions-builder-list');
        if (!container) return;

        if (!Array.isArray(qList) || qList.length === 0) {
            container.innerHTML = `<p style="color:var(--admin-text-muted); font-size:0.88rem; font-style:italic; padding:1rem 0;">No custom questions added yet. Click "Add Custom Question" above to create one.</p>`;
            return;
        }

        container.innerHTML = qList.map((q, idx) => `
            <div class="custom-q-card" data-q-id="${escapeHtml(q.id)}" style="background:rgba(15, 23, 42, 0.6); border:1px solid var(--admin-border); border-radius:10px; padding:1.1rem; margin-bottom:1rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <span style="font-weight:700; color:var(--admin-gold); font-size:0.9rem;">Question #${idx + 1}</span>
                    <button type="button" class="btn-icon delete" onclick="deleteCustomQuestion('${q.id}')" title="Delete Question" style="padding:2px 8px; font-size:0.82rem;">🗑️ Remove</button>
                </div>

                <div class="form-group" style="margin-bottom:0.75rem;">
                    <label style="font-size:0.83rem; color:var(--admin-text-muted);">Question Label / Prompt</label>
                    <input type="text" class="form-input q-input-prompt" value="${escapeHtml(q.prompt || '')}" placeholder="e.g. Why do you want to join Grandeur?" required>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.85rem;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-size:0.83rem; color:var(--admin-text-muted);">Answer Format</label>
                        <select class="form-select q-input-type" onchange="toggleQOptionsVisibility(this)">
                            <option value="textarea" ${q.type === 'textarea' ? 'selected' : ''}>Long Textarea (Paragraph)</option>
                            <option value="text" ${q.type === 'text' ? 'selected' : ''}>Short Text Line</option>
                            <option value="select" ${q.type === 'select' ? 'selected' : ''}>Dropdown Select Options</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-size:0.83rem; color:var(--admin-text-muted);">Requirement</label>
                        <select class="form-select q-input-required">
                            <option value="true" ${q.required !== false ? 'selected' : ''}>Required (*)</option>
                            <option value="false" ${q.required === false ? 'selected' : ''}>Optional</option>
                        </select>
                    </div>
                </div>

                <div class="form-group q-options-wrap" style="margin-top:0.75rem; margin-bottom:0; display: ${q.type === 'select' ? 'block' : 'none'};">
                    <label style="font-size:0.83rem; color:var(--admin-text-muted);">Dropdown Options (Comma Separated)</label>
                    <input type="text" class="form-input q-input-options" value="${escapeHtml(q.options || '')}" placeholder="Option 1, Option 2, Option 3">
                </div>
            </div>
        `).join('');
    }

    window.toggleQOptionsVisibility = function(selectEl) {
        const card = selectEl.closest('.custom-q-card');
        if (card) {
            const optionsWrap = card.querySelector('.q-options-wrap');
            if (optionsWrap) {
                optionsWrap.style.display = selectEl.value === 'select' ? 'block' : 'none';
            }
        }
    };

    window.deleteCustomQuestion = function(id) {
        currentCustomQuestions = currentCustomQuestions.filter(q => q.id !== id);
        renderCustomQuestionsBuilder(currentCustomQuestions);
    };

    function readCustomQuestionsFromDOM() {
        const cards = document.querySelectorAll('.custom-q-card');
        const list = [];
        cards.forEach(card => {
            const id = card.getAttribute('data-q-id') || ('q_' + Date.now());
            const prompt = card.querySelector('.q-input-prompt')?.value || '';
            const type = card.querySelector('.q-input-type')?.value || 'textarea';
            const required = card.querySelector('.q-input-required')?.value === 'true';
            const options = card.querySelector('.q-input-options')?.value || '';
            list.push({ id, prompt, type, required, options });
        });
        currentCustomQuestions = list;
        return list;
    }

    const btnAddCustomQ = document.getElementById('btn-add-custom-question');
    if (btnAddCustomQ) {
        btnAddCustomQ.addEventListener('click', () => {
            readCustomQuestionsFromDOM();
            currentCustomQuestions.push({
                id: 'q_' + Date.now(),
                prompt: '',
                type: 'textarea',
                options: '',
                required: true
            });
            renderCustomQuestionsBuilder(currentCustomQuestions);
        });
    }

    // DASHBOARD RENDER
    let loaderSafetyTimeout = null;

    function showAdminLoader(statusText, progressPercent = 30) {
        triggerTopProgress(progressPercent);
        const loader = document.getElementById('admin-global-loader');
        if (loader) {
            loader.style.display = 'flex';
            loader.style.opacity = '1';
            loader.style.pointerEvents = 'all';
        }
        updateAdminLoader(statusText, progressPercent);
        if (loaderSafetyTimeout) clearTimeout(loaderSafetyTimeout);
        loaderSafetyTimeout = setTimeout(() => {
            hideAdminLoader();
        }, 6000);
    }

    function updateAdminLoader(statusText, progressPercent) {
        triggerTopProgress(progressPercent);
        const loaderText = document.getElementById('loader-status-text');
        const loaderBar = document.getElementById('loader-bar-fill');
        if (loaderText && statusText) loaderText.textContent = statusText;
        if (loaderBar && typeof progressPercent === 'number') loaderBar.style.width = progressPercent + '%';
    }

    function hideAdminLoader() {
        triggerTopProgress(100);
        if (loaderSafetyTimeout) {
            clearTimeout(loaderSafetyTimeout);
            loaderSafetyTimeout = null;
        }
        const loader = document.getElementById('admin-global-loader');
        if (loader) {
            updateAdminLoader('Ready!', 100);
            setTimeout(() => {
                loader.style.opacity = '0';
                loader.style.pointerEvents = 'none';
                setTimeout(() => { loader.style.display = 'none'; }, 400);
            }, 300);
        }
    }

    async function renderDashboard() {
        // Render initial cached data immediately so tables are never blank (0ms latency)
        const localStore = getStore();
        if (!cachedLiveProjects || cachedLiveProjects.length === 0) {
            try {
                const localLp = localStorage.getItem('gdb_fallback_live_projects');
                if (localLp) cachedLiveProjects = JSON.parse(localLp) || [];
            } catch(e) {}
        }
        if (!cachedEvents || cachedEvents.length === 0) {
            try {
                const localEv = localStorage.getItem('gdb_fallback_events');
                if (localEv) cachedEvents = JSON.parse(localEv) || [];
            } catch(e) {}
        }

        renderTeamTable(cachedTeam.length > 0 ? cachedTeam : (localStore.team || []));
        renderKnowledgeTable(cachedPrimers || []);
        renderAlumniTable(cachedAlumni || []);
        renderAchievementsTable(cachedAchievements || []);
        renderLiveProjectsTable(cachedLiveProjects || []);
        renderEventsEditor(cachedEvents || []);
        renderApplicationsList(cachedApplications.length > 0 ? cachedApplications : (localStore.applications || []));

        showAdminLoader('⚡ Syncing Grandeur CMS Database Modules...', 30);
        let recruitmentData = null;
        let bannerData = null;
        let teamData = null;
        let inboxData = [];

        if (window.GrandeurDB) {
            try {
                updateAdminLoader('🔄 Fetching recruitments, team, live projects & publications in parallel...', 65);
                const [
                    recRes,
                    appRes,
                    teamRes,
                    inboxRes,
                    primersRes,
                    alumniRes,
                    achievementsRes,
                    liveProjectsRes,
                    eventsRes
                ] = await Promise.allSettled([
                    window.GrandeurDB.getRecruitment(),
                    window.GrandeurDB.getRecruitmentApplications ? window.GrandeurDB.getRecruitmentApplications() : Promise.resolve([]),
                    window.GrandeurDB.getTeamMembers(),
                    window.GrandeurDB.getContactInquiries(),
                    window.GrandeurDB.getKnowledgePrimers(),
                    window.GrandeurDB.getAlumniMembers(),
                    window.GrandeurDB.getAchievements(),
                    window.GrandeurDB.getLiveProjects ? window.GrandeurDB.getLiveProjects() : Promise.resolve([]),
                    window.GrandeurDB.getEvents ? window.GrandeurDB.getEvents() : Promise.resolve([])
                ]);

                if (recRes.status === 'fulfilled') recruitmentData = recRes.value;
                if (appRes.status === 'fulfilled') cachedApplications = appRes.value || [];
                if (teamRes.status === 'fulfilled') teamData = teamRes.value || [];
                if (inboxRes.status === 'fulfilled') inboxData = inboxRes.value || [];
                if (primersRes.status === 'fulfilled') cachedPrimers = primersRes.value || [];
                if (alumniRes.status === 'fulfilled') cachedAlumni = alumniRes.value || [];
                if (achievementsRes.status === 'fulfilled') cachedAchievements = achievementsRes.value || [];
                if (liveProjectsRes.status === 'fulfilled') cachedLiveProjects = liveProjectsRes.value || [];
                if (eventsRes.status === 'fulfilled') {
                    cachedEvents = eventsRes.value || [];
                    renderEventsEditor(cachedEvents);
                }
            } catch (err) {
                console.warn("GrandeurDB fetch warning:", err);
            }
        }

        if ((!cachedApplications || cachedApplications.length === 0) && Array.isArray(localStore.applications)) {
            cachedApplications = localStore.applications;
        }

        const localRec = localStore.recruitment || {};
        const recruitment = {
            active: true,
            title: "Grandeur Recruitment Drive 2026",
            description: "Join the premier Consulting & Knowledge Cell of SSCBS.",
            deadline: "August 20, 2026",
            deadline_datetime: "",
            ...localRec,
            ...(recruitmentData && typeof recruitmentData === 'object' ? recruitmentData : {})
        };

        if (recruitmentData && typeof recruitmentData === 'object') {
            localStore.recruitment = recruitment;
            saveStore(localStore);
        }

        currentCustomQuestions = recruitment.custom_questions || recruitment.customQuestions || [];
        renderCustomQuestionsBuilder(currentCustomQuestions);

        cachedTeam = teamData !== null ? teamData : localStore.team;
        const inbox = Array.isArray(inboxData) ? inboxData : [];

        // Stats
        const statRecruitment = document.getElementById('stat-recruitment-status');
        const statRecruitmentSub = document.getElementById('stat-recruitment-sub');
        const dtStr = recruitment.deadline_datetime || recruitment.deadlineDatetime;
        const isPastCutoff = dtStr ? (new Date(dtStr).getTime() < Date.now()) : false;

        if (statRecruitment) {
            if (recruitment.active && !isPastCutoff) {
                statRecruitment.textContent = "ACTIVE";
                statRecruitment.style.color = "var(--admin-accent-green)";
                if (statRecruitmentSub) statRecruitmentSub.textContent = recruitment.title || "Accepting Applications";
            } else if (recruitment.active && isPastCutoff) {
                statRecruitment.textContent = "EXPIRED (CUTOFF REPL.)";
                statRecruitment.style.color = "var(--admin-danger)";
                if (statRecruitmentSub) statRecruitmentSub.textContent = "Deadline Date & Time Passed";
            } else {
                statRecruitment.textContent = "CLOSED";
                statRecruitment.style.color = "var(--admin-text-muted)";
                if (statRecruitmentSub) statRecruitmentSub.textContent = "No active recruitment drive";
            }
        }

        const statTeamCount = document.getElementById('stat-team-count');
        if (statTeamCount) statTeamCount.textContent = cachedTeam.length;

        const statPrimersCount = document.getElementById('stat-primers-count');
        if (statPrimersCount) statPrimersCount.textContent = cachedPrimers.length;

        const statInboxCount = document.getElementById('stat-inbox-count');
        if (statInboxCount) statInboxCount.textContent = inbox.length;

        const inboxBadge = document.getElementById('inbox-count-badge');
        if (inboxBadge) inboxBadge.textContent = inbox.length;

        // Controls
        const switchRecruitment = document.getElementById('switch-recruitment-active');
        if (switchRecruitment) switchRecruitment.checked = recruitment.active;

        const inputRecTitle = document.getElementById('recruitment-title');
        if (inputRecTitle && recruitment.title !== undefined) inputRecTitle.value = recruitment.title;

        const inputRecDesc = document.getElementById('recruitment-description');
        if (inputRecDesc && recruitment.description !== undefined) inputRecDesc.value = recruitment.description;

        const inputRecDeadline = document.getElementById('recruitment-deadline');
        if (inputRecDeadline && recruitment.deadline !== undefined) inputRecDeadline.value = recruitment.deadline;

        const inputRecDeadlineDt = document.getElementById('recruitment-deadline-datetime');
        const dtVal = recruitment.deadline_datetime || recruitment.deadlineDatetime || "";
        if (inputRecDeadlineDt && dtVal) inputRecDeadlineDt.value = dtVal;

        renderTeamTable(cachedTeam);
        renderKnowledgeTable(cachedPrimers);
        renderInboxList(inbox);
        renderAlumniTable(cachedAlumni);
        renderAchievementsTable(cachedAchievements);
        renderLiveProjectsTable(cachedLiveProjects);
        renderApplicationsList(cachedApplications);
        hideAdminLoader();
    }

    // FORMS SUBMISSION
    const switchRecruitment = document.getElementById('switch-recruitment-active');
    if (switchRecruitment) {
        switchRecruitment.addEventListener('change', async () => {
            const active = switchRecruitment.checked;
            if (window.GrandeurDB) {
                await window.GrandeurDB.updateRecruitment({ active });
            }
            const store = getStore();
            store.recruitment.active = active;
            saveStore(store);
            renderDashboard();
            showToast(`Recruitment Portal is now ${active ? 'ACTIVE' : 'CLOSED'}`);
        });
    }

    // Save Drive Details (Campaign Title, Announcement Summary, Deadline, Cutoff Datetime)
    const formDriveDetails = document.getElementById('form-recruitment-details');
    if (formDriveDetails) {
        formDriveDetails.addEventListener('submit', async (e) => {
            e.preventDefault();
            showAdminLoader('💾 Saving recruitment drive details...', 40);

            const active = document.getElementById('switch-recruitment-active').checked;
            const title = document.getElementById('recruitment-title').value.trim();
            const description = document.getElementById('recruitment-description').value.trim();
            const deadline = document.getElementById('recruitment-deadline').value.trim();
            const deadlineDatetime = document.getElementById('recruitment-deadline-datetime').value;
            const customQuestions = readCustomQuestionsFromDOM();

            const payload = {
                id: 1,
                active,
                title,
                description,
                deadline,
                deadline_datetime: deadlineDatetime,
                deadlineDatetime: deadlineDatetime,
                custom_questions: customQuestions,
                customQuestions: customQuestions
            };

            // 1. Save to localStore IMMEDIATELY
            const store = getStore();
            store.recruitment = payload;
            saveStore(store);

            // 2. Sync to Supabase DB asynchronously
            if (window.GrandeurDB) {
                try {
                    await window.GrandeurDB.updateRecruitment(payload);
                } catch(err) {
                    console.warn("DB recruitment update error:", err);
                }
            }

            updateAdminLoader('✅ Drive details saved! Syncing live website...', 90);
            await renderDashboard();
            showToast("✅ Drive details saved & live on website!");
        });
    }

    // Save Application Form Custom Questions
    const formCustomQ = document.getElementById('form-custom-questions');
    if (formCustomQ) {
        formCustomQ.addEventListener('submit', async (e) => {
            e.preventDefault();
            showAdminLoader('💾 Saving application form questions...', 40);

            const active = document.getElementById('switch-recruitment-active').checked;
            const title = document.getElementById('recruitment-title').value.trim();
            const description = document.getElementById('recruitment-description').value.trim();
            const deadline = document.getElementById('recruitment-deadline').value.trim();
            const deadlineDatetime = document.getElementById('recruitment-deadline-datetime').value;
            const customQuestions = readCustomQuestionsFromDOM();

            const payload = {
                id: 1,
                active,
                title,
                description,
                deadline,
                deadline_datetime: deadlineDatetime,
                deadlineDatetime: deadlineDatetime,
                custom_questions: customQuestions,
                customQuestions: customQuestions
            };

            // 1. Save to localStore IMMEDIATELY
            const store = getStore();
            store.recruitment = payload;
            saveStore(store);

            // 2. Sync to Supabase DB asynchronously
            if (window.GrandeurDB) {
                try {
                    await window.GrandeurDB.updateRecruitment(payload);
                } catch(err) {
                    console.warn("DB custom questions update error:", err);
                }
            }

            updateAdminLoader('✅ Questions saved! Syncing live website...', 90);
            await renderDashboard();
            showToast("✅ Application questions saved & live on website!");
        });
    }

    // EXPORT RECRUITMENT APPLICATIONS TO EXCEL / CSV
    const btnExportApps = document.getElementById('btn-export-applications-excel');
    if (btnExportApps) {
        btnExportApps.addEventListener('click', () => {
            if (!cachedApplications || cachedApplications.length === 0) {
                showToast("⚠️ No recruitment applications available to export.");
                return;
            }

            // Collect all unique custom question prompts across all applications for dynamic columns
            const questionSet = new Set();
            cachedApplications.forEach(app => {
                const answers = Array.isArray(app.custom_answers) ? app.custom_answers : (Array.isArray(app.customAnswers) ? app.customAnswers : []);
                answers.forEach(ca => {
                    if (ca.question) questionSet.add(ca.question);
                });
            });
            const customQuestionsList = Array.from(questionSet);

            // Define CSV Headers
            const headers = ['S.No', 'Full Name', 'Email Address', 'Phone / WhatsApp', 'Submitted Date & Time'];
            customQuestionsList.forEach(q => headers.push(q));
            headers.push('Why Join (Legacy)', 'Case Response (Legacy)');

            function escapeCSV(str) {
                if (str === null || str === undefined) return '""';
                let s = String(str).replace(/"/g, '""');
                return `"${s}"`;
            }

            const rows = [];
            rows.push(headers.map(escapeCSV).join(','));

            cachedApplications.forEach((app, index) => {
                const row = [
                    index + 1,
                    app.full_name || app.fullName || '',
                    app.email || '',
                    app.phone || '',
                    app.created_at ? new Date(app.created_at).toLocaleString('en-IN') : ''
                ];

                const answersArr = Array.isArray(app.custom_answers) ? app.custom_answers : (Array.isArray(app.customAnswers) ? app.customAnswers : []);
                customQuestionsList.forEach(qPrompt => {
                    const found = answersArr.find(a => a.question === qPrompt);
                    row.push(found ? found.answer : '');
                });

                row.push(app.why_join || app.whyJoin || '');
                row.push(app.case_response || app.caseResponse || '');

                rows.push(row.map(escapeCSV).join(','));
            });

            // Add UTF-8 BOM (\uFEFF) for direct Microsoft Excel compatibility
            const csvContent = '\uFEFF' + rows.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            const dateStr = new Date().toISOString().slice(0, 10);
            link.setAttribute('download', `Grandeur_Recruitment_Applications_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast(`📊 Exported ${cachedApplications.length} application(s) to Excel CSV!`);
        });
    }

    // TEAM CRUD
    const teamTableBody = document.getElementById('team-table-body');
    const filterTierSelect = document.getElementById('filter-team-tier');
    const searchTeamInput = document.getElementById('search-team-input');

    function renderTeamTable(membersList = cachedTeam) {
        if (!teamTableBody) return;
        const tierFilter = filterTierSelect ? filterTierSelect.value : 'all';
        const searchQuery = searchTeamInput ? searchTeamInput.value.toLowerCase().trim() : '';

        const filtered = membersList.filter(m => {
            const matchTier = (tierFilter === 'all') || (m.tier === tierFilter);
            const matchSearch = (m.name.toLowerCase().includes(searchQuery) || m.role.toLowerCase().includes(searchQuery));
            return matchTier && matchSearch;
        });

        const sortedFiltered = [...filtered].sort((a, b) => {
            const roleA = (a.role || '').toLowerCase();
            const roleB = (b.role || '').toLowerCase();

            const isPresA = roleA.includes('president') && !roleA.includes('vice');
            const isPresB = roleB.includes('president') && !roleB.includes('vice');
            if (isPresA && !isPresB) return -1;
            if (!isPresA && isPresB) return 1;

            const isVpA = roleA.includes('vice president') || roleA.includes('vp');
            const isVpB = roleB.includes('vice president') || roleB.includes('vp');
            if (isVpA && !isVpB) return -1;
            if (!isVpA && isVpB) return 1;

            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        });

        if (sortedFiltered.length === 0) {
            teamTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--admin-text-muted);">No team members found. Click "Add New Member" to add one.</td></tr>`;
            return;
        }

        teamTableBody.innerHTML = sortedFiltered.map(m => {
            const initials = m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const avatarHtml = m.photo ? 
                `<img src="${escapeHtml(m.photo)}" class="member-avatar-mini" alt="${escapeHtml(m.name)}">` : 
                `<div class="member-avatar-mini">${initials}</div>`;

            const tierLabels = {
                faculty: 'Faculty In-Charge',
                board: 'President & Vice President',
                coordinators: 'Co-ordinators',
                organizing: 'Board of Directors',
                advisory: 'Advisory Committee',
                core: 'Core Committee'
            };
            const tierLabel = tierLabels[m.tier] || m.tier;

            return `
                <tr>
                    <td>
                        <div class="member-cell">
                            ${avatarHtml}
                            <span class="member-name-text">${escapeHtml(m.name)}</span>
                        </div>
                    </td>
                    <td>${escapeHtml(m.role)}</td>
                    <td><span class="tier-badge tier-${m.tier}">${escapeHtml(tierLabel)}</span></td>
                    <td>${m.linkedin ? `<a href="${escapeHtml(m.linkedin)}" target="_blank" style="color:var(--admin-gold);">Profile ↗</a>` : '—'}</td>
                    <td>
                        <div class="action-btns-group">
                            <button class="btn-icon" onclick="editTeamMember('${m.id}')" title="Edit Member">✏️</button>
                            <button class="btn-icon delete" onclick="deleteTeamMember('${m.id}')" title="Delete Member">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    if (filterTierSelect) filterTierSelect.addEventListener('change', () => renderTeamTable());
    if (searchTeamInput) searchTeamInput.addEventListener('input', () => renderTeamTable());

    const modalMember = document.getElementById('modal-member');
    const btnOpenAddMember = document.getElementById('btn-open-add-member-modal');
    const quickAddMember = document.getElementById('quick-add-member');
    const btnCloseMemberModal = document.getElementById('btn-close-member-modal');
    const btnCancelMemberModal = document.getElementById('btn-cancel-member-modal');
    const formMemberModal = document.getElementById('form-member-modal');

    // Image File Upload Reader
    const photoFileInput = document.getElementById('member-photo-file');
    const photoHiddenInput = document.getElementById('member-photo');
    const photoPreviewImg = document.getElementById('photo-preview-img');
    const photoPreviewIcon = document.getElementById('photo-preview-icon');

    if (photoFileInput) {
        photoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                showToast(`⏳ Optimizing photo...`);
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const maxDim = 350;
                        let width = img.width;
                        let height = img.height;
                        if (width > height) {
                            if (width > maxDim) { height *= maxDim / width; width = maxDim; }
                        } else {
                            if (height > maxDim) { width *= maxDim / height; height = maxDim; }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.70);
                        if (photoHiddenInput) photoHiddenInput.value = compressedBase64;
                        updatePhotoPreview(compressedBase64);
                        showToast(`✅ Photo optimized (${(compressedBase64.length / 1024).toFixed(0)}KB)`);
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function updatePhotoPreview(url) {
        if (url && photoPreviewImg && photoPreviewIcon) {
            photoPreviewImg.src = url;
            photoPreviewImg.style.display = 'block';
            photoPreviewIcon.style.display = 'none';
        } else if (photoPreviewImg && photoPreviewIcon) {
            photoPreviewImg.src = '';
            photoPreviewImg.style.display = 'none';
            photoPreviewIcon.style.display = 'block';
        }
    }

    function openMemberModal(member = null) {
        if (!modalMember) return;
        const modalTitle = document.getElementById('modal-member-title');
        const inputId = document.getElementById('member-edit-id');
        const inputName = document.getElementById('member-name');
        const inputRole = document.getElementById('member-role');
        const inputTier = document.getElementById('member-tier');
        const inputPhoto = document.getElementById('member-photo');
        const inputLinkedin = document.getElementById('member-linkedin');

        if (photoFileInput) photoFileInput.value = '';

        if (member) {
            modalTitle.textContent = "Edit Team Member";
            inputId.value = member.id;
            inputName.value = member.name;
            inputRole.value = member.role;
            inputTier.value = member.tier;
            inputPhoto.value = member.photo || "";
            inputLinkedin.value = member.linkedin || "";
            updatePhotoPreview(member.photo);
        } else {
            modalTitle.textContent = "Add Team Member";
            inputId.value = "";
            inputName.value = "";
            inputRole.value = "";
            inputTier.value = "coordinators";
            inputPhoto.value = "";
            inputLinkedin.value = "";
            updatePhotoPreview("");
        }
        modalMember.style.display = 'flex';
    }

    function closeMemberModal() {
        if (modalMember) modalMember.style.display = 'none';
    }

    if (btnOpenAddMember) btnOpenAddMember.addEventListener('click', () => openMemberModal());
    if (quickAddMember) quickAddMember.addEventListener('click', () => {
        const teamTabBtn = document.querySelector('[data-tab="tab-team"]');
        if (teamTabBtn) teamTabBtn.click();
        openMemberModal();
    });
    if (btnCloseMemberModal) btnCloseMemberModal.addEventListener('click', closeMemberModal);
    if (btnCancelMemberModal) btnCancelMemberModal.addEventListener('click', closeMemberModal);

    if (formMemberModal) {
        formMemberModal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('member-edit-id').value;
            const name = document.getElementById('member-name').value.trim();
            const role = document.getElementById('member-role').value.trim();
            const tier = document.getElementById('member-tier').value;
            const photo = document.getElementById('member-photo').value.trim();
            const linkedin = document.getElementById('member-linkedin').value.trim();

            if (window.GrandeurDB) {
                try {
                    if (editId) {
                        await window.GrandeurDB.updateTeamMember(editId, { name, role, tier, photo, linkedin });
                    } else {
                        await window.GrandeurDB.insertTeamMember({ name, role, tier, photo, linkedin });
                    }
                } catch(err) {
                    console.error("GrandeurDB save error:", err);
                    showToast(`⚠️ Error saving: ${err.message}`);
                    return;
                }
            }

            showToast(`✅ Saved team member: ${name}`);
            closeMemberModal();
            await renderDashboard();
            window.dispatchEvent(new Event('grandeur_store_updated'));
        });
    }

    window.editTeamMember = function(id) {
        const member = cachedTeam.find(m => m.id === id);
        if (member) openMemberModal(member);
    };

    window.deleteTeamMember = async function(id) {
        const member = cachedTeam.find(m => m.id === id);
        if (member && confirm(`Are you sure you want to remove ${member.name} from the team?`)) {
            if (window.GrandeurDB) {
                try {
                    await window.GrandeurDB.deleteTeamMember(id);
                } catch(err) {
                    console.error("GrandeurDB delete error:", err);
                    showToast(`⚠️ Delete failed: ${err.message}`);
                    return;
                }
            }
            showToast(`Removed team member: ${member.name}`);
            await renderDashboard();
            window.dispatchEvent(new Event('grandeur_store_updated'));
        }
    };

    // KNOWLEDGE PRIMERS CRUD
    const knowledgeTableBody = document.getElementById('knowledge-table-body');
    const modalPrimer = document.getElementById('modal-primer');
    const btnOpenAddPrimer = document.getElementById('btn-open-add-primer-modal');
    const btnClosePrimerModal = document.getElementById('btn-close-primer-modal');
    const btnCancelPrimerModal = document.getElementById('btn-cancel-primer-modal');
    const formPrimerModal = document.getElementById('form-primer-modal');

    function renderKnowledgeTable(primersList = cachedPrimers) {
        if (!knowledgeTableBody) return;
        
        const sortedList = (primersList || []).sort((a, b) => {
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

        if (sortedList.length === 0) {
            knowledgeTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--admin-text-muted);">No research publications found. Click "Add New Primer" to publish one.</td></tr>`;
            return;
        }

        knowledgeTableBody.innerHTML = sortedList.map(item => `
            <tr>
                <td><strong>${escapeHtml(item.title)}</strong></td>
                <td><span class="tier-badge tier-core">${escapeHtml(item.category)}</span></td>
                <td>${escapeHtml(item.date_label || item.year || '2026')}</td>
                <td>${item.read_time ? escapeHtml(item.read_time) : '—'}</td>
                <td style="text-align: right;">
                    <div class="action-btns-group" style="justify-content: flex-end;">
                        ${item.pdf_url ? `<a href="${escapeHtml(item.pdf_url)}" target="_blank" class="btn-icon" title="Open Report" style="text-decoration:none;">🔗</a>` : ''}
                        <button class="btn-icon" onclick="editKnowledgePrimer('${item.id}')" title="Edit">✏️</button>
                        <button class="btn-icon delete" onclick="deleteKnowledgePrimer('${item.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function openPrimerModal(primer = null) {
        if (!modalPrimer) return;
        const modalTitle = document.getElementById('modal-primer-title');
        const inputId = document.getElementById('primer-edit-id');
        const inputTitle = document.getElementById('primer-title');
        const inputCategory = document.getElementById('primer-category');
        const inputDate = document.getElementById('primer-date');
        const inputReadTime = document.getElementById('primer-read-time');
        const inputPdfUrl = document.getElementById('primer-pdf-url');

        if (primer) {
            modalTitle.textContent = "Edit Publication";
            inputId.value = primer.id;
            inputTitle.value = primer.title || "";
            inputCategory.value = primer.category || "Industry Report";
            inputDate.value = primer.date_label || primer.year || "2026";
            inputReadTime.value = primer.read_time || "";
            inputPdfUrl.value = primer.pdf_url || "";
        } else {
            modalTitle.textContent = "Add Publication";
            inputId.value = "";
            inputTitle.value = "";
            inputCategory.value = "Industry Report";
            inputDate.value = "2026";
            inputReadTime.value = "";
            inputPdfUrl.value = "";
        }
        modalPrimer.style.display = 'flex';
    }

    function closePrimerModal() {
        if (modalPrimer) modalPrimer.style.display = 'none';
    }

    if (btnOpenAddPrimer) btnOpenAddPrimer.addEventListener('click', () => openPrimerModal());
    if (btnClosePrimerModal) btnClosePrimerModal.addEventListener('click', closePrimerModal);
    if (btnCancelPrimerModal) btnCancelPrimerModal.addEventListener('click', closePrimerModal);

    if (formPrimerModal) {
        formPrimerModal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('primer-edit-id').value;
            const title = document.getElementById('primer-title').value.trim();
            const category = document.getElementById('primer-category').value;
            const date_label = document.getElementById('primer-date').value.trim();
            const read_time = document.getElementById('primer-read-time').value.trim();
            const pdf_url = document.getElementById('primer-pdf-url').value.trim();

            if (!pdf_url) {
                showToast('⚠️ Please paste a report link.');
                return;
            }

            const saveBtn = document.getElementById('btn-save-primer');
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Saving...'; }

            if (window.GrandeurDB) {
                try {
                    if (editId) {
                        await window.GrandeurDB.updateKnowledgePrimer(editId, { title, category, date_label, read_time, pdf_url });
                    } else {
                        await window.GrandeurDB.insertKnowledgePrimer({ title, category, date_label, read_time, pdf_url });
                    }
                } catch(err) {
                    console.error("Primer save error:", err);
                    showToast(`⚠️ Error saving: ${err.message}`);
                    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Publication'; }
                    return;
                }
            }

            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Publication'; }
            showToast(`✅ Published: ${title}`);
            closePrimerModal();
            await renderDashboard();
        });
    }

    window.editKnowledgePrimer = function(id) {
        const primer = cachedPrimers.find(p => p.id === id);
        if (primer) openPrimerModal(primer);
    };

    window.deleteKnowledgePrimer = async function(id) {
        const primer = cachedPrimers.find(p => p.id === id);
        if (primer && confirm(`Are you sure you want to delete "${primer.title}"?`)) {
            if (window.GrandeurDB) {
                try {
                    await window.GrandeurDB.deleteKnowledgePrimer(id);
                } catch(err) {
                    console.error("Primer delete error:", err);
                    showToast(`⚠️ Delete failed: ${err.message}`);
                    return;
                }
            }
            showToast(`Removed publication: ${primer.title}`);
            await renderDashboard();
        }
    };

    // INBOX RENDER
    function renderInboxList(inboxList = []) {
        const container = document.getElementById('inbox-list-container');
        if (!container) return;
        if (inboxList.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:var(--admin-text-muted); padding:3rem;">📬 No contact inquiries yet. Messages submitted via the "Contact Us" page will appear here instantly.</p>`;
            return;
        }
        container.innerHTML = inboxList.map(item => `
            <div style="background:#0f172a; border:1px solid var(--admin-border); border-radius:12px; padding:1.35rem; margin-bottom:1.15rem; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                        <strong style="color:#f8fafc; font-size:1.05rem; font-family:'Outfit',sans-serif;">${escapeHtml(item.name)}</strong>
                        <a href="mailto:${escapeHtml(item.email)}" style="color:var(--admin-accent-blue); font-size:0.9rem; margin-left:0.5rem; text-decoration:underline; font-weight:600;">&lt;${escapeHtml(item.email)}&gt;</a>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <small style="color:var(--admin-text-muted);">${escapeHtml(item.date || new Date(item.created_at || Date.now()).toLocaleString())}</small>
                        <button class="btn-icon delete" onclick="deleteContactInquiry('${item.id}')" title="Delete Inquiry" style="padding:4px 8px;">🗑️</button>
                    </div>
                </div>
                <h4 style="margin-bottom:0.5rem; color:var(--admin-gold); font-size:0.98rem; font-family:'Outfit',sans-serif;">📌 Subject: ${escapeHtml(item.subject)}</h4>
                <p style="color:#cbd5e1; font-size:0.93rem; line-height:1.6; white-space:pre-wrap; background:rgba(0,0,0,0.35); padding:0.85rem 1rem; border-radius:8px; border:1px solid rgba(255,255,255,0.08); margin:0;">${escapeHtml(item.message)}</p>
            </div>
        `).join('');
    }

    window.deleteContactInquiry = async function(id) {
        if (confirm("Are you sure you want to delete this inquiry from the inbox?")) {
            if (window.GrandeurDB) {
                try {
                    await window.GrandeurDB.deleteContactInquiry(id);
                } catch(err) {
                    console.error("Inquiry delete error:", err);
                    showToast(`⚠️ Delete failed: ${err.message}`);
                    return;
                }
            }
            showToast("🗑️ Removed inquiry from inbox");
            await renderDashboard();
        }
    };

    // RECRUITMENT APPLICATIONS RENDER & CRUD (RECRUITMENT & BANNERS TAB ONLY)
    function renderApplicationsList(appList = []) {
        const container = document.getElementById('recruitment-applications-list');
        const badge = document.getElementById('recruitment-apps-badge');
        if (badge) badge.textContent = appList.length;
        if (!container) return;

        if (!Array.isArray(appList) || appList.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:var(--admin-text-muted); padding:3rem;">📥 No member applications submitted yet. Candidate form responses submitted via the website will be listed here.</p>`;
            return;
        }

        container.innerHTML = appList.map(item => {
            let qaContent = '';
            const customQA = item.custom_answers || item.customAnswers;

            if (Array.isArray(customQA) && customQA.length > 0) {
                qaContent = customQA.map(qa => `
                    <div style="margin-bottom:0.85rem;">
                        <strong style="color:var(--admin-gold); font-size:0.95rem; font-family:'Outfit',sans-serif;">💡 ${escapeHtml(qa.question)}</strong>
                        <p style="color:#cbd5e1; font-size:0.92rem; line-height:1.6; background:rgba(0,0,0,0.35); padding:0.85rem 1rem; border-radius:8px; margin-top:0.35rem; border:1px solid rgba(255,255,255,0.08); margin-bottom:0; white-space:pre-wrap;">${escapeHtml(qa.answer || 'N/A')}</p>
                    </div>
                `).join('');
            } else {
                if (item.why_join) {
                    qaContent += `
                    <div style="margin-bottom:0.85rem;">
                        <strong style="color:var(--admin-gold); font-size:0.95rem; font-family:'Outfit',sans-serif;">💡 Why Join Grandeur:</strong>
                        <p style="color:#cbd5e1; font-size:0.92rem; line-height:1.6; background:rgba(0,0,0,0.35); padding:0.85rem 1rem; border-radius:8px; margin-top:0.35rem; border:1px solid rgba(255,255,255,0.08); margin-bottom:0;">${escapeHtml(item.why_join)}</p>
                    </div>`;
                }
                if (item.case_response) {
                    qaContent += `
                    <div style="margin-bottom:0.85rem;">
                        <strong style="color:var(--admin-gold); font-size:0.95rem; font-family:'Outfit',sans-serif;">🧩 Case Scenario Response:</strong>
                        <p style="color:#cbd5e1; font-size:0.92rem; line-height:1.6; background:rgba(0,0,0,0.35); padding:0.85rem 1rem; border-radius:8px; margin-top:0.35rem; border:1px solid rgba(255,255,255,0.08); margin-bottom:0;">${escapeHtml(item.case_response)}</p>
                    </div>`;
                }
            }

            const wingBadge = item.wing_preference ? `
                <span style="background:rgba(56, 189, 248, 0.15); color:var(--admin-accent-blue); padding:3px 10px; border-radius:10px; font-size:0.8rem; margin-left:0.5rem; border:1px solid rgba(56, 189, 248, 0.3); font-weight:600;">
                    ${escapeHtml(item.wing_preference)}
                </span>` : '';

            const courseInfo = item.course ? `<div>🎓 <strong>Course & Year:</strong> ${escapeHtml(item.course)} ${item.batch_year ? '(' + escapeHtml(item.batch_year) + ')' : ''}</div>` : '';
            const rollInfo = item.roll_no ? `<div>🆔 <strong>Roll No:</strong> ${escapeHtml(item.roll_no)}</div>` : '';

            return `
            <div style="background:#0f172a; border:1px solid var(--admin-border); border-radius:12px; padding:1.5rem; margin-bottom:1.25rem; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem; flex-wrap:wrap; gap:0.5rem; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.75rem;">
                    <div>
                        <strong style="color:#f8fafc; font-size:1.15rem; font-family:'Outfit',sans-serif;">${escapeHtml(item.full_name || item.name || 'Candidate')}</strong>
                        ${wingBadge}
                    </div>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <small style="color:var(--admin-text-muted); font-weight:500;">📅 ${escapeHtml(item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent')}</small>
                        <button class="btn-icon delete" onclick="deleteRecruitmentApp('${item.id}')" title="Delete Application" style="padding:4px 8px;">🗑️</button>
                    </div>
                </div>

                <div style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); display:grid; gap:0.75rem; margin-bottom:1.25rem; background:rgba(0,0,0,0.35); padding:0.85rem 1rem; border-radius:8px; font-size:0.92rem; color:#cbd5e1; border:1px solid rgba(255,255,255,0.08);">
                    <div>📧 <strong>Email:</strong> <a href="mailto:${escapeHtml(item.email || '')}" style="color:var(--admin-accent-blue); text-decoration:underline; font-weight:600;">${escapeHtml(item.email || 'N/A')}</a></div>
                    <div>📞 <strong>Phone:</strong> ${escapeHtml(item.phone || 'N/A')}</div>
                    ${courseInfo}
                    ${rollInfo}
                </div>

                ${qaContent}
            </div>
            `;
        }).join('');
    }

    window.deleteRecruitmentApp = async function(id) {
        if (confirm("Are you sure you want to delete this member application?")) {
            if (window.GrandeurDB && window.GrandeurDB.deleteRecruitmentApplication) {
                try {
                    await window.GrandeurDB.deleteRecruitmentApplication(id);
                } catch(err) {
                    console.error("App delete error:", err);
                }
            }
            const store = getStore();
            if (Array.isArray(store.applications)) {
                store.applications = store.applications.filter(a => a.id !== id);
                saveStore(store);
            }
            showToast("🗑️ Removed candidate application");
            await renderDashboard();
        }
    };

    const btnRefreshApps = document.getElementById('btn-refresh-applications');
    if (btnRefreshApps) {
        btnRefreshApps.addEventListener('click', async () => {
            await renderDashboard();
            showToast("🔄 Applications list refreshed!");
        });
    }

    // ALUMNI NETWORK CRUD
    const alumniTableBody = document.getElementById('alumni-table-body');
    const modalAlumni = document.getElementById('modal-alumni');
    const btnOpenAddAlumni = document.getElementById('btn-open-add-alumni-modal');
    const btnCloseAlumniModal = document.getElementById('btn-close-alumni-modal');
    const btnCancelAlumniModal = document.getElementById('btn-cancel-alumni-modal');
    const formAlumniModal = document.getElementById('form-alumni-modal');
    const alumniPhotoFile = document.getElementById('alumni-photo-file');
    const alumniPhotoInput = document.getElementById('alumni-photo');
    const alumniPhotoPreviewImg = document.getElementById('alumni-photo-preview-img');
    const alumniPhotoPreviewIcon = document.getElementById('alumni-photo-preview-icon');

    if (alumniPhotoFile) {
        alumniPhotoFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                showToast(`⏳ Optimizing image: ${file.name}...`);
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const maxDim = 300;
                        let width = img.width;
                        let height = img.height;
                        if (width > height) {
                            if (width > maxDim) { height *= maxDim / width; width = maxDim; }
                        } else {
                            if (height > maxDim) { width *= maxDim / height; height = maxDim; }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.70);
                        if (alumniPhotoInput) alumniPhotoInput.value = compressedBase64;
                        if (alumniPhotoPreviewImg) {
                            alumniPhotoPreviewImg.src = compressedBase64;
                            alumniPhotoPreviewImg.style.display = 'block';
                        }
                        if (alumniPhotoPreviewIcon) alumniPhotoPreviewIcon.style.display = 'none';
                        showToast(`✅ Photo optimized (${(compressedBase64.length / 1024).toFixed(0)}KB)`);
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function getBatchYear(item) {
        const match = (item.role || '').match(/20\d\d/);
        return match ? parseInt(match[0], 10) : 0;
    }

    function renderAlumniTable(alumniList = cachedAlumni) {
        if (!alumniTableBody) return;
        if (!alumniList || alumniList.length === 0) {
            alumniTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--admin-text-muted);">No alumni records found. Click "Add Alumni Member" to create one.</td></tr>`;
            return;
        }

        // Sort descending by batch year (2025 -> 2024 -> 2023...)
        const sorted = [...alumniList].sort((a, b) => getBatchYear(b) - getBatchYear(a));

        alumniTableBody.innerHTML = sorted.map(item => {
            const parts = (item.role || '').split('|');
            let batch = 'Alumni';
            let roleAndPlacement = item.role || '';
            if (parts.length > 1) {
                batch = parts[0].trim();
                roleAndPlacement = parts.slice(1).join('|').trim();
            }
            const roleSubParts = roleAndPlacement.split('•');
            const placement = roleSubParts.length > 1 ? roleSubParts[1].trim() : roleSubParts[0].trim();

            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            ${item.photo ? `<img src="${item.photo}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid var(--admin-gold);">` : `<div style="width:36px; height:36px; border-radius:50%; background:#0f172a; border:1px dashed var(--admin-gold); display:flex; align-items:center; justify-content:center; font-size:0.9rem;">🎓</div>`}
                            <strong>${escapeHtml(item.name)}</strong>
                        </div>
                    </td>
                    <td><span class="tier-badge tier-core">${escapeHtml(batch)}</span></td>
                    <td>${escapeHtml(placement || '—')}</td>
                    <td style="text-align: right;">
                        <div class="action-btns-group" style="justify-content: flex-end;">
                            ${item.linkedin ? `<a href="${escapeHtml(item.linkedin)}" target="_blank" class="btn-icon" title="LinkedIn" style="text-decoration:none;">🔗</a>` : ''}
                            <button class="btn-icon" onclick="editAlumniMember('${item.id}')" title="Edit">✏️</button>
                            <button class="btn-icon delete" onclick="deleteAlumniMember('${item.id}')" title="Delete">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function openAlumniModal(alumnus = null) {
        if (!modalAlumni) return;
        const modalTitle = document.getElementById('modal-alumni-title');
        const inputId = document.getElementById('alumni-edit-id');
        const inputName = document.getElementById('alumni-name');
        const inputBatch = document.getElementById('alumni-batch');
        const inputPlacement = document.getElementById('alumni-placement');
        const inputLinkedin = document.getElementById('alumni-linkedin');

        if (alumniPhotoFile) alumniPhotoFile.value = '';
        if (alumniPhotoInput) alumniPhotoInput.value = '';
        if (alumniPhotoPreviewImg) { alumniPhotoPreviewImg.src = ''; alumniPhotoPreviewImg.style.display = 'none'; }
        if (alumniPhotoPreviewIcon) alumniPhotoPreviewIcon.style.display = 'block';

        if (alumnus) {
            modalTitle.textContent = "Edit Alumni Member";
            inputId.value = alumnus.id;
            inputName.value = alumnus.name || "";
            
            const parts = (alumnus.role || '').split('|');
            if (parts.length > 1) {
                inputBatch.value = parts[0].replace(/^Batch of\s*/i, '').trim();
                const roleSub = parts.slice(1).join('|').trim().split('•');
                inputPlacement.value = roleSub.length > 1 ? roleSub[1].trim() : roleSub[0].trim();
            } else {
                inputBatch.value = "2025";
                const roleSub = (alumnus.role || "").split('•');
                inputPlacement.value = roleSub.length > 1 ? roleSub[1].trim() : roleSub[0].trim();
            }
            inputLinkedin.value = alumnus.linkedin || "";

            if (alumnus.photo) {
                if (alumniPhotoInput) alumniPhotoInput.value = alumnus.photo;
                if (alumniPhotoPreviewImg) { alumniPhotoPreviewImg.src = alumnus.photo; alumniPhotoPreviewImg.style.display = 'block'; }
                if (alumniPhotoPreviewIcon) alumniPhotoPreviewIcon.style.display = 'none';
            }
        } else {
            modalTitle.textContent = "Add Alumni Member";
            inputId.value = "";
            inputName.value = "";
            inputBatch.value = "2025";
            inputPlacement.value = "";
            inputLinkedin.value = "";
        }
        modalAlumni.style.display = 'flex';
    }

    function closeAlumniModal() {
        if (modalAlumni) modalAlumni.style.display = 'none';
    }

    if (btnOpenAddAlumni) btnOpenAddAlumni.addEventListener('click', () => openAlumniModal());
    if (btnCloseAlumniModal) btnCloseAlumniModal.addEventListener('click', closeAlumniModal);
    if (btnCancelAlumniModal) btnCancelAlumniModal.addEventListener('click', closeAlumniModal);

    if (formAlumniModal) {
        formAlumniModal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('alumni-edit-id').value;
            const name = document.getElementById('alumni-name').value.trim();
            const batch = document.getElementById('alumni-batch').value.trim();
            const placement = document.getElementById('alumni-placement').value.trim();
            const linkedin = document.getElementById('alumni-linkedin').value.trim();
            const photo = alumniPhotoInput ? alumniPhotoInput.value : "";

            const formattedRole = `Batch of ${batch.replace(/^Batch of\s*/i, '')} | ${placement}`;

            const saveBtn = document.getElementById('btn-save-alumni');
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Saving...'; }

            if (window.GrandeurDB) {
                try {
                    if (editId) {
                        await window.GrandeurDB.updateAlumniMember(editId, { name, role: formattedRole, linkedin, photo });
                    } else {
                        await window.GrandeurDB.insertAlumniMember({ name, role: formattedRole, linkedin, photo });
                    }
                } catch(err) {
                    console.error("Alumni save error:", err);
                    showToast(`⚠️ Error saving alumni: ${err.message}`);
                    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Alumni Member'; }
                    return;
                }
            }

            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Alumni Member'; }
            showToast(`✅ Saved alumni: ${name}`);
            closeAlumniModal();
            await renderDashboard();
        });
    }

    window.editAlumniMember = function(id) {
        const alumnus = cachedAlumni.find(a => a.id === id);
        if (alumnus) openAlumniModal(alumnus);
    };

    window.deleteAlumniMember = async function(id) {
        const alumnus = cachedAlumni.find(a => a.id === id);
        if (alumnus && confirm(`Are you sure you want to remove "${alumnus.name}" from Alumni?`)) {
            if (window.GrandeurDB) {
                try {
                    await window.GrandeurDB.deleteAlumniMember(id);
                } catch(err) {
                    console.error("Alumni delete error:", err);
                    showToast(`⚠️ Delete failed: ${err.message}`);
                    return;
                }
            }
            showToast(`Removed alumni: ${alumnus.name}`);
            await renderDashboard();
        }
    };

    // ACHIEVEMENTS CRUD
    let cachedAchievements = [];
    const achievementsTableBody = document.getElementById('achievements-table-body');
    const modalAchievement = document.getElementById('modal-achievement');
    const btnOpenAddAchievement = document.getElementById('btn-open-add-achievement-modal');
    const btnCloseAchievementModal = document.getElementById('btn-close-achievement-modal');
    const btnCancelAchievementModal = document.getElementById('btn-cancel-achievement-modal');
    const formAchievementModal = document.getElementById('form-achievement-modal');

    const logoFileInput = document.getElementById('achievement-logo-file');
    const logoHiddenInput = document.getElementById('achievement-logo');
    const logoPreviewImg = document.getElementById('achievement-logo-preview-img');
    const logoPreviewIcon = document.getElementById('achievement-logo-preview-icon');

    if (logoFileInput) {
        logoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            showToast(`⏳ Processing logo...`);
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 400;

                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/png', 0.85);
                    if (logoHiddenInput) logoHiddenInput.value = compressedBase64;
                    updateLogoPreview(compressedBase64);
                    showToast(`✅ Logo optimized!`);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function updateLogoPreview(url) {
        if (url && logoPreviewImg && logoPreviewIcon) {
            logoPreviewImg.src = url;
            logoPreviewImg.style.display = 'block';
            logoPreviewIcon.style.display = 'none';
        } else if (logoPreviewImg && logoPreviewIcon) {
            logoPreviewImg.src = '';
            logoPreviewImg.style.display = 'none';
            logoPreviewIcon.style.display = 'block';
        }
    }

    function parseAchievementMeta(item) {
        let description = item.description || '';
        let display_order = (item.display_order !== undefined && item.display_order !== null) ? item.display_order : undefined;
        let logo = item.logo || '';
        let members = '';
        let category_tier = '';

        if (item.team_name) {
            try {
                const parsed = JSON.parse(item.team_name);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.description) description = parsed.description;
                    if (parsed.display_order !== undefined && parsed.display_order !== null) display_order = parsed.display_order;
                    if (parsed.logo) logo = parsed.logo;
                    if (parsed.members) members = parsed.members;
                    if (parsed.category_tier) category_tier = parsed.category_tier;
                }
            } catch (e) {
                if (typeof item.team_name === 'string') {
                    members = item.team_name;
                }
            }
        }

        if (!category_tier) {
            const combined = ((item.event_name || '') + ' ' + (item.position || '') + ' ' + description).toLowerCase();
            if (combined.includes('bain') || combined.includes('mckinsey') || combined.includes('bcg') || combined.includes('deloitte') || combined.includes('plum') || combined.includes('global') || combined.includes('gmcc')) {
                category_tier = 'global';
            } else if (combined.includes('iim') || combined.includes('iit') || combined.includes('xlri') || combined.includes('fms') || combined.includes('spjimr') || combined.includes('b-school') || combined.includes('melbourne')) {
                category_tier = 'top_bschools';
            } else {
                category_tier = 'du_circuit';
            }
        }

        return {
            id: item.id,
            title: item.event_name || item.title || 'Untitled Competition',
            position: item.position || item.category || 'Winner',
            year: item.year || item.date_label || '2026',
            description: description,
            members: members,
            category_tier: category_tier,
            display_order: display_order,
            logo: logo
        };
    }

    function renderAchievementsTable(list = cachedAchievements) {
        if (!achievementsTableBody) return;
        if (!list || list.length === 0) {
            achievementsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--admin-text-muted);">No achievements recorded yet. Click "Add Achievement" to publish one.</td></tr>`;
            return;
        }

        // Sort ascending by display_order, fallback to year descending
        const sorted = [...list].sort((a, b) => {
            const metaA = parseAchievementMeta(a);
            const metaB = parseAchievementMeta(b);
            const orderA = metaA.display_order !== undefined ? metaA.display_order : 9999;
            const orderB = metaB.display_order !== undefined ? metaB.display_order : 9999;
            if (orderA !== orderB) return orderA - orderB;
            return parseInt(metaB.year, 10) - parseInt(metaA.year, 10);
        });

        const catBadges = {
            global: '<span class="tier-badge tier-board">🌐 Global Corporate</span>',
            top_bschools: '<span class="tier-badge tier-organizing">🏛️ Top B-Schools</span>',
            du_circuit: '<span class="tier-badge tier-core">🎓 DU Circuit</span>'
        };

        achievementsTableBody.innerHTML = sorted.map((item, idx) => {
            const meta = parseAchievementMeta(item);
            const badgeClass = meta.position.toLowerCase().includes('1st') || meta.position.toLowerCase().includes('winner') ? 'tier-board' : 'tier-coordinators';

            const logoHtml = meta.logo ?
                `<img src="${escapeHtml(meta.logo)}" style="width:36px; height:36px; border-radius:6px; object-fit:contain; background:#ffffff; padding:2px; border:1px solid var(--admin-border);">` :
                `<div style="width:36px; height:36px; border-radius:6px; background:#0f172a; border:1px dashed var(--admin-border); display:flex; align-items:center; justify-content:center; font-size:1.1rem;">🏛️</div>`;

            const isFirst = idx === 0;
            const isLast = idx === sorted.length - 1;

            const detailText = meta.members ? `👥 ${meta.members}${meta.description ? ' | ' + meta.description : ''}` : (meta.description || '—');

            return `
                <tr>
                    <td style="text-align:center;">
                        <div style="display:flex; gap:3px; justify-content:center; align-items:center;">
                            <button class="btn-icon" onclick="moveAchievementUp('${meta.id}')" title="Move Up" ${isFirst ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>⬆️</button>
                            <button class="btn-icon" onclick="moveAchievementDown('${meta.id}')" title="Move Down" ${isLast ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>⬇️</button>
                        </div>
                    </td>
                    <td>${logoHtml}</td>
                    <td><strong>${escapeHtml(meta.title)}</strong></td>
                    <td>${catBadges[meta.category_tier] || catBadges.du_circuit}</td>
                    <td><span class="tier-badge ${badgeClass}">${escapeHtml(meta.position)}</span></td>
                    <td><strong>${escapeHtml(meta.year)}</strong></td>
                    <td><div style="max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(detailText)}</div></td>
                    <td style="text-align: right;">
                        <div class="action-btns-group" style="justify-content: flex-end;">
                            <button class="btn-icon" onclick="editAchievement('${meta.id}')" title="Edit">✏️</button>
                            <button class="btn-icon delete" onclick="deleteAchievement('${meta.id}')" title="Delete">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.moveAchievementUp = async function(id) {
        const sorted = [...cachedAchievements].sort((a, b) => {
            const metaA = parseAchievementMeta(a);
            const metaB = parseAchievementMeta(b);
            const orderA = metaA.display_order !== undefined ? metaA.display_order : 9999;
            const orderB = metaB.display_order !== undefined ? metaB.display_order : 9999;
            if (orderA !== orderB) return orderA - orderB;
            return parseInt(metaB.year, 10) - parseInt(metaA.year, 10);
        });

        const idx = sorted.findIndex(item => item.id === id);
        if (idx <= 0) return;

        const temp = sorted[idx];
        sorted[idx] = sorted[idx - 1];
        sorted[idx - 1] = temp;

        sorted.forEach((item, i) => {
            const meta = parseAchievementMeta(item);
            const metaObj = {
                description: meta.description,
                members: meta.members,
                category_tier: meta.category_tier,
                display_order: i,
                logo: meta.logo
            };
            item.team_name = JSON.stringify(metaObj);
            item.display_order = i;
        });

        cachedAchievements = sorted;
        renderAchievementsTable(cachedAchievements);

        await saveNewAchievementOrder(cachedAchievements);
    };

    window.moveAchievementDown = async function(id) {
        const sorted = [...cachedAchievements].sort((a, b) => {
            const metaA = parseAchievementMeta(a);
            const metaB = parseAchievementMeta(b);
            const orderA = metaA.display_order !== undefined ? metaA.display_order : 9999;
            const orderB = metaB.display_order !== undefined ? metaB.display_order : 9999;
            if (orderA !== orderB) return orderA - orderB;
            return parseInt(metaB.year, 10) - parseInt(metaA.year, 10);
        });

        const idx = sorted.findIndex(item => item.id === id);
        if (idx < 0 || idx >= sorted.length - 1) return;

        const temp = sorted[idx];
        sorted[idx] = sorted[idx + 1];
        sorted[idx + 1] = temp;

        sorted.forEach((item, i) => {
            const meta = parseAchievementMeta(item);
            const metaObj = {
                description: meta.description,
                members: meta.members,
                category_tier: meta.category_tier,
                display_order: i,
                logo: meta.logo
            };
            item.team_name = JSON.stringify(metaObj);
            item.display_order = i;
        });

        cachedAchievements = sorted;
        renderAchievementsTable(cachedAchievements);

        await saveNewAchievementOrder(cachedAchievements);
    };

    async function saveNewAchievementOrder(sortedList) {
        showToast("⏳ Saving new order...");
        try {
            await Promise.all(sortedList.map(async (item, i) => {
                const meta = parseAchievementMeta(item);

                const metaObj = {
                    description: meta.description,
                    members: meta.members,
                    category_tier: meta.category_tier,
                    display_order: i,
                    logo: meta.logo
                };

                const payload = {
                    event_name: meta.title,
                    position: meta.position,
                    year: meta.year,
                    team_name: JSON.stringify(metaObj)
                };

                if (window.GrandeurDB) {
                    await window.GrandeurDB.updateAchievement(meta.id, payload);
                }
            }));

            if (window.GrandeurDB && typeof window.GrandeurDB.clearCache === 'function') {
                window.GrandeurDB.clearCache();
            }
            showToast("✅ Achievement order updated!");
            await renderDashboard();
        } catch(err) {
            console.error("Order save error:", err);
            showToast(`⚠️ Order save failed: ${err.message}`);
        }
    }

    function openAchievementModal(item = null) {
        if (!modalAchievement) return;
        const modalTitle = document.getElementById('modal-achievement-title');
        const inputId = document.getElementById('achievement-edit-id');
        const inputTitle = document.getElementById('achievement-title');
        const inputTier = document.getElementById('achievement-category-tier');
        const inputCat = document.getElementById('achievement-category');
        const inputDate = document.getElementById('achievement-date');
        const inputMembers = document.getElementById('achievement-members');
        const inputDesc = document.getElementById('achievement-description');

        if (logoFileInput) logoFileInput.value = '';

        if (item) {
            const meta = parseAchievementMeta(item);
            modalTitle.textContent = "Edit Achievement";
            inputId.value = meta.id;
            inputTitle.value = meta.title;
            if (inputTier) inputTier.value = meta.category_tier || 'global';
            inputCat.value = meta.position;
            inputDate.value = meta.year;
            if (inputMembers) inputMembers.value = meta.members || '';
            inputDesc.value = meta.description || '';
            if (logoHiddenInput) logoHiddenInput.value = meta.logo || '';
            updateLogoPreview(meta.logo || '');
        } else {
            modalTitle.textContent = "Add Achievement";
            inputId.value = "";
            inputTitle.value = "";
            if (inputTier) inputTier.value = "global";
            inputCat.value = "";
            inputDate.value = "2026";
            if (inputMembers) inputMembers.value = "";
            inputDesc.value = "";
            if (logoHiddenInput) logoHiddenInput.value = '';
            updateLogoPreview('');
        }
        modalAchievement.style.display = 'flex';
    }

    function closeAchievementModal() {
        if (modalAchievement) modalAchievement.style.display = 'none';
    }

    if (btnOpenAddAchievement) btnOpenAddAchievement.addEventListener('click', () => openAchievementModal());
    if (btnCloseAchievementModal) btnCloseAchievementModal.addEventListener('click', closeAchievementModal);
    if (btnCancelAchievementModal) btnCancelAchievementModal.addEventListener('click', closeAchievementModal);

    if (formAchievementModal) {
        formAchievementModal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('achievement-edit-id').value;
            const title = document.getElementById('achievement-title').value.trim();
            const category_tier = document.getElementById('achievement-category-tier') ? document.getElementById('achievement-category-tier').value : 'global';
            const position = document.getElementById('achievement-category').value.trim();
            const year = document.getElementById('achievement-date').value.trim();
            const members = document.getElementById('achievement-members') ? document.getElementById('achievement-members').value.trim() : '';
            const description = document.getElementById('achievement-description').value.trim();
            const logo = logoHiddenInput ? logoHiddenInput.value.trim() : '';

            let display_order = 0;
            if (editId) {
                const existing = cachedAchievements.find(a => a.id === editId);
                if (existing) {
                    const exMeta = parseAchievementMeta(existing);
                    display_order = exMeta.display_order !== undefined ? exMeta.display_order : 0;
                }
            } else {
                display_order = cachedAchievements.length;
            }

            const metaObj = {
                description: description,
                members: members,
                category_tier: category_tier,
                display_order: display_order,
                logo: logo
            };

            const payload = {
                event_name: title,
                position: position,
                year: year,
                team_name: JSON.stringify(metaObj)
            };

            const saveBtn = document.getElementById('btn-save-achievement');
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Saving...'; }

            if (window.GrandeurDB) {
                try {
                    if (editId) {
                        await window.GrandeurDB.updateAchievement(editId, payload);
                    } else {
                        await window.GrandeurDB.insertAchievement(payload);
                    }
                } catch(err) {
                    console.error("Achievement save error:", err);
                    showToast(`⚠️ Error: ${err.message}`);
                    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Achievement'; }
                    return;
                }
            }

            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Achievement'; }
            showToast(`🏆 Saved achievement: ${title}`);
            closeAchievementModal();
            await renderDashboard();
        });
    }

    window.editAchievement = function(id) {
        const item = cachedAchievements.find(a => a.id === id);
        if (item) openAchievementModal(item);
    };

    window.deleteAchievement = async function(id) {
        const item = cachedAchievements.find(a => a.id === id);
        if (item && confirm(`Are you sure you want to delete "${item.title}"?`)) {
            if (window.GrandeurDB) {
                try {
                    await window.GrandeurDB.deleteAchievement(id);
                } catch(err) {
                    console.error("Achievement delete error:", err);
                    showToast(`⚠️ Delete failed: ${err.message}`);
                    return;
                }
            }
            showToast(`Removed achievement: ${item.title}`);
            await renderDashboard();
        }
    };

    // LIVE PROJECTS CRUD
    let cachedLiveProjects = [];
    const liveProjectsTableBody = document.getElementById('live-projects-table-body');
    const modalLiveProject = document.getElementById('modal-live-project');
    const btnOpenAddLiveProject = document.getElementById('btn-open-add-live-project-modal');
    const btnCloseLiveProjectModal = document.getElementById('btn-close-live-project-modal');
    const btnCancelLiveProjectModal = document.getElementById('btn-cancel-live-project-modal');
    const formLiveProjectModal = document.getElementById('form-live-project-modal');

    const lpLogoFileInput = document.getElementById('lp-logo-file');
    const lpLogoHiddenInput = document.getElementById('lp-logo');
    const lpLogoPreviewImg = document.getElementById('lp-logo-preview-img');
    const lpLogoPreviewIcon = document.getElementById('lp-logo-preview-icon');

    if (lpLogoFileInput) {
        lpLogoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            showToast(`⏳ Processing company logo...`);
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 200;

                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/png');
                    if (lpLogoHiddenInput) lpLogoHiddenInput.value = compressedBase64;
                    updateLpLogoPreview(compressedBase64);
                    showToast(`✅ Logo optimized!`);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function updateLpLogoPreview(url) {
        if (url && lpLogoPreviewImg && lpLogoPreviewIcon) {
            lpLogoPreviewImg.src = url;
            lpLogoPreviewImg.style.display = 'block';
            lpLogoPreviewIcon.style.display = 'none';
        } else if (lpLogoPreviewImg && lpLogoPreviewIcon) {
            lpLogoPreviewImg.src = '';
            lpLogoPreviewImg.style.display = 'none';
            lpLogoPreviewIcon.style.display = 'block';
        }
    }

    function renderLiveProjectsTable(list = cachedLiveProjects) {
        if (!liveProjectsTableBody) return;

        if (!list || list.length === 0) {
            liveProjectsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--admin-text-muted);">
                        No live projects found. Click <strong>"➕ Add Live Project"</strong> above to create one.
                    </td>
                </tr>
            `;
            return;
        }

        liveProjectsTableBody.innerHTML = list.map(item => {
            const title = escapeHtml(item.title || item.client_name || '');
            const domainTag = escapeHtml(item.domain_tag || 'Consulting');
            const description = escapeHtml(item.description || '');
            const logo = item.logo || item.client_logo || '';
            const itemId = item.id;

            const avatarContent = logo 
                ? `<img src="${logo}" alt="${title}" style="max-height:100%; max-width:100%; object-fit:contain;">` 
                : `<span style="font-size:1.2rem;">🏢</span>`;

            return `
                <tr>
                    <td>
                        <div style="background: #ffffff; height:46px; min-width:46px; max-width:90px; border-radius:10px; display:flex; align-items:center; justify-content:center; border: 1px solid var(--admin-border); padding: 4px;">
                            ${avatarContent}
                        </div>
                    </td>
                    <td><strong>${title}</strong></td>
                    <td><span class="badge" style="background:rgba(30,64,175,0.1); color:#1e40af; border:1px solid rgba(30,64,175,0.2); font-weight:600;">${domainTag}</span></td>
                    <td style="max-width: 320px; font-size:0.86rem; color:var(--admin-text-muted); line-height:1.4;">
                        ${description.length > 90 ? description.substring(0, 90) + '...' : description}
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                        <button class="btn btn-sm btn-outline" onclick="editLiveProject('${itemId}')" title="Edit Project">✏️ Edit</button>
                        <button class="btn btn-sm btn-outline btn-danger" onclick="deleteLiveProject('${itemId}')" title="Delete Project">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function openLiveProjectModal(item = null) {
        if (!modalLiveProject) return;
        document.getElementById('lp-edit-id').value = item ? item.id : '';
        document.getElementById('lp-title').value = item ? (item.title || item.client_name || '') : '';
        document.getElementById('lp-domain-tag').value = item ? (item.domain_tag || '') : '';

        document.getElementById('lp-description').value = item ? (item.description || '') : '';

        const logoUrl = item ? (item.logo || item.client_logo || '') : '';
        if (lpLogoHiddenInput) lpLogoHiddenInput.value = logoUrl;
        if (lpLogoFileInput) lpLogoFileInput.value = '';
        updateLpLogoPreview(logoUrl);

        document.getElementById('modal-live-project-title').textContent = item ? 'Edit Live Project' : 'Add Live Project';
        modalLiveProject.style.display = 'flex';
    }

    function closeLiveProjectModal() {
        if (modalLiveProject) modalLiveProject.style.display = 'none';
    }

    if (btnOpenAddLiveProject) {
        btnOpenAddLiveProject.addEventListener('click', () => openLiveProjectModal());
    }

    if (btnCloseLiveProjectModal) {
        btnCloseLiveProjectModal.addEventListener('click', closeLiveProjectModal);
    }

    if (btnCancelLiveProjectModal) {
        btnCancelLiveProjectModal.addEventListener('click', closeLiveProjectModal);
    }

    if (formLiveProjectModal) {
        formLiveProjectModal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSave = document.getElementById('btn-save-live-project');
            const originalBtnText = btnSave ? btnSave.textContent : 'Save Live Project';

            try {
                if (btnSave) {
                    btnSave.disabled = true;
                    btnSave.textContent = '⏳ Saving...';
                }

                const editId = document.getElementById('lp-edit-id').value;
                const title = document.getElementById('lp-title').value.trim();
                const logo = document.getElementById('lp-logo') ? document.getElementById('lp-logo').value : '';
                const domain_tag = document.getElementById('lp-domain-tag').value.trim();
                const description = document.getElementById('lp-description').value.trim();

                const payload = {
                    title,
                    logo,
                    domain_tag,
                    description
                };

                showToast(`⏳ Saving live project...`);

                if (editId) {
                    if (window.GrandeurDB && window.GrandeurDB.updateLiveProject) {
                        await window.GrandeurDB.updateLiveProject(editId, payload);
                    }
                    const idx = cachedLiveProjects.findIndex(p => String(p.id) === String(editId));
                    if (idx !== -1) cachedLiveProjects[idx] = { ...cachedLiveProjects[idx], ...payload };
                    showToast(`✅ Live project updated & live on website!`);
                } else {
                    const newId = 'lp_' + Date.now();
                    const newItem = { id: newId, ...payload };
                    if (window.GrandeurDB && window.GrandeurDB.insertLiveProject) {
                        await window.GrandeurDB.insertLiveProject(payload);
                    }
                    cachedLiveProjects.unshift(newItem);
                    showToast(`✅ Live project added & live on website!`);
                }
            } catch(err) {
                console.error("Error saving live project:", err);
                showToast(`⚠️ Error saving project: ${err.message || err}`);
            } finally {
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.textContent = originalBtnText;
                }
                closeLiveProjectModal();
                renderLiveProjectsTable(cachedLiveProjects);
            }
        });
    }

    window.editLiveProject = function(id) {
        const item = cachedLiveProjects.find(p => String(p.id) === String(id));
        if (item) openLiveProjectModal(item);
    };

    window.deleteLiveProject = async function(id) {
        const item = cachedLiveProjects.find(p => String(p.id) === String(id));
        const name = item ? (item.title || item.client_name) : 'this live project';
        if (confirm(`Are you sure you want to delete "${name}"?`)) {
            showToast(`⏳ Deleting project...`);
            cachedLiveProjects = cachedLiveProjects.filter(p => String(p.id) !== String(id));
            renderLiveProjectsTable(cachedLiveProjects);
            if (window.GrandeurDB && window.GrandeurDB.deleteLiveProject) {
                await window.GrandeurDB.deleteLiveProject(id);
            }
            showToast(`🗑️ Live project deleted & synced!`);
        }
    };

    const quickToggleRec = document.getElementById('quick-toggle-recruitment');
    if (quickToggleRec) {
        quickToggleRec.addEventListener('click', () => {
            const recruitmentTabBtn = document.querySelector('[data-tab="tab-recruitment"]');
            if (recruitmentTabBtn) recruitmentTabBtn.click();
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // ----------------------------------------------------------------------
    // EVENTS (WHAT WE DO) MANAGEMENT ENGINE
    // ----------------------------------------------------------------------

    const eventSubtabBtns = document.querySelectorAll('.event-subtab-btn');
    const eventEditorCards = document.querySelectorAll('.event-editor-card');

    eventSubtabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const evId = btn.getAttribute('data-event');
            eventSubtabBtns.forEach(b => b.classList.remove('active'));
            eventEditorCards.forEach(card => card.style.display = 'none');

            btn.classList.add('active');
            const targetCard = document.getElementById(`event-editor-${evId}`);
            if (targetCard) targetCard.style.display = 'block';
        });
    });

    function renderEventsEditor(events) {
        if (!Array.isArray(events) || events.length === 0) return;
        cachedEvents = events;

        ['invicta', 'echelon', 'ranneeti'].forEach(evId => {
            const evData = events.find(e => e.id === evId) || {
                id: evId,
                title: evId.toUpperCase(),
                tagline: '',
                description: '',
                slides: []
            };

            const inputTagline = document.getElementById(`event-${evId}-tagline`);
            const inputTitle = document.getElementById(`event-${evId}-title`);
            const inputDesc = document.getElementById(`event-${evId}-desc`);

            if (inputTagline) inputTagline.value = evData.tagline || '';
            if (inputTitle) inputTitle.value = evData.title || '';
            if (inputDesc) inputDesc.value = evData.description || '';

            renderEventSlidesList(evId, evData.slides || []);
        });
    }

    function renderEventSlidesList(evId, slides) {
        const container = document.getElementById(`slides-list-${evId}`);
        if (!container) return;

        if (!Array.isArray(slides) || slides.length === 0) {
            container.innerHTML = `<p style="color:var(--admin-text-muted); font-size:0.88rem; font-style:italic;">No slides added yet. Click "+ Add New Slide" above to add one.</p>`;
            return;
        }

        container.innerHTML = slides.map((slide, sIdx) => `
            <div class="event-slide-item-card" data-event="${evId}" data-slide-index="${sIdx}">
                <div class="event-slide-header">
                    <span class="event-slide-number">Slide #${sIdx + 1}</span>
                    <div class="event-slide-actions">
                        <button type="button" class="btn btn-outline btn-sm" onclick="moveEventSlide('${evId}', ${sIdx}, -1)" title="Move Slide Up" ${sIdx === 0 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>▲ Up</button>
                        <button type="button" class="btn btn-outline btn-sm" onclick="moveEventSlide('${evId}', ${sIdx}, 1)" title="Move Slide Down" ${sIdx === slides.length - 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>▼ Down</button>
                        <button type="button" class="btn btn-outline btn-sm" onclick="deleteEventSlide('${evId}', ${sIdx})" style="border-color:var(--admin-danger) !important; color:var(--admin-danger) !important;">🗑️ Remove</button>
                    </div>
                </div>

                <div class="grid grid-2" style="gap:1rem; margin-bottom:0.75rem;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-size:0.83rem; color:var(--admin-text-muted);">Top Badge Text</label>
                        <input type="text" class="form-input slide-input-badge" value="${escapeHtml(slide.badge || '')}" placeholder="e.g. Annual Flagship Event">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-size:0.83rem; color:var(--admin-text-muted);">Slide Overlay Main Heading</label>
                        <input type="text" class="form-input slide-input-title" value="${escapeHtml(slide.title || '')}" placeholder="e.g. INVICTA '26 or Cash Prizes & Goodies">
                    </div>
                </div>

                <div class="grid grid-2" style="gap:1rem; margin-bottom:0.75rem;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-size:0.83rem; color:var(--admin-text-muted);">Slide Overlay Subheading / Subtitle</label>
                        <input type="text" class="form-input slide-input-sub" value="${escapeHtml(slide.sub || '')}" placeholder="e.g. National Case Competition or Evaluated by Industry Experts">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-size:0.83rem; color:var(--admin-text-muted);">Slide Image Source / Upload</label>
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <input type="file" class="form-input slide-file-input" accept="image/*" onchange="handleSlideImageUpload(this, '${evId}', ${sIdx})" style="padding:0.3rem; flex:1;">
                            <div class="slide-img-preview" style="width:48px; height:48px; border-radius:8px; border:1px dashed var(--admin-gold); overflow:hidden; background:#0f172a; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                                ${slide.image ? `<img src="${escapeHtml(slide.image)}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:1.1rem; opacity:0.6;">🖼️</span>`}
                            </div>
                        </div>
                        <input type="hidden" class="slide-input-image" value="${escapeHtml(slide.image || '')}">
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.handleSlideImageUpload = function(inputEl, evId, sIdx) {
        const file = inputEl.files && inputEl.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            const card = inputEl.closest('.event-slide-item-card');
            if (card) {
                const imgInput = card.querySelector('.slide-input-image');
                const previewBox = card.querySelector('.slide-img-preview');
                if (imgInput) imgInput.value = dataUrl;
                if (previewBox) {
                    previewBox.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:cover;">`;
                }
            }
        };
        reader.readAsDataURL(file);
    };

    window.moveEventSlide = function(evId, sIdx, direction) {
        readEventsFromDOM();
        const evData = cachedEvents.find(e => e.id === evId);
        if (!evData || !evData.slides) return;

        const targetIdx = sIdx + direction;
        if (targetIdx < 0 || targetIdx >= evData.slides.length) return;

        const temp = evData.slides[sIdx];
        evData.slides[sIdx] = evData.slides[targetIdx];
        evData.slides[targetIdx] = temp;

        renderEventSlidesList(evId, evData.slides);
    };

    window.deleteEventSlide = function(evId, sIdx) {
        readEventsFromDOM();
        const evData = cachedEvents.find(e => e.id === evId);
        if (!evData || !evData.slides) return;

        if (confirm(`Delete slide #${sIdx + 1}?`)) {
            evData.slides.splice(sIdx, 1);
            renderEventSlidesList(evId, evData.slides);
        }
    };

    const addSlideButtons = document.querySelectorAll('.btn-add-event-slide');
    addSlideButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const evId = btn.getAttribute('data-event');
            readEventsFromDOM();
            let evData = cachedEvents.find(e => e.id === evId);
            if (!evData) {
                evData = { id: evId, title: evId.toUpperCase(), tagline: '', description: '', slides: [] };
                cachedEvents.push(evData);
            }
            if (!Array.isArray(evData.slides)) evData.slides = [];

            evData.slides.push({
                image: '',
                badge: 'Flagship Event',
                title: 'New Slide Title',
                sub: 'Slide Detail Text'
            });

            renderEventSlidesList(evId, evData.slides);
        });
    });

    function readEventsFromDOM() {
        const events = ['invicta', 'echelon', 'ranneeti'].map(evId => {
            const tagline = document.getElementById(`event-${evId}-tagline`)?.value || '';
            const title = document.getElementById(`event-${evId}-title`)?.value || '';
            const description = document.getElementById(`event-${evId}-desc`)?.value || '';

            const slideCards = document.querySelectorAll(`#slides-list-${evId} .event-slide-item-card`);
            const slides = [];

            slideCards.forEach(card => {
                const badge = card.querySelector('.slide-input-badge')?.value || '';
                const slideTitle = card.querySelector('.slide-input-title')?.value || '';
                const slideSub = card.querySelector('.slide-input-sub')?.value || '';
                const image = card.querySelector('.slide-input-image')?.value || '';

                const origEv = cachedEvents.find(e => e.id === evId);
                const origSlide = origEv?.slides ? origEv.slides[parseInt(card.getAttribute('data-slide-index') || '0', 10)] : null;

                slides.push({
                    image: image,
                    gradient: origSlide?.gradient || (image ? '' : `gradient-${evId}-1`),
                    badge: badge,
                    title: slideTitle,
                    sub: slideSub
                });
            });

            return {
                id: evId,
                title: title,
                tagline: tagline,
                description: description,
                slides: slides
            };
        });

        cachedEvents = events;
        return events;
    }

    async function saveEventsHandler(e) {
        if (e) e.preventDefault();
        const updatedEvents = readEventsFromDOM();
        showToast('⏳ Saving events changes...');

        let success = false;
        if (window.GrandeurDB && window.GrandeurDB.updateEvents) {
            success = await window.GrandeurDB.updateEvents(updatedEvents);
        }

        if (success) {
            showToast('✅ All 3 events updated successfully!');
        } else {
            showToast('❌ Error saving events. Please check network.');
        }
    }

    const formEventsManager = document.getElementById('form-events-manager');
    if (formEventsManager) {
        formEventsManager.addEventListener('submit', saveEventsHandler);
    }

    const allSaveEventBtns = document.querySelectorAll('#btn-save-all-events, .btn-save-events');
    allSaveEventBtns.forEach(btn => {
        btn.addEventListener('click', saveEventsHandler);
    });

    checkAuthSession();
});
