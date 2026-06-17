// Application State
let allUpdates = [];
let filteredUpdates = [];
let selectedUpdate = null;
let currentTypeFilter = 'all';
let searchQuery = '';

// DOM Elements
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');
const updatesList = document.getElementById('updates-list');
const refreshBtn = document.getElementById('refresh-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const lastUpdatedTime = document.getElementById('last-updated-time');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const typeFiltersContainer = document.getElementById('type-filters');

const detailsSection = document.getElementById('details-section');
const detailsDefault = document.getElementById('details-default');
const detailsActive = document.getElementById('details-active');
const closeDetailsBtn = document.getElementById('close-details-btn');

const activeTag = document.getElementById('active-tag');
const activeDate = document.getElementById('active-date');
const activeTitle = document.getElementById('active-title');
const activeLink = document.getElementById('active-link');
const activeBodyContent = document.getElementById('active-body-content');

const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const tweetBtn = document.getElementById('tweet-btn');
const shortenTweetBtn = document.getElementById('shorten-tweet-btn');
const hashtagBtns = document.querySelectorAll('.hashtag-btn');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchUpdates(false);
});

// Setup Events
function setupEventListeners() {
  // Refresh Feed
  refreshBtn.addEventListener('click', () => {
    fetchUpdates(true);
  });

  // Export to CSV
  exportCsvBtn.addEventListener('click', () => {
    exportToCSV();
  });

  // Search Filter
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    applyFiltersAndRender();
  });

  // Clear Search button in Empty State
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    applyFiltersAndRender();
  });

  // Type Tags Filters
  typeFiltersContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-tag')) {
      // Toggle Active state
      document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
      e.target.classList.add('active');
      
      currentTypeFilter = e.target.dataset.type;
      applyFiltersAndRender();
    }
  });

  // Character Counter and validation in Tweet composer
  tweetTextarea.addEventListener('input', () => {
    validateTweetLength();
  });

  // Hashtag Helpers insertion
  hashtagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const hashtag = btn.dataset.tag;
      insertHashtag(hashtag);
    });
  });

  // Auto Shorten Tweet Content
  shortenTweetBtn.addEventListener('click', () => {
    if (selectedUpdate) {
      draftTweet(selectedUpdate, true);
    }
  });

  // Trigger Twitter Web Intent
  tweetBtn.addEventListener('click', () => {
    const text = tweetTextarea.value;
    if (text.length > 0 && text.length <= 280) {
      const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(xUrl, '_blank', 'noopener,noreferrer');
    }
  });

  // Close Mobile Drawer
  closeDetailsBtn.addEventListener('click', () => {
    detailsSection.classList.remove('show-mobile');
    // Remove selection highlight from cards
    document.querySelectorAll('.update-card').forEach(card => card.classList.remove('selected'));
    selectedUpdate = null;
  });
}

