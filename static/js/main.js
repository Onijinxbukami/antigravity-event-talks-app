document.addEventListener('DOMContentLoaded', () => {
    // Global State
    let releaseNotesData = [];
    let selectedUpdate = null; // Holds { id, date, type, description, link }
    let activeFilter = 'all';
    let searchQuery = '';

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const retryBtn = document.getElementById('retry-btn');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const timelineContainer = document.getElementById('timeline-container');
    
    // Floating Bar Elements
    const floatingActionBar = document.getElementById('floating-action-bar');
    const selectedCountLabel = document.getElementById('selected-count-label');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    const draftTweetBtn = document.getElementById('draft-tweet-btn');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const tweetText = document.getElementById('tweet-text');
    const charCount = document.getElementById('char-count');
    const progressCircle = document.getElementById('progress-ring-circle');
    const tweetPreviewContent = document.getElementById('tweet-preview-content');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const tweetSubmitBtn = document.getElementById('tweet-submit-btn');
    const tagButtons = document.querySelectorAll('.tag-insert-btn');

    // Progress Ring Setup
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;

    // Fetch and Load Release Notes
    async function loadFeed() {
        showLoading();
        clearSelection();
        
        try {
            const response = await fetch('/api/release-notes');
            const result = await response.json();
            
            if (result.status === 'success') {
                releaseNotesData = result.data;
                renderTimeline();
            } else {
                showError(result.message || 'An error occurred while fetching the release notes.');
            }
        } catch (err) {
            console.error('Error fetching release notes:', err);
            showError('Network error. Unable to establish connection to the feed server.');
        }
    }

    // Toggle Loading State Animation
    function showLoading() {
        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
        timelineContainer.classList.add('hidden');
        refreshBtn.classList.add('disabled');
        refreshBtn.querySelector('.spinner-icon').classList.add('loading');
    }

    // Toggle Error State
    function showError(msg) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        emptyState.classList.add('hidden');
        timelineContainer.classList.add('hidden');
        errorMessage.textContent = msg;
        refreshBtn.classList.remove('disabled');
        refreshBtn.querySelector('.spinner-icon').classList.remove('loading');
    }

    // Render the Release Notes list dynamically
    function renderTimeline() {
        refreshBtn.classList.remove('disabled');
        refreshBtn.querySelector('.spinner-icon').classList.remove('loading');
        loadingState.classList.add('hidden');
        
        if (!releaseNotesData || releaseNotesData.length === 0) {
            showEmpty();
            return;
        }

        timelineContainer.innerHTML = '';
        let matchCount = 0;

        releaseNotesData.forEach(entry => {
            // Filter individual updates in this entry date
            const filteredUpdates = entry.updates.filter(update => {
                // Category Filter
                const matchesFilter = activeFilter === 'all' || 
                    update.type.toLowerCase() === activeFilter;

                // Search Filter
                const searchContent = `${update.type} ${stripHtml(update.description)}`.toLowerCase();
                const matchesSearch = searchQuery === '' || searchContent.includes(searchQuery);

                return matchesFilter && matchesSearch;
            });

            if (filteredUpdates.length > 0) {
                matchCount += filteredUpdates.length;

                // Create Timeline Group for this Date
                const dateGroup = document.createElement('div');
                dateGroup.className = 'timeline-date-group';

                const dateHeader = document.createElement('div');
                dateHeader.className = 'timeline-date-header';
                
                const dot = document.createElement('div');
                dot.className = 'timeline-dot';
                
                const dateTitle = document.createElement('h2');
                dateTitle.className = 'timeline-date-title';
                dateTitle.textContent = entry.date;

                const dateLink = document.createElement('a');
                dateLink.className = 'timeline-date-link';
                dateLink.href = entry.link;
                dateLink.target = '_blank';
                dateLink.rel = 'noopener noreferrer';
                dateLink.title = 'View official docs for this date';
                dateLink.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                `;

                dateHeader.appendChild(dot);
                dateHeader.appendChild(dateTitle);
                dateHeader.appendChild(dateLink);
                dateGroup.appendChild(dateHeader);

                const cardsList = document.createElement('div');
                cardsList.className = 'date-cards-list';

                filteredUpdates.forEach(update => {
                    const card = document.createElement('div');
                    card.className = `update-card ${selectedUpdate && selectedUpdate.id === update.id ? 'selected' : ''}`;
                    card.setAttribute('data-id', update.id);
                    
                    const isSelected = selectedUpdate && selectedUpdate.id === update.id;

                    const typeClass = `type-${update.type.toLowerCase()}`;
                    card.innerHTML = `
                        <div class="card-top">
                            <span class="type-badge ${typeClass}">${update.type}</span>
                            <div class="selection-indicator">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </div>
                        </div>
                        <div class="card-content">
                            ${update.description}
                        </div>
                        <div class="card-actions">
                            <button class="card-tweet-btn" data-id="${update.id}" aria-label="Tweet this specific update">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                                <span>Tweet This</span>
                            </button>
                        </div>
                    `;

                    // Click event to select card
                    card.addEventListener('click', (e) => {
                        // If user clicked the button or a link inside the card, ignore main selection toggling
                        if (e.target.closest('.card-tweet-btn') || e.target.closest('a')) {
                            return;
                        }
                        handleCardSelection(update, entry);
                    });

                    // Direct tweet button click inside card
                    card.querySelector('.card-tweet-btn').addEventListener('click', () => {
                        openComposeModal(update, entry);
                    });

                    cardsList.appendChild(card);
                });

                dateGroup.appendChild(cardsList);
                timelineContainer.appendChild(dateGroup);
            }
        });

        if (matchCount === 0) {
            showEmpty();
        } else {
            timelineContainer.classList.remove('hidden');
            emptyState.classList.add('hidden');
        }
    }

    // Toggle Empty State
    function showEmpty() {
        timelineContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }

    // Handle Selection State Management
    function handleCardSelection(update, entry) {
        if (selectedUpdate && selectedUpdate.id === update.id) {
            // Deselect if already selected
            clearSelection();
        } else {
            // Select new card
            selectedUpdate = {
                id: update.id,
                date: entry.date,
                type: update.type,
                description: update.description,
                link: entry.link
            };

            // Remove selected classes and set new active selection
            document.querySelectorAll('.update-card').forEach(card => {
                if (card.getAttribute('data-id') === update.id) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });

            // Show Floating Action Bar
            selectedCountLabel.textContent = `1 Update Selected (${selectedUpdate.type} - ${selectedUpdate.date})`;
            floatingActionBar.classList.remove('hidden');
        }
    }

    // Clear Selected Card
    function clearSelection() {
        selectedUpdate = null;
        document.querySelectorAll('.update-card').forEach(card => {
            card.classList.remove('selected');
        });
        floatingActionBar.classList.add('hidden');
    }

    // Open Modal and Pre-populate Draft Tweet text
    function openComposeModal(update, entry) {
        const dateStr = entry.date;
        const typeStr = update.type;
        const descText = stripHtml(update.description);
        const docLink = entry.link;

        const draft = generateTweetDraft(dateStr, typeStr, descText, docLink);
        
        tweetText.value = draft;
        updateTweetCharCount();
        
        tweetModal.classList.remove('hidden');
        tweetText.focus();
    }

    // Pre-fill modal from selected update (from floating bar)
    function openModalFromSelected() {
        if (!selectedUpdate) return;
        
        const descText = stripHtml(selectedUpdate.description);
        const draft = generateTweetDraft(
            selectedUpdate.date, 
            selectedUpdate.type, 
            descText, 
            selectedUpdate.link
        );

        tweetText.value = draft;
        updateTweetCharCount();
        
        tweetModal.classList.remove('hidden');
        tweetText.focus();
    }

    // Close Modal Handler
    function closeModal() {
        tweetModal.classList.add('hidden');
    }

    // Draft Generator Function (optimized to fit limits)
    function generateTweetDraft(date, type, description, link) {
        // Strip multiple whitespaces and newlines
        const cleanDesc = description.replace(/\s+/g, ' ').trim();
        
        // Emojis for status categories
        const typeEmoji = {
            'Feature': '📢 BigQuery Feature',
            'Announcement': '🔔 BigQuery Announcement',
            'Issue': '⚠️ BigQuery Issue',
            'Deprecation': '🛑 BigQuery Deprecation',
            'Update': '📝 BigQuery Update'
        }[type] || '📝 BigQuery Update';

        const prefix = `${typeEmoji} (${date}): `;
        const suffix = `\n\nDoc: ${link}`;

        // Compute available space for the description
        // Standard Twitter length is 280 characters
        const reservedLen = prefix.length + suffix.length;
        const availableLen = 280 - reservedLen;

        let trimmedDesc = cleanDesc;
        if (cleanDesc.length > availableLen) {
            trimmedDesc = cleanDesc.substring(0, availableLen - 3) + '...';
        }

        return `${prefix}${trimmedDesc}${suffix}`;
    }

    // Strip HTML Tags Helper
    function stripHtml(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    }

    // Update Tweet Character Counter & Circle Progress
    function updateTweetCharCount() {
        const length = tweetText.value.length;
        const remaining = 280 - length;
        
        charCount.textContent = remaining;
        tweetPreviewContent.textContent = tweetText.value;

        // Circular progress ring calculation
        const percent = Math.min((length / 280) * 100, 100);
        const offset = circumference - (percent / 100 * circumference);
        progressCircle.style.strokeDashoffset = offset;

        // Visual alerts for limits
        const counterGroup = document.querySelector('.character-counter-group');
        if (remaining < 0) {
            counterGroup.className = 'character-counter-group exceeded';
            progressCircle.style.stroke = '#ef4444'; // Red
            tweetSubmitBtn.disabled = true;
            tweetSubmitBtn.classList.add('disabled');
        } else if (remaining <= 20) {
            counterGroup.className = 'character-counter-group warning';
            progressCircle.style.stroke = '#eab308'; // Amber
            tweetSubmitBtn.disabled = false;
            tweetSubmitBtn.classList.remove('disabled');
        } else {
            counterGroup.className = 'character-counter-group';
            progressCircle.style.stroke = '#06b6d4'; // Cyan
            tweetSubmitBtn.disabled = false;
            tweetSubmitBtn.classList.remove('disabled');
        }
    }

    // Copy Draft Text to Clipboard
    function copyTweetText() {
        const text = tweetText.value;
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = copyTweetBtn.innerHTML;
            copyTweetBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style="color:#10b981">Copied!</span>
            `;
            setTimeout(() => {
                copyTweetBtn.innerHTML = originalHTML;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text:', err);
        });
    }

    // Launch Twitter/X share intent
    function postToTwitter() {
        const text = encodeURIComponent(tweetText.value);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    }

    // Event Listeners
    refreshBtn.addEventListener('click', () => {
        if (!refreshBtn.classList.contains('disabled')) {
            loadFeed();
        }
    });

    retryBtn.addEventListener('click', loadFeed);

    // Search bar event input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderTimeline();
    });

    // Filtering controls
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active classes
            filterButtons.forEach(b => b.classList.remove('active'));
            
            // Set current active button
            btn.classList.add('active');
            activeFilter = btn.getAttribute('data-type');
            
            renderTimeline();
        });
    });

    // Floating bar clear and action triggers
    clearSelectionBtn.addEventListener('click', clearSelection);
    draftTweetBtn.addEventListener('click', openModalFromSelected);

    // Modal control triggers
    closeModalBtn.addEventListener('click', closeModal);
    tweetText.addEventListener('input', updateTweetCharCount);
    copyTweetBtn.addEventListener('click', copyTweetText);
    tweetSubmitBtn.addEventListener('click', postToTwitter);

    // Insert Hashtags buttons
    tagButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            const currentVal = tweetText.value;
            
            // Check if tag is already in text, if not, append it
            if (!currentVal.includes(tag)) {
                // Ensure nice spacing
                if (currentVal.endsWith(' ') || currentVal.length === 0) {
                    tweetText.value = currentVal + tag + ' ';
                } else {
                    tweetText.value = currentVal + ' ' + tag + ' ';
                }
                updateTweetCharCount();
            }
        });
    });

    // Close modal on click outside content card
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeModal();
        }
    });

    // Keyboard ESC to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Initialize application loading
    loadFeed();
});
