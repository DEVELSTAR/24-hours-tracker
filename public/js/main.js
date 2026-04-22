// Main JavaScript for 24-Hour Tracker

// Toast notification system
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  
  const colors = type === 'success' 
    ? 'bg-green-500 text-white' 
    : type === 'error'
    ? 'bg-red-500 text-white'
    : 'bg-blue-500 text-white';
  
  const icon = type === 'success' 
    ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
    : type === 'error'
    ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
    : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  
  toast.className = `${colors} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transform translate-x-full transition-transform duration-300`;
  toast.innerHTML = `${icon} <span class="font-medium">${message}</span>`;
  
  container.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.remove('translate-x-full'), 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Modal system
function showModal(content, onClose = null) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onclick="if(event.target === this) closeModal()">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transform scale-95 opacity-0 transition-all duration-300" id="modal-content">
        ${content}
      </div>
    </div>
  `;
  container.classList.remove('hidden');
  
  // Animate in
  setTimeout(() => {
    const modalContent = document.getElementById('modal-content');
    modalContent.classList.remove('scale-95', 'opacity-0');
    modalContent.classList.add('scale-100', 'opacity-100');
  }, 10);
  
  // Store callback
  container.dataset.onClose = onClose ? 'true' : '';
}

function closeModal() {
  const container = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  
  if (modalContent) {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
  }
  
  setTimeout(() => {
    container.classList.add('hidden');
    container.innerHTML = '';
  }, 300);
}

// Dark mode toggle
function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  
  // Save to localStorage for immediate persistence
  localStorage.setItem('darkMode', isDark);
  
  // Sync with server (fire and forget)
  fetch('/toggle-dark-mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ darkMode: isDark })
  }).catch(() => {});
}

// Check for saved dark mode preference
function initDarkMode() {
  const html = document.documentElement;
  
  // Check localStorage first (client preference)
  const savedDarkMode = localStorage.getItem('darkMode');
  
  if (savedDarkMode === 'true') {
    html.classList.add('dark');
  } else if (savedDarkMode === 'false') {
    html.classList.remove('dark');
  }
  // If no localStorage, use server-side setting (already set in layout.ejs)
}

// Date picker navigation
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  
  const datePicker = document.getElementById('date-picker');
  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      window.location.href = `/tracker?date=${e.target.value}`;
    });
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      const datePicker = document.getElementById('date-picker');
      if (!datePicker) return;
      
      const currentDate = new Date(datePicker.value);
      let newDate;
      
      if (e.key === 'ArrowLeft') {
        newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 1);
        e.preventDefault();
      }
      
      if (newDate) {
        window.location.href = `/tracker?date=${newDate.toISOString().split('T')[0]}`;
      }
    }
  });
});

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Format hour helper
function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

// Color utilities
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

// Export for other scripts
window.showToast = showToast;
window.showModal = showModal;
window.closeModal = closeModal;
window.toggleDarkMode = toggleDarkMode;
window.debounce = debounce;
window.formatHour = formatHour;
window.hexToRgba = hexToRgba;
window.getContrastColor = getContrastColor;
