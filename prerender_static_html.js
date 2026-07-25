const fs = require('fs');

console.log("Generating pre-rendered static HTML markup for all pages...");

// Load static data
const window = {};
eval(fs.readFileSync('static-data.js', 'utf8'));
const data = window.GRANDEUR_STATIC_DATA;

// 1. Move static-data.js and supabase-config.js script tags into <head> for all HTML files
const htmlFiles = [
    'index.html',
    'about-us.html',
    'what-we-do.html',
    'achievements.html',
    'knowledge-hub.html',
    'team.html',
    'alumni.html',
    'apply.html',
    'contact-us.html',
    'join-us.html',
    'admin.html'
];

htmlFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Remove static-data.js and supabase-config.js from bottom of body if present
    content = content.replace(/\s*<script src="static-data\.js.*?"?><\/script>\s*/g, '\n');
    content = content.replace(/\s*<script src="supabase-config\.js.*?"?><\/script>\s*/g, '\n');

    // Add to <head> before </head>
    if (!content.includes('static-data.js')) {
        content = content.replace(
            '</head>',
            '    <script src="static-data.js?v=2"></script>\n    <script src="supabase-config.js?v=2"></script>\n</head>'
        );
    }
    fs.writeFileSync(file, content, 'utf8');
});
console.log("Updated <head> script tags across all 11 HTML pages.");