// Fetch Updates from API
async function fetchUpdates(forceRefresh = false) {
  // Show Loader
  showLoader(true);
  
  // Disable Refresh Button UI state
  refreshBtn.disabled = true;
  refreshBtn.querySelector('.spinner-icon').classList.remove('hidden');
  refreshBtn.querySelector('.refresh-icon').classList.add('hidden');
  refreshBtn.querySelector('.btn-text').textContent = forceRefresh ? 'Updating...' : 'Loading...';

  try {
    const url = `/api/updates${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    
    allUpdates = data.updates || [];
    
    // Format and show Last Updated
    if (data.last_updated) {
      const date = new Date(data.last_updated);
      // Fallback to text if invalid date
      const formattedDate = isNaN(date.getTime()) 
        ? data.last_updated 
        : date.toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
      lastUpdatedTime.textContent = `Feed update: ${formattedDate}`;
    } else {
      lastUpdatedTime.textContent = 'Feed update: Unknown';
    }

    if (data.warning) {
      console.warn(data.warning, data.error);
      alert(`Notice: ${data.warning}`);
    }
    
    applyFiltersAndRender();
    
    // Try to re-select previous update if it still exists
    if (selectedUpdate) {
      const stillExists = allUpdates.find(u => u.id === selectedUpdate.id);
      if (stillExists) {
        selectUpdate(stillExists);
      } else {
        clearSelection();
      }
    }
  } catch (error) {
    console.error("Error fetching release notes:", error);
    alert(`Failed to fetch BigQuery release notes: ${error.message}`);
  } finally {
    showLoader(false);
    refreshBtn.disabled = false;
    refreshBtn.querySelector('.spinner-icon').classList.add('hidden');
    refreshBtn.querySelector('.refresh-icon').classList.remove('hidden');
    refreshBtn.querySelector('.btn-text').textContent = 'Refresh';
  }
}

// Toggle Loader Screen state
function showLoader(isLoading) {
  if (isLoading) {
    skeletonLoader.classList.remove('hidden');
    updatesList.classList.add('hidden');
    emptyState.classList.add('hidden');
  } else {
    skeletonLoader.classList.add('hidden');
    updatesList.classList.remove('hidden');
  }
}

// Get clean headline from text (e.g. first sentence)
function getCleanHeadline(text, type) {
  if (!text) return `${type} Update`;
  
  // Clean newlines
  const singleLineText = text.replace(/\s+/g, ' ');
  
  // Look for first sentence ending with period, question or exclamation
  const sentenceMatch = singleLineText.match(/^[^.!?]+[.!?]/);
  let headline = sentenceMatch ? sentenceMatch[0] : singleLineText;
  
  // Trim and cap at 80 characters
  headline = headline.trim();
  if (headline.length > 80) {
    headline = headline.substring(0, 77) + '...';
  }
  
  return headline;
}

// Filter and Render Feed Cards
function applyFiltersAndRender() {
  filteredUpdates = allUpdates.filter(update => {
    // Type Filter
    const matchesType = currentTypeFilter === 'all' || update.type.toLowerCase() === currentTypeFilter.toLowerCase();
    
    // Search Query Filter
    const matchesSearch = !searchQuery || 
      update.text.toLowerCase().includes(searchQuery) ||
      update.type.toLowerCase().includes(searchQuery) ||
      update.date.toLowerCase().includes(searchQuery);
      
    return matchesType && matchesSearch;
  });

  // Render
  updatesList.innerHTML = '';
  
  if (filteredUpdates.length === 0) {
    emptyState.classList.remove('hidden');
    updatesList.classList.add('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  updatesList.classList.remove('hidden');

  filteredUpdates.forEach(update => {
    const card = document.createElement('div');
    card.className = `update-card ${selectedUpdate && selectedUpdate.id === update.id ? 'selected' : ''}`;
    card.dataset.id = update.id;
    
    const tagClass = update.type.toLowerCase();
    const headline = getCleanHeadline(update.text, update.type);
    
    card.innerHTML = `
      <div class="card-header">
        <span class="tag ${tagClass}">${update.type}</span>
        <div class="card-header-right">
          <span class="card-date">${update.date}</span>
          <button class="copy-card-btn" title="Copier la mise à jour dans le presse-papiers" aria-label="Copier la description">
            <svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
      <h3>${escapeHTML(headline)}</h3>
      <div class="card-preview">${escapeHTML(update.text)}</div>
    `;
    
    // Copy button handler
    const copyBtn = card.querySelector('.copy-card-btn');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop click from triggering selection
      
      const copyText = `${update.type} (${update.date}) : ${update.text}\nLien: ${update.link}`;
      navigator.clipboard.writeText(copyText).then(() => {
        copyBtn.classList.add('success');
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        setTimeout(() => {
          copyBtn.classList.remove('success');
          copyBtn.innerHTML = `
            <svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 1500);
      }).catch(err => {
        console.error('Erreur lors de la copie: ', err);
      });
    });
    
    card.addEventListener('click', () => {
      selectUpdate(update);
    });
    
    updatesList.appendChild(card);
  });
}

