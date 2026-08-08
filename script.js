document.addEventListener('DOMContentLoaded', () => {
    // 0. Auto-Expiry & Deletion Handler for Ranneeti (Auto-hides links and redirects after Aug 12th 23:59:59 IST)
    const RANNEETI_EXPIRY = new Date("2026-08-12T23:59:59+05:30").getTime();
    if (Date.now() > RANNEETI_EXPIRY) {
        document.querySelectorAll('.nav-link-ranneeti').forEach(el => {
            const li = el.closest('li');
            if (li) li.remove();
        });
        document.querySelectorAll('.footer-links a[href="ranneeti.html"]').forEach(el => {
            const li = el.closest('li');
            if (li) li.remove();
        });
        if (window.location.pathname.endsWith('ranneeti.html')) {
            window.location.replace('index.html');
        }
    }

    // 1. Header scroll effect
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // 2. Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        const closeMenu = () => {
            navLinks.classList.remove('active');
            menuToggle.classList.remove('active');
            document.body.classList.remove('menu-open');
            const spans = menuToggle.querySelectorAll('span');
            if (spans.length >= 3) {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        };

        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active');
            document.body.classList.toggle('menu-open');
            const spans = menuToggle.querySelectorAll('span');
            if (spans.length >= 3) {
                if (menuToggle.classList.contains('active')) {
                    spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
                    spans[1].style.opacity = '0';
                    spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
                } else {
                    spans[0].style.transform = 'none';
                    spans[1].style.opacity = '1';
                    spans[2].style.transform = 'none';
                }
            }
        });

        // Auto-close menu when clicking a nav link
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Auto-close menu when clicking outside header
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && header && !header.contains(e.target)) {
                closeMenu();
            }
        });
    }

    // 3. Stats Counter Animation
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');

    if (statNumbers.length > 0) {
        const animateCounter = (element) => {
            if (element.dataset.animated === "true") return;
            element.dataset.animated = "true";

            const targetAttr = element.getAttribute('data-target');
            if (!targetAttr) return;
            const target = parseInt(targetAttr, 10);
            if (isNaN(target)) return;

            const prefix = element.getAttribute('data-prefix') || '';
            const suffix = element.getAttribute('data-suffix') || '';
            const duration = 2000; // ms
            let startTime = null;

            // Set initial state to 0 as animation starts
            element.textContent = prefix + '0' + suffix;

            const step = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease-out cubic calculation
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const currentCount = Math.floor(easeOut * target);

                element.textContent = prefix + currentCount.toLocaleString() + suffix;

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    element.textContent = prefix + target.toLocaleString() + suffix;
                }
            };

            requestAnimationFrame(step);
        };

        const checkAndAnimate = () => {
            statNumbers.forEach(element => {
                if (element.dataset.animated === "true") return;
                const rect = element.getBoundingClientRect();
                const windowHeight = window.innerHeight || document.documentElement.clientHeight;
                if (rect.top <= windowHeight * 0.95 && rect.bottom >= 0) {
                    animateCounter(element);
                }
            });
        };

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting || entry.intersectionRatio > 0) {
                        animateCounter(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0, rootMargin: '0px 0px -20px 0px' });

            statNumbers.forEach(num => observer.observe(num));
        }

        // Run immediate check and add scroll/resize listener fallbacks
        checkAndAnimate();
        window.addEventListener('scroll', checkAndAnimate, { passive: true });
        window.addEventListener('resize', checkAndAnimate, { passive: true });
        setTimeout(checkAndAnimate, 300);
        setTimeout(checkAndAnimate, 1000);
    }

    // 5. Contact Form Button Handler
    const btnSendAnother = document.getElementById('btn-send-another');
    if (btnSendAnother) {
        btnSendAnother.addEventListener('click', () => {
            const wrapper = document.getElementById('contact-form-wrapper');
            const successState = document.getElementById('contact-success-state');
            const contactForm = document.getElementById('contact-form');
            if (contactForm) contactForm.reset();
            if (wrapper && successState) {
                successState.style.display = 'none';
                wrapper.style.display = 'block';
            }
        });
    }

    function showError(input, message) {
        const group = input.parentElement;
        let error = group.querySelector('.error-message');
        if (!error) {
            error = document.createElement('span');
            error.className = 'error-message';
            error.style.color = '#dc2626';
            error.style.fontSize = '0.8rem';
            error.style.marginTop = '0.25rem';
            error.style.display = 'block';
            group.appendChild(error);
        }
        error.textContent = message;
        input.style.borderColor = '#dc2626';
    }

    function clearError(input) {
        const group = input.parentElement;
        const error = group.querySelector('.error-message');
        if (error) {
            error.remove();
        }
        input.style.borderColor = '';
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    // 6. Achievements Slideshow
    const slidesWrapper = document.querySelector('.slides-wrapper');
    const slides = document.querySelectorAll('.achieve-slide');
    const prevBtn = document.querySelector('.slider-btn.prev');
    const nextBtn = document.querySelector('.slider-btn.next');
    const dotsContainer = document.querySelector('.slider-dots');

    if (slidesWrapper && slides.length > 0) {
        let currentSlide = 0;
        const totalSlides = slides.length;

        // Create dots dynamically
        slides.forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.className = `slider-dot ${idx === 0 ? 'active' : ''}`;
            dot.setAttribute('data-slide', idx);
            dotsContainer.appendChild(dot);
        });

        const dots = document.querySelectorAll('.slider-dot');

        const updateSlider = (idx) => {
            slidesWrapper.style.transform = `translateX(-${idx * 25}%)`;
            dots.forEach(dot => dot.classList.remove('active'));
            dots[idx].classList.add('active');
            currentSlide = idx;
        };

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                let next = (currentSlide + 1) % totalSlides;
                updateSlider(next);
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                let prev = (currentSlide - 1 + totalSlides) % totalSlides;
                updateSlider(prev);
            });
        }

        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const idx = parseInt(dot.getAttribute('data-slide'), 10);
                updateSlider(idx);
            });
        });

        // Mobile touch swipe gestures
        let touchStartX = 0;
        let touchEndX = 0;

        slidesWrapper.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        slidesWrapper.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 40) {
                // Swipe Left -> Next slide
                let next = (currentSlide + 1) % totalSlides;
                updateSlider(next);
            } else if (touchEndX - touchStartX > 40) {
                // Swipe Right -> Prev slide
                let prev = (currentSlide - 1 + totalSlides) % totalSlides;
                updateSlider(prev);
            }
        }, { passive: true });

        // Auto-rotation every 6 seconds
        setInterval(() => {
            let next = (currentSlide + 1) % totalSlides;
            updateSlider(next);
        }, 6000);
    }

    // 7. Knowledge Hub Resources Filtering & Searching
    const resourceFilterButtons = document.querySelectorAll('.resource-filter-btn');
    const resourceCards = document.querySelectorAll('.resource-card-item');
    const resourceSearchInput = document.querySelector('.resource-search-input');

    const filterResources = () => {
        const activeFilterBtn = document.querySelector('.resource-filter-btn.active');
        const filterValue = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
        const searchValue = resourceSearchInput ? resourceSearchInput.value.toLowerCase().trim() : '';

        let visibleCount = 0;

        resourceCards.forEach(card => {
            const category = card.getAttribute('data-category');
            const title = card.querySelector('h3') ? card.querySelector('h3').textContent.toLowerCase() : '';
            const description = card.querySelector('p') ? card.querySelector('p').textContent.toLowerCase() : '';

            const matchesFilter = filterValue === 'all' || category === filterValue;
            const matchesSearch = title.includes(searchValue) || description.includes(searchValue);

            if (matchesFilter && matchesSearch) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Count badge preserved statically with Linktree icon link
        // const countBadge = document.getElementById('resource-count-badge');
        // if (countBadge) {
        //     countBadge.textContent = `${visibleCount} ${visibleCount === 1 ? 'Resource' : 'Resources'} Available`;
        // }
    };

    if (resourceFilterButtons.length > 0) {
        resourceFilterButtons.forEach(button => {
            button.addEventListener('click', () => {
                resourceFilterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                if (window.innerWidth <= 768) {
                    button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
                filterResources();
            });
        });
    }

    if (resourceSearchInput) {
        resourceSearchInput.addEventListener('input', filterResources);
    }

    // 8. Alumni Filtering & Searching
    const alumniFilterButtons = document.querySelectorAll('.alumni-filter-btn');
    const alumniCards = document.querySelectorAll('#alumni-grid .team-card');
    const alumniSearchInput = document.querySelector('.alumni-search-input');

    const filterAlumni = () => {
        const activeFilterBtn = document.querySelector('.alumni-filter-btn.active');
        const filterValue = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
        const searchValue = alumniSearchInput ? alumniSearchInput.value.toLowerCase().trim() : '';

        alumniCards.forEach(card => {
            const category = card.getAttribute('data-category');
            const name = card.querySelector('.team-name') ? card.querySelector('.team-name').textContent.toLowerCase() : '';
            const roles = Array.from(card.querySelectorAll('.team-role')).map(role => role.textContent.toLowerCase()).join(' ');

            const matchesFilter = filterValue === 'all' || category === filterValue;
            const matchesSearch = name.includes(searchValue) || roles.includes(searchValue);

            if (matchesFilter && matchesSearch) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    };

    if (alumniFilterButtons.length > 0) {
        alumniFilterButtons.forEach(button => {
            button.addEventListener('click', () => {
                alumniFilterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                if (window.innerWidth <= 768) {
                    button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
                filterAlumni();
            });
        });
    }

    if (alumniSearchInput) {
        alumniSearchInput.addEventListener('input', filterAlumni);
    }

    // 9. About Slider (Home Page Auto-Swiping Cards)
    const aboutSlides = document.querySelectorAll('.about-slide');
    const prevAboutBtn = document.getElementById('about-prev-btn');
    const nextAboutBtn = document.getElementById('about-next-btn');
    
    if (aboutSlides.length > 0) {
        let currentAboutSlide = 0;
        let aboutInterval;

        const updateAboutSlider = (idx) => {
            aboutSlides.forEach((slide, sIdx) => {
                if (sIdx === idx) {
                    slide.classList.add('active');
                } else {
                    slide.classList.remove('active');
                }
            });

            currentAboutSlide = idx;
        };

        const startAboutTimer = () => {
            clearInterval(aboutInterval);
            aboutInterval = setInterval(() => {
                let next = (currentAboutSlide + 1) % aboutSlides.length;
                updateAboutSlider(next);
            }, 3000);
        };

        if (prevAboutBtn) {
            prevAboutBtn.addEventListener('click', () => {
                let prev = (currentAboutSlide - 1 + aboutSlides.length) % aboutSlides.length;
                updateAboutSlider(prev);
                startAboutTimer();
            });
        }

        if (nextAboutBtn) {
            nextAboutBtn.addEventListener('click', () => {
                let next = (currentAboutSlide + 1) % aboutSlides.length;
                updateAboutSlider(next);
                startAboutTimer();
            });
        }

        const aboutSliderContainer = document.querySelector('.about-slider-container');
        if (aboutSliderContainer) {
            aboutSliderContainer.addEventListener('mouseenter', () => clearInterval(aboutInterval));
            aboutSliderContainer.addEventListener('mouseleave', startAboutTimer);

            let touchStartX = 0;
            let touchEndX = 0;
            aboutSliderContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            aboutSliderContainer.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                if (touchStartX - touchEndX > 50) {
                    let next = (currentAboutSlide + 1) % aboutSlides.length;
                    updateAboutSlider(next);
                    startAboutTimer();
                } else if (touchEndX - touchStartX > 50) {
                    let prev = (currentAboutSlide - 1 + aboutSlides.length) % aboutSlides.length;
                    updateAboutSlider(prev);
                    startAboutTimer();
                }
            }, { passive: true });
        }

        // Initialize timer
        startAboutTimer();
    }

    // 10. Interactive Collaborators Marquee
    const marqueeContainer = document.querySelector('.marquee-container');
    const marqueeContent = document.querySelector('.marquee-content');

    if (marqueeContainer && marqueeContent) {
        // Remove CSS animation so JS can control scroll position
        marqueeContent.classList.remove('autoplay-css');
        
        let isDown = false;
        let startX;
        let scrollLeftVal;
        let autoScrollSpeed = 0.4; // Pixels per frame (slowed down for smoother reading)
        let isInteracting = false;
        let interactionTimeout;
        
        // We have duplicated elements, so half of scrollWidth is the loop point
        let halfWidth = marqueeContent.scrollWidth / 2;
        
        // Recalculate widths on load and resize
        const recalculateWidth = () => {
            halfWidth = marqueeContent.scrollWidth / 2;
        };
        window.addEventListener('load', recalculateWidth);
        window.addEventListener('resize', recalculateWidth);
        
        // Auto-scroll loop
        function step() {
            if (!isDown && !isInteracting) {
                marqueeContainer.scrollLeft += autoScrollSpeed;
                
                // Loop scroll position
                if (marqueeContainer.scrollLeft >= halfWidth) {
                    marqueeContainer.scrollLeft = 0;
                }
            }
            requestAnimationFrame(step);
        }
        
        // Start auto-scroll
        requestAnimationFrame(step);
        
        // Reset interaction flag after a delay
        function resetInteractionTimer() {
            clearTimeout(interactionTimeout);
            interactionTimeout = setTimeout(() => {
                isInteracting = false;
            }, 3000); // Resume auto-scroll after 3 seconds of inactivity
        }
        
        // Drag-to-scroll event handlers
        marqueeContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            isInteracting = true;
            startX = e.pageX - marqueeContainer.offsetLeft;
            scrollLeftVal = marqueeContainer.scrollLeft;
            clearTimeout(interactionTimeout);
        });
        
        marqueeContainer.addEventListener('mouseleave', () => {
            isDown = false;
            if (isInteracting) resetInteractionTimer();
        });
        
        marqueeContainer.addEventListener('mouseup', () => {
            isDown = false;
            if (isInteracting) resetInteractionTimer();
        });
        
        marqueeContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - marqueeContainer.offsetLeft;
            const walk = (x - startX) * 1.5; // Scroll speed multiplier
            let targetScroll = scrollLeftVal - walk;
            
            // Loop bounds while dragging
            if (targetScroll >= halfWidth) {
                targetScroll = targetScroll - halfWidth;
                startX = x; // Reset start coordinates to prevent jump
                scrollLeftVal = targetScroll;
            } else if (targetScroll <= 0) {
                targetScroll = halfWidth + targetScroll;
                startX = x;
                scrollLeftVal = targetScroll;
            }
            
            marqueeContainer.scrollLeft = targetScroll;
        });
        
        // Mouse wheel horizontal scrolling
        marqueeContainer.addEventListener('wheel', (e) => {
            isInteracting = true;
            // Check if user is scrolling vertically or horizontally
            const scrollDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            
            let targetScroll = marqueeContainer.scrollLeft + scrollDelta;
            
            // Loop bounds while wheel scrolling
            if (targetScroll >= halfWidth) {
                targetScroll = targetScroll - halfWidth;
            } else if (targetScroll <= 0) {
                targetScroll = halfWidth + targetScroll;
            }
            
            marqueeContainer.scrollLeft = targetScroll;
            resetInteractionTimer();
            e.preventDefault(); // Prevent page scroll
        }, { passive: false });
    }

    // ----------------------------------------------------------------------
    // 6. GRANDEUR CMS DYNAMIC SYNCHRONIZATION & ADMIN ACCESS SHORTCUT
    // ----------------------------------------------------------------------

    // Admin Access Keyboard Shortcut (Ctrl + Shift + A)
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
            window.location.href = 'admin.html';
        }
    });



    async function syncGrandeurCMS() {
        const teamHierarchy = document.querySelector('.team-hierarchy');

        let recData = null;
        let localStore = null;

        const dataStr = localStorage.getItem('grandeur_admin_store');
        if (dataStr) {
            try {
                localStore = JSON.parse(dataStr);
            } catch (e) {}
        }

        if (window.GrandeurDB && typeof window.GrandeurDB.getRecruitment === 'function') {
            try {
                recData = await window.GrandeurDB.getRecruitment();
            } catch (err) {
                console.warn("Recruitment fetch warning:", err);
            }
        }

        const localRec = (localStore && localStore.recruitment) ? localStore.recruitment : {};

        let isActive = false;
        if (recData && typeof recData === 'object' && recData.active !== undefined && recData.active !== null) {
            isActive = recData.active === true || recData.active === 'true';
        } else if (localStore && localStore.recruitment && localStore.recruitment.active !== undefined) {
            isActive = localRec.active === true || localRec.active === 'true';
        }

        const finalRec = {
            active: isActive,
            title: recData?.title || localRec?.title || "Grandeur Recruitment Drive 2026",
            description: recData?.description || localRec?.description || "Join the premier Consulting & Knowledge Cell of SSCBS.",
            deadline: recData?.deadline || localRec?.deadline || "August 20, 2026",
            deadline_datetime: recData?.deadline_datetime || localRec?.deadline_datetime || ""
        };

        applyRecruitmentState(finalRec);

        if (teamHierarchy) {
            if (window.GrandeurDB) {
                try {
                    const teamData = await window.GrandeurDB.getTeamMembers();
                    if (teamData && teamData.length > 0) {
                        renderDynamicTeamGrid(teamData, teamHierarchy);
                        return;
                    }
                } catch(e) {}
            }
            if (localStore && localStore.team) {
                renderDynamicTeamGrid(localStore.team, teamHierarchy);
            }
        }

        const liveProjectsContainer = document.getElementById('live-projects-container');
        if (liveProjectsContainer) {
            let liveProjectsData = null;
            if (window.GrandeurDB && typeof window.GrandeurDB.getLiveProjects === 'function') {
                try {
                    liveProjectsData = await window.GrandeurDB.getLiveProjects();
                } catch(e) {}
            }
            if (!liveProjectsData && localStore && localStore.live_projects) {
                liveProjectsData = localStore.live_projects;
            }
            renderDynamicLiveProjects(liveProjectsData || [], liveProjectsContainer);
        }

        const eventsContainer = document.querySelector('#events-section .events-grid');
        if (eventsContainer) {
            let eventsData = null;
            if (window.GrandeurDB && typeof window.GrandeurDB.getEvents === 'function') {
                try {
                    eventsData = await window.GrandeurDB.getEvents();
                } catch(e) {}
            }
            if (!eventsData && localStore && localStore.events) {
                eventsData = localStore.events;
            }
            if (eventsData && eventsData.length > 0) {
                renderDynamicEvents(eventsData, eventsContainer);
            }
        }
    }

    function isRecruitmentActive(recData) {
        if (!recData || typeof recData !== 'object') return false;
        return recData.active === true || recData.active === 'true';
    }

    function isRecruitmentExpired(recData) {
        if (!recData || typeof recData !== 'object') return false;
        const dtStr = recData.deadline_datetime || recData.deadlineDatetime;
        if (dtStr) {
            const cutoff = new Date(dtStr).getTime();
            if (!isNaN(cutoff) && Date.now() > cutoff) {
                return true;
            }
        }
        return false;
    }

    function applyRecruitmentState(recData) {
        if (!recData) return;
        const isActive = isRecruitmentActive(recData);
        const isExpired = isRecruitmentExpired(recData);

        const title = (recData && typeof recData.title === 'string' && recData.title.trim() !== '') ? recData.title.trim() : 'Grandeur Recruitment Drive 2026';
        const description = (recData && typeof recData.description === 'string' && recData.description.trim() !== '') ? recData.description.trim() : 'Join the premier Consulting & Knowledge Cell of SSCBS.';
        const deadline = (recData && typeof recData.deadline === 'string' && recData.deadline.trim() !== '') ? recData.deadline.trim() : 'August 20, 2026';

        // 1. Header & footer "Join Grandeur" nav links:
        const joinNavElements = document.querySelectorAll('.nav-item-join, .footer-join-link');
        joinNavElements.forEach(el => {
            el.style.display = (isActive && !isExpired) ? 'inline-block' : 'none';
        });

        // 2. Render Join Us page states
        const activeContainer = document.getElementById('join-active-state');
        const closedContainer = document.getElementById('join-closed-state');

        if (activeContainer && closedContainer) {
            if (!isActive || isExpired) {
                activeContainer.style.display = 'none';
                closedContainer.style.display = 'block';
            } else {
                activeContainer.style.display = 'block';
                closedContainer.style.display = 'none';

                const titleEl = document.getElementById('join-drive-title');
                if (titleEl) titleEl.textContent = title;

                const subtitleEl = document.getElementById('app-drive-subtitle');
                if (subtitleEl) subtitleEl.textContent = title;

                const descEl = document.getElementById('join-drive-desc');
                if (descEl) descEl.textContent = description;

                const deadlineEl = document.getElementById('join-drive-deadline');
                if (deadlineEl) deadlineEl.textContent = deadline;

                const applyBtns = document.querySelectorAll('.join-apply-btn');
                applyBtns.forEach(btn => {
                    btn.href = 'apply.html';
                });
            }
        }
    }

    function renderDynamicTeamGrid(teamMembers, container) {
        if (!container) return;
        if (!teamMembers || teamMembers.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem; color: #94a3b8; background: rgba(30, 41, 59, 0.4); border: 1px dashed rgba(212, 175, 55, 0.3); border-radius: 16px; max-width: 600px; margin: 2rem auto;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👥</div>
                    <h3 style="color: #f8fafc; margin-bottom: 0.5rem;">No Active Team Members Listed</h3>
                    <p style="font-size: 0.95rem;">Use the Grandeur Admin Console to add team members, photos, and roles.</p>
                </div>
            `;
            return;
        }

        // Group by 6 official tiers
        const tiers = {
            faculty: { title: "Faculty In-Charge", members: [] },
            board: { title: "President & Vice President", members: [] },
            coordinators: { title: "Co-ordinators", members: [] },
            organizing: { title: "Board of Directors", members: [] },
            advisory: { title: "Advisory Committee", members: [] },
            core: { title: "Core Committee", members: [] }
        };

        teamMembers.forEach(m => {
            const key = (m.tier || 'core').toLowerCase();
            if (tiers[key]) {
                tiers[key].members.push(m);
            } else {
                tiers.core.members.push(m);
            }
        });

        function sortCategoryMembers(tierKey, membersList) {
            if (tierKey === 'board') {
                return [...membersList].sort((a, b) => {
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
            }

            return [...membersList].sort((a, b) => {
                return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
            });
        }

        // Build HTML
        let html = '';
        Object.keys(tiers).forEach(tierKey => {
            const tierData = tiers[tierKey];
            const sortedMembers = sortCategoryMembers(tierKey, tierData.members);
            if (sortedMembers.length > 0) {
                html += `
                    <div class="hierarchy-section" data-tier="${tierKey}">
                        <h4 class="tier-title">${tierData.title}</h4>
                        <div class="team-grid tier-grid-1">
                            ${sortedMembers.map(m => {
                                const initials = (m.name || 'M').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                const avatarHtml = m.photo ? 
                                    `<img src="${escapeHtml(m.photo)}" alt="${escapeHtml(m.name)}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin: 1.5rem auto 0.5rem; border: 3px solid var(--primary-light); display: block; box-shadow: var(--shadow-md);">` :
                                    `<div class="avatar-placeholder" style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; margin: 1.5rem auto 0.5rem; border: 3px solid var(--primary-light); box-shadow: var(--shadow-md);">${initials}</div>`;

                                const linkedinHtml = m.linkedin ? `
                                    <div style="margin-top: 0.75rem;">
                                        <a href="${escapeHtml(m.linkedin)}" target="_blank" style="color: #0077b5; font-size: 0.85rem; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem;">
                                            <span>LinkedIn</span> ↗
                                        </a>
                                    </div>
                                ` : '';

                                return `
                                    <div class="team-card">
                                        ${avatarHtml}
                                        <div class="team-info">
                                            <h3 class="team-name">${escapeHtml(m.name)}</h3>
                                            <span class="team-role">${escapeHtml(m.role)}</span>
                                            ${linkedinHtml}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        });

        if (html) container.innerHTML = html;
    }

    window.renderDynamicTeamGrid = renderDynamicTeamGrid;

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
                    if (parsed.logo && !parsed.logo.startsWith('data:image')) logo = parsed.logo;
                    if (parsed.members) members = parsed.members;
                    if (parsed.category_tier) category_tier = parsed.category_tier;
                }
            } catch (e) {
                if (typeof item.team_name === 'string') {
                    members = item.team_name;
                }
            }
        }

        if (logo && logo.startsWith('data:image')) {
            logo = '';
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

    function renderSingleAchievementCard(item, cardIdx) {
        const meta = parseAchievementMeta(item);
        
        const posLower = meta.position.toLowerCase();
        let rankClass = 'rank-general';
        let rankIcon = '🏆';
        if (posLower.includes('1st') || posLower.includes('winner')) {
            rankClass = 'rank-gold';
            rankIcon = '🥇';
        } else if (posLower.includes('2nd') || posLower.includes('runner')) {
            rankClass = 'rank-silver';
            rankIcon = '🥈';
        } else if (posLower.includes('3rd') || posLower.includes('podium')) {
            rankClass = 'rank-bronze';
            rankIcon = '🥉';
        } else if (posLower.includes('finalist') || posLower.includes('qualifier')) {
            rankClass = 'rank-general';
            rankIcon = '🌟';
        }

        const logoMarkup = meta.logo ?
            `<div class="achievement-institution-logo-wrap"><img src="${escapeHtml(meta.logo)}" alt="${escapeHtml(meta.title)} Logo" class="achievement-institution-logo"></div>` :
            `<div class="achievement-institution-logo-wrap fallback"><span style="font-size: 1.5rem;">🏛️</span></div>`;

        const descValid = meta.description && meta.description.trim() !== '' && meta.description.trim().toLowerCase() !== 'no';

        return `
            <div class="achievement-horizontal-card" data-card-index="${cardIdx}">
                <div class="achievement-card-left">
                    ${logoMarkup}
                </div>
                <div class="achievement-card-center">
                    <div class="achievement-title-row">
                        <h3 class="achievement-card-title">${escapeHtml(meta.title)}</h3>
                        <span class="achievement-year-badge">${escapeHtml(meta.year)}</span>
                    </div>
                    ${meta.members ? `
                        <div class="achievement-members-row">
                            <span style="font-size:0.9rem;">👥</span>
                            <span class="members-text"><strong>Team Members:</strong> ${escapeHtml(meta.members)}</span>
                        </div>
                    ` : ''}
                    ${descValid ? `
                        <div class="achievement-desc-row">
                            <span style="font-size:0.9rem;">👥</span>
                            <span class="desc-text">${escapeHtml(meta.description)}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="achievement-card-right">
                    <span class="achievement-rank-pill ${rankClass}" style="position: static; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-size: 0.82rem; font-weight: 700; padding: 0.4rem 0.95rem; border-radius: 20px;">${rankIcon} ${escapeHtml(meta.position)}</span>
                </div>
            </div>
        `;
    }

    function renderDynamicAchievements(achievementsList, container) {
        if (!container) return;
        if (!achievementsList || achievementsList.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No achievements published yet. Check back soon!</div>`;
            return;
        }

        const tierDefs = [
            { key: 'global', title: 'Global Corporate Victories' },
            { key: 'top_bschools', title: 'IIMs, IITs & Premier B-Schools' },
            { key: 'du_circuit', title: 'DU Circuit & National Forums' }
        ];

        const grouped = {
            global: [],
            top_bschools: [],
            du_circuit: []
        };

        achievementsList.forEach(item => {
            const meta = parseAchievementMeta(item);
            const key = grouped[meta.category_tier] ? meta.category_tier : 'du_circuit';
            grouped[key].push(item);
        });

        // Sort items inside each tier by display_order
        Object.keys(grouped).forEach(k => {
            grouped[k].sort((a, b) => {
                const metaA = parseAchievementMeta(a);
                const metaB = parseAchievementMeta(b);
                const orderA = metaA.display_order !== undefined ? metaA.display_order : 9999;
                const orderB = metaB.display_order !== undefined ? metaB.display_order : 9999;
                if (orderA !== orderB) return orderA - orderB;
                return parseInt(metaB.year, 10) - parseInt(metaA.year, 10);
            });
        });

        let cardCounter = 0;
        let html = '';

        tierDefs.forEach(tier => {
            const items = grouped[tier.key];
            if (items && items.length > 0) {
                html += `
                    <div class="hierarchy-section" data-tier="${tier.key}" style="margin-bottom: 4rem;">
                        <h4 class="tier-title">${tier.title}</h4>
                        <div class="achievements-horizontal-list">
                            ${items.map(item => renderSingleAchievementCard(item, cardCounter++)).join('')}
                        </div>
                    </div>
                `;
            }
        });

        if (!html) {
            html = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No achievements published yet. Check back soon!</div>`;
        }

        container.innerHTML = html;
    }

    window.renderDynamicAchievements = renderDynamicAchievements;

    const LP_DEFAULT_LOGOS = {
        'lp_honasa': 'collab-honasa.png',
        'lp_krafton': 'collab-krafton.png',
        'lp_3': 'collab-meltingpot.png',
        'lp_4': 'collab-hdfc.png',
        'lp_5': 'collab-yesbank.png',
        'lp_6': 'collab-kenresearch.png',
        'lp_7': 'collab-unstop.png',
        'lp_8': 'collab-medulance.png',
        'lp_9': 'collab-meteor.png',
        'lp_10': 'collab-unmay.png',
        'lp_11': 'collab-catalystiq.png',
        'lp_12': 'collab-hobbeeme.png'
    };

    const LP_TITLE_LOGOS = {
        'honasa': 'collab-honasa.png',
        'mamaearth': 'collab-honasa.png',
        'krafton': 'collab-krafton.png',
        'melting': 'collab-meltingpot.png',
        'hdfc': 'collab-hdfc.png',
        'yes bank': 'collab-yesbank.png',
        'ken research': 'collab-kenresearch.png',
        'unstop': 'collab-unstop.png',
        'medulance': 'collab-medulance.png',
        'meteor': 'collab-meteor.png',
        'unmay': 'collab-unmay.png',
        'catalyst': 'collab-catalystiq.png',
        'hobbeeme': 'collab-hobbeeme.png'
    };

    function renderDynamicLiveProjects(projectsList, container) {
        if (!container) return;
        if (!projectsList || projectsList.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-light, #f8fafc); border-radius: 16px; border: 1px dashed var(--border, #e2e8f0); color: var(--text-muted, #64748b);">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">🚀</div>
                <h4 style="margin: 0 0 0.5rem 0; color: var(--dark, #0f1d3a); font-weight: 600;">No Live Projects Listed Yet</h4>
                <p style="margin: 0; font-size: 0.9rem;">Check back soon for new consulting engagements and partner collaborations!</p>
            </div>`;
            return;
        }

        const html = projectsList.map(item => {
            const title = escapeHtml(item.title || item.client_name || '');

            const description = escapeHtml(item.description || '');

            let logo = item.logo || item.client_logo || '';
            if (!logo) {
                if (item.id && LP_DEFAULT_LOGOS[item.id]) {
                    logo = LP_DEFAULT_LOGOS[item.id];
                } else {
                    const titleLower = (item.title || item.client_name || '').toLowerCase();
                    for (const [key, val] of Object.entries(LP_TITLE_LOGOS)) {
                        if (titleLower.includes(key)) {
                            logo = val;
                            break;
                        }
                    }
                }
            }

            const avatarHtml = logo 
                ? `<div class="lp-client-logo"><img src="${logo}" alt="${title}"></div>`
                : `<div class="lp-client-avatar">🏢</div>`;

            return `
                <div class="lp-card">
                    <div class="lp-card-header">
                        <div class="lp-client-badge">
                            ${avatarHtml}
                        </div>

                    </div>
                    <h3>${title}</h3>
                    <p style="margin-bottom: 0;">${description}</p>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    window.renderDynamicLiveProjects = renderDynamicLiveProjects;

    window.addEventListener('grandeur_store_updated', async () => {
        const liveProjectsContainer = document.getElementById('live-projects-container');
        if (liveProjectsContainer && window.GrandeurDB && typeof window.GrandeurDB.getLiveProjects === 'function') {
            try {
                const updatedProjects = await window.GrandeurDB.getLiveProjects();
                renderDynamicLiveProjects(updatedProjects || [], liveProjectsContainer);
            } catch(e) {}
        }
    });

    function renderDynamicEvents(eventsList, container) {
        if (!container) return;
        if (!Array.isArray(eventsList) || eventsList.length === 0) return;

        const html = eventsList.map(ev => {
            const title = escapeHtml(ev.title || '');
            const tagline = escapeHtml(ev.tagline || '');
            const desc = escapeHtml(ev.description || '');
            const slides = Array.isArray(ev.slides) ? ev.slides : [];

            const slidesHtml = slides.map(slide => {
                const img = escapeHtml(slide.image || '');
                const gradient = escapeHtml(slide.gradient || '');
                const badge = escapeHtml(slide.badge || '');
                const slideTitle = escapeHtml(slide.title || '');
                const slideSub = escapeHtml(slide.sub || '');

                if (img) {
                    return `
                        <div class="event-slide">
                            <img src="${img}" alt="${slideTitle || 'Event Slide'}">
                        </div>
                    `;
                } else {
                    const bgClass = gradient || 'gradient-ranneeti-1';
                    return `
                        <div class="event-slide">
                            <div class="event-slide-placeholder ${bgClass}">
                                <svg class="event-bg-svg" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="200" cy="100" r="90" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" />
                                    <circle cx="200" cy="100" r="40" fill="rgba(255,255,255,0.1)" />
                                </svg>
                            </div>
                        </div>
                    `;
                }
            }).join('');

            return `
                <div class="event-card">
                    <div class="event-carousel">
                        <div class="event-carousel-track">
                            ${slidesHtml}
                        </div>
                        <button class="carousel-arrow prev" aria-label="Previous Slide">❮</button>
                        <button class="carousel-arrow next" aria-label="Next Slide">❯</button>
                        <div class="carousel-indicators"></div>
                    </div>
                    <div class="event-card-content">
                        ${tagline ? `<span class="event-tagline">${tagline}</span>` : ''}
                        <h3 class="event-card-title">${title}</h3>
                        <p class="event-description">${desc}</p>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
        initEventCarousels();
    }

    window.renderDynamicEvents = renderDynamicEvents;

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Event Carousel Auto-Swipe (Every 3 seconds)
    function initEventCarousels() {
        const carousels = document.querySelectorAll('.event-carousel');
        carousels.forEach(carousel => {
            const track = carousel.querySelector('.event-carousel-track');
            const slides = carousel.querySelectorAll('.event-slide');
            const dotsContainer = carousel.querySelector('.carousel-indicators');
            const prevBtn = carousel.querySelector('.carousel-arrow.prev');
            const nextBtn = carousel.querySelector('.carousel-arrow.next');

            if (!track || slides.length === 0) return;

            let currentIndex = 0;
            const totalSlides = slides.length;
            let autoSlideTimer = null;

            // Generate indicator dots
            if (dotsContainer && dotsContainer.children.length === 0) {
                slides.forEach((_, idx) => {
                    const dot = document.createElement('button');
                    dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
                    dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
                    dot.addEventListener('click', (e) => {
                        e.stopPropagation();
                        goToSlide(idx);
                        resetTimer();
                    });
                    dotsContainer.appendChild(dot);
                });
            }

            const dots = dotsContainer ? dotsContainer.querySelectorAll('.carousel-dot') : [];

            function updateSlidePosition() {
                track.style.transform = `translateX(-${currentIndex * 100}%)`;
                dots.forEach((dot, idx) => {
                    if (idx === currentIndex) {
                        dot.classList.add('active');
                    } else {
                        dot.classList.remove('active');
                    }
                });
            }

            function goToSlide(index) {
                currentIndex = (index + totalSlides) % totalSlides;
                updateSlidePosition();
            }

            function nextSlide() {
                goToSlide(currentIndex + 1);
            }

            function prevSlide() {
                goToSlide(currentIndex - 1);
            }

            function startTimer() {
                stopTimer();
                autoSlideTimer = setInterval(nextSlide, 3000);
            }

            function stopTimer() {
                if (autoSlideTimer) {
                    clearInterval(autoSlideTimer);
                    autoSlideTimer = null;
                }
            }

            function resetTimer() {
                startTimer();
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    prevSlide();
                    resetTimer();
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    nextSlide();
                    resetTimer();
                });
            }

            // Pause on hover
            carousel.addEventListener('mouseenter', stopTimer);
            carousel.addEventListener('mouseleave', startTimer);

            // Touch Swipe support
            let startX = 0;
            let isSwiping = false;

            carousel.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches[0]) {
                    startX = e.touches[0].clientX;
                    isSwiping = true;
                    stopTimer();
                }
            }, { passive: true });

            carousel.addEventListener('touchend', (e) => {
                if (!isSwiping) return;
                isSwiping = false;
                if (e.changedTouches && e.changedTouches[0]) {
                    const endX = e.changedTouches[0].clientX;
                    const diffX = startX - endX;
                    if (Math.abs(diffX) > 35) {
                        if (diffX > 0) {
                            nextSlide();
                        } else {
                            prevSlide();
                        }
                    }
                }
                startTimer();
            }, { passive: true });

            startTimer();
        });
    }

    initEventCarousels();

    // Annual Report Top Notification Banner Logic
    function initAnnualReportBanner() {
        const expiryDate = new Date('2026-08-31T23:59:59+05:30');
        const now = new Date();

        // 1. Expiry Check: If current date is past 31st August 2026 EOD, return
        if (now > expiryDate) {
            return;
        }

        // 2. Avoid duplicate injection
        if (document.getElementById('top-announcement-bar')) {
            return;
        }

        // 3. Create and inject banner
        const banner = document.createElement('div');
        banner.id = 'top-announcement-bar';
        banner.className = 'top-announcement-bar';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Announcement Banner');

        const pdfUrl = 'Grandeur-Annual-Report-2025-26.pdf';

        banner.innerHTML = `
            <div class="announcement-container">
                <div class="announcement-content">
                    <span class="announcement-badge">✨ Annual Report 2025-26</span>
                    <span class="announcement-text">
                        <span class="announcement-text-desktop">Grandeur Annual Report 2025-26 is live!</span>
                    </span>
                    <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="announcement-btn">
                        Read Report <span class="announcement-arrow">&rarr;</span>
                    </a>
                </div>
            </div>
        `;

        const header = document.querySelector('.header');
        if (header) {
            header.prepend(banner);
        } else {
            document.body.prepend(banner);
        }
        document.body.classList.add('has-announcement-bar');
    }

    initAnnualReportBanner();

    // Execute sync
    syncGrandeurCMS();
    window.addEventListener('grandeur_store_updated', syncGrandeurCMS);
});