// 2. Pre-render Alumni Cards in alumni.html
if (data.alumniMembers && data.alumniMembers.length > 0) {
    const alumni = data.alumniMembers;
    const batchesMap = {};
    alumni.forEach(item => {
        const parts = (item.role || '').split('|');
        let batchTitle = 'Alumni';
        if (parts.length > 1) {
            batchTitle = parts[0].trim();
        } else {
            const match = (item.role || '').match(/20\d\d/);
            batchTitle = match ? `Batch of ${match[0]}` : 'Legacy Alumni';
        }
        if (!batchTitle.startsWith('Batch of') && batchTitle !== 'Legacy Alumni') {
            batchTitle = `Batch of ${batchTitle}`;
        }

        if (!batchesMap[batchTitle]) {
            batchesMap[batchTitle] = [];
        }
        batchesMap[batchTitle].push(item);
    });

    const sortedBatches = Object.keys(batchesMap).sort((a, b) => {
        const yearA = (a.match(/20\d\d/) || [0])[0];
        const yearB = (b.match(/20\d\d/) || [0])[0];
        return parseInt(yearB, 10) - parseInt(yearA, 10);
    });

    const alumniPreRenderedHtml = sortedBatches.map(batchTitle => {
        const members = batchesMap[batchTitle];
        const cardsHtml = members.map(item => {
            const parts = (item.role || '').split('|');
            let roleAndPlacement = parts.length > 1 ? parts.slice(1).join('|').trim() : item.role || '';
            const roleSubParts = roleAndPlacement.split('•');
            const placement = roleSubParts.length > 1 ? roleSubParts[1].trim() : roleSubParts[0].trim();

            return `
                <div class="team-card">
                    ${item.photo ? `<img src="${item.photo}" alt="${item.name}" style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; margin: 1rem auto 0.5rem; border: 3px solid var(--primary-light); display: block;">` : `<div class="avatar-placeholder" style="width: 110px; height: 110px; border-radius: 50%; margin: 1rem auto 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 2rem;">🎓</div>`}
                    <div class="team-info">
                        <h3 class="team-name" style="margin-bottom: 0.35rem;">${item.name}</h3>
                        ${placement ? `<span class="team-role" style="display: block; color: var(--primary-light); font-weight: 600; font-size: 0.95rem; margin-bottom: 0.4rem;">${placement}</span>` : ''}
                        ${item.linkedin ? `<div style="margin-top: 0.4rem;"><a href="${item.linkedin}" target="_blank" rel="noopener noreferrer" style="color: #0077b5; font-size: 0.85rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.2rem;">LinkedIn ↗</a></div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="batch-section" style="margin-bottom: 3.5rem;">
                <h3 style="color: var(--primary-light); font-size: 1.5rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid rgba(var(--primary-rgb), 0.1); text-align: left;">
                    ${batchTitle}
                </h3>
                <div class="grid grid-4">
                    ${cardsHtml}
                </div>
            </div>
        `;
    }).join('');

    let alumniHtml = fs.readFileSync('alumni.html', 'utf8');
    const alumniContainerRegex = /<div id="dynamic-alumni-container">[\s\S]*?<\/div>\s*<script>/m;
    const replacement = `<div id="dynamic-alumni-container">\n${alumniPreRenderedHtml}\n</div>\n<script>`;
    alumniHtml = alumniHtml.replace(alumniContainerRegex, replacement);

    // Update inline script to be DOMContentLoaded ready
    const newAlumniScript = `document.addEventListener('DOMContentLoaded', async function loadLiveAlumni() {
                        const container = document.getElementById('dynamic-alumni-container');
                        if (!container) return;

                        try {
                            let alumni = (window.GRANDEUR_STATIC_DATA && window.GRANDEUR_STATIC_DATA.alumniMembers) || [];
                            if (window.GrandeurDB) {
                                try {
                                    const fetched = await window.GrandeurDB.getAlumniMembers();
                                    if (Array.isArray(fetched) && fetched.length > 0) alumni = fetched;
                                } catch(e) {}
                            }

                            if (Array.isArray(alumni) && alumni.length > 0) {
                                const batchesMap = {};
                                alumni.forEach(item => {
                                    const parts = (item.role || '').split('|');
                                    let batchTitle = 'Alumni';
                                    if (parts.length > 1) {
                                        batchTitle = parts[0].trim();
                                    } else {
                                        const match = (item.role || '').match(/20\\d\\d/);
                                        batchTitle = match ? \`Batch of \${match[0]}\` : 'Legacy Alumni';
                                    }
                                    if (!batchTitle.startsWith('Batch of') && batchTitle !== 'Legacy Alumni') {
                                        batchTitle = \`Batch of \${batchTitle}\`;
                                    }
                                    if (!batchesMap[batchTitle]) batchesMap[batchTitle] = [];
                                    batchesMap[batchTitle].push(item);
                                });

                                const sortedBatches = Object.keys(batchesMap).sort((a, b) => {
                                    const yearA = (a.match(/20\\d\\d/) || [0])[0];
                                    const yearB = (b.match(/20\\d\\d/) || [0])[0];
                                    return parseInt(yearB, 10) - parseInt(yearA, 10);
                                });

                                container.innerHTML = sortedBatches.map(batchTitle => {
                                    const members = batchesMap[batchTitle];
                                    const cardsHtml = members.map(item => {
                                        const parts = (item.role || '').split('|');
                                        let roleAndPlacement = parts.length > 1 ? parts.slice(1).join('|').trim() : item.role || '';
                                        const roleSubParts = roleAndPlacement.split('•');
                                        const placement = roleSubParts.length > 1 ? roleSubParts[1].trim() : roleSubParts[0].trim();
                                        return \`
                                            <div class="team-card">
                                                \${item.photo ? \`<img src="\${item.photo}" alt="\${item.name}" style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; margin: 1rem auto 0.5rem; border: 3px solid var(--primary-light); display: block;">\` : \`<div class="avatar-placeholder" style="width: 110px; height: 110px; border-radius: 50%; margin: 1rem auto 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 2rem;">🎓</div>\`}
                                                <div class="team-info">
                                                    <h3 class="team-name" style="margin-bottom: 0.35rem;">\${item.name}</h3>
                                                    \${placement ? \`<span class="team-role" style="display: block; color: var(--primary-light); font-weight: 600; font-size: 0.95rem; margin-bottom: 0.4rem;">\${placement}</span>\` : ''}
                                                    \${item.linkedin ? \`<div style="margin-top: 0.4rem;"><a href="\${item.linkedin}" target="_blank" rel="noopener noreferrer" style="color: #0077b5; font-size: 0.85rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.2rem;">LinkedIn ↗</a></div>\` : ''}
                                                </div>
                                            </div>
                                        \`;
                                    }).join('');
                                    return \`
                                        <div class="batch-section" style="margin-bottom: 3.5rem;">
                                            <h3 style="color: var(--primary-light); font-size: 1.5rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid rgba(var(--primary-rgb), 0.1); text-align: left;">
                                                \${batchTitle}
                                            </h3>
                                            <div class="grid grid-4">
                                                \${cardsHtml}
                                            </div>
                                        </div>
                                    \`;
                                }).join('');
                            }
                        } catch(e) { console.error("Alumni load error:", e); }
                    });`;

    alumniHtml = alumniHtml.replace(/\(async function loadLiveAlumni\(\) \{[\s\S]*?\}\)\(\);/m, newAlumniScript);
    fs.writeFileSync('alumni.html', alumniHtml, 'utf8');
    console.log("Pre-rendered alumni.html with 22 static Alumni Cards.");
}

// 3. Pre-render Knowledge Hub Cards in knowledge-hub.html
if (data.primers && data.primers.length > 0) {
    const primers = (data.primers || []).sort((a, b) => {
        const extractYear = (p) => {
            const str = String(p.date_label || p.year || '');
            const match = str.match(/\b(20\d\d|19\d\d)\b/);
            return match ? parseInt(match[1], 10) : 0;
        };
        return extractYear(b) - extractYear(a);
    });

    const primersPreRenderedHtml = primers.map(p => {
        const cat = p.category || 'Industry Research Report';
        const dateStr = p.date_label || p.year || '2026';
        const readTime = p.read_time || '';
        const hasUrl = p.pdf_url && p.pdf_url.length > 0;

        return `
            <div class="resource-card-item" data-category="${cat}">
                <div class="resource-card">
                    <div class="resource-meta">
                        <span class="resource-tag">${cat}</span>
                        <span class="resource-type">${dateStr}</span>
                    </div>
                    <h3>${p.title}</h3>
                    ${readTime ? `<p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.25rem;">${readTime}</p>` : ''}
                    <div class="resource-footer" style="justify-content: flex-end;">
                        <a href="${hasUrl ? p.pdf_url : '#'}" 
                           target="${hasUrl ? '_blank' : '_self'}" 
                           rel="noopener noreferrer"
                           class="resource-link">${hasUrl ? 'Read Here →' : 'Coming Soon'}</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    let khHtml = fs.readFileSync('knowledge-hub.html', 'utf8');
    const khGridRegex = /<div class="grid grid-3" id="resources-list-grid">[\s\S]*?<\/div>\s*<script>/m;
    const khReplacement = `<div class="grid grid-3" id="resources-list-grid">\n${primersPreRenderedHtml}\n</div>\n<script>`;
    khHtml = khHtml.replace(khGridRegex, khReplacement);

    const newKhScript = `document.addEventListener('DOMContentLoaded', async function loadLiveKnowledgeHub() {
                        const grid = document.getElementById('resources-list-grid');
                        if (!grid) return;

                        try {
                            let data = (window.GRANDEUR_STATIC_DATA && window.GRANDEUR_STATIC_DATA.primers) || [];
                            if (window.GrandeurDB) {
                                try {
                                    const fetched = await window.GrandeurDB.getKnowledgePrimers();
                                    if (Array.isArray(fetched) && fetched.length > 0) data = fetched;
                                } catch(e) {}
                            }
                            if (Array.isArray(data) && data.length > 0) {
                                const primers = data.sort((a, b) => {
                                    const extractYear = (p) => {
                                        const str = String(p.date_label || p.year || '');
                                        const match = str.match(/\\b(20\\d\\d|19\\d\\d)\\b/);
                                        return match ? parseInt(match[1], 10) : 0;
                                    };
                                    return extractYear(b) - extractYear(a);
                                });
                                grid.innerHTML = primers.map(p => {
                                    const cat = p.category || 'Industry Research Report';
                                    const dateStr = p.date_label || p.year || '2026';
                                    const readTime = p.read_time || '';
                                    const hasUrl = p.pdf_url && p.pdf_url.length > 0;
                                    return \`
                                        <div class="resource-card-item" data-category="\${cat}">
                                            <div class="resource-card">
                                                <div class="resource-meta">
                                                    <span class="resource-tag">\${cat}</span>
                                                    <span class="resource-type">\${dateStr}</span>
                                                </div>
                                                <h3>\${p.title}</h3>
                                                \${readTime ? \`<p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.25rem;">\${readTime}</p>\` : ''}
                                                <div class="resource-footer" style="justify-content: flex-end;">
                                                    <a href="\${hasUrl ? p.pdf_url : '#'}" 
                                                       target="\${hasUrl ? '_blank' : '_self'}" 
                                                       rel="noopener noreferrer"
                                                       class="resource-link">\${hasUrl ? 'Read Here →' : 'Coming Soon'}</a>
                                                </div>
                                            </div>
                                        </div>
                                    \`;
                                }).join('');
                            }
                        } catch(e) { console.error("Knowledge Hub load error:", e); }
                    });`;

    khHtml = khHtml.replace(/\(async function loadLiveKnowledgeHub\(\) \{[\s\S]*?\}\)\(\);/m, newKhScript);
    fs.writeFileSync('knowledge-hub.html', khHtml, 'utf8');
    console.log("Pre-rendered knowledge-hub.html with 12 static Primer Cards.");
}

console.log("Pre-rendering complete!");