// Select specific update to display in details/tweet panel
function selectUpdate(update) {
  selectedUpdate = update;
  
  // Highlight selected card in list
  document.querySelectorAll('.update-card').forEach(card => {
    card.classList.remove('selected');
    if (card.dataset.id === update.id) {
      card.classList.add('selected');
    }
  });

  // Update Detail UI contents
  activeTag.textContent = update.type;
  activeTag.className = `tag ${update.type.toLowerCase()}`;
  activeDate.textContent = update.date;
  activeTitle.textContent = `${update.type} - BigQuery Release Note`;
  activeLink.href = update.link;
  activeBodyContent.innerHTML = update.html;
  
  // Pre-populate Draft Tweet
  draftTweet(update, false);

  // Show Active details container
  detailsDefault.classList.add('hidden');
  detailsActive.classList.remove('hidden');
  
  // Mobile check: Slide panel up
  if (window.innerWidth <= 1024) {
    detailsSection.classList.add('show-mobile');
  }
  
  // Scroll details panel back to top
  detailsSection.scrollTop = 0;
}

// Clear currently selected update
function clearSelection() {
  selectedUpdate = null;
  detailsActive.classList.add('hidden');
  detailsDefault.classList.remove('removed');
  detailsDefault.classList.remove('hidden');
  detailsSection.classList.remove('show-mobile');
  document.querySelectorAll('.update-card').forEach(card => card.classList.remove('selected'));
}

// Draft Tweet content
function draftTweet(update, autoShorten = false) {
  // Format Tweet pieces
  const dateStr = update.date;
  const typeStr = update.type.toUpperCase();
  const rawDesc = update.text.replace(/\s+/g, ' ').trim();
  const linkStr = update.link;
  
  const header = `📢 BigQuery [${dateStr}] [${typeStr}]:\n`;
  const footer = `\n\nLink: ${linkStr}\n#BigQuery #GoogleCloud`;
  
  let desc = rawDesc;
  
  if (autoShorten) {
    // Length calculations
    const reservedLen = header.length + footer.length;
    const maxDescLen = 280 - reservedLen;
    
    if (rawDesc.length > maxDescLen) {
      // Keep descriptions cut to fit under 280 with ellipses
      desc = rawDesc.substring(0, maxDescLen - 3).trim() + '...';
    }
  }
  
  const tweetText = `${header}${desc}${footer}`;
  tweetTextarea.value = tweetText;
  validateTweetLength();
}

// Validate Tweet Character Limits (280)
function validateTweetLength() {
  const currentLength = tweetTextarea.value.length;
  charCounter.textContent = `${currentLength} / 280`;
  
  if (currentLength > 280) {
    charCounter.classList.add('error');
    tweetBtn.disabled = true;
    shortenTweetBtn.classList.remove('btn-secondary');
    shortenTweetBtn.classList.add('btn-primary'); // Draw attention to shorten button
  } else {
    charCounter.classList.remove('error');
    tweetBtn.disabled = currentLength === 0;
    shortenTweetBtn.classList.remove('btn-primary');
    shortenTweetBtn.classList.add('btn-secondary');
  }
}

// Insert hashtag at cursor position or end of text area
function insertHashtag(hashtag) {
  const textarea = tweetTextarea;
  const startPos = textarea.selectionStart;
  const endPos = textarea.selectionEnd;
  const text = textarea.value;
  
  let newText;
  if (startPos || startPos === 0) {
    newText = text.substring(0, startPos) + ' ' + hashtag + ' ' + text.substring(endPos, text.length);
  } else {
    newText = text + ' ' + hashtag;
  }
  
  textarea.value = newText.replace(/\s+/g, ' ').trim(); // Clean extra spaces
  textarea.focus();
  
  validateTweetLength();
}

// Helper to escape HTML to prevent XSS in rendering
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Export current filtered updates list to CSV
function exportToCSV() {
  if (filteredUpdates.length === 0) {
    alert("Aucune note de mise à jour à exporter.");
    return;
  }

  const headers = ["Date", "Type", "Link", "Description"];
  const rows = filteredUpdates.map(update => [
    update.date,
    update.type,
    update.link,
    update.text
  ]);

  let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
  rows.forEach(row => {
    csvContent += row.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute("download", `bigquery_release_notes_${dateStr}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
