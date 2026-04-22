// 24-Hour Time Tracker - Client-side JavaScript

// Toast notification system
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  
  const colors = type === 'success' 
    ? 'bg-green-500 text-white' 
    : 'bg-red-500 text-white';
  
  const icon = type === 'success' 
    ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
    : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
  
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

// Update activity when dropdown changes
async function updateActivity(selectElement) {
  const hour = selectElement.dataset.hour;
  const activity = selectElement.value;
  const datePicker = document.getElementById('date-picker');
  const date = datePicker.value;
  const noteInput = document.querySelector(`input[data-hour="${hour}"]`);
  const note = noteInput ? noteInput.value : '';
  
  const blockElement = document.getElementById(`block-${hour}`);
  const statusElement = document.getElementById(`status-${hour}`);
  
  // Add loading state
  blockElement.style.opacity = '0.7';
  
  try {
    const response = await fetch('/api/entry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date,
        hour: parseInt(hour),
        activity,
        note
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update block styling
      const colorClasses = [
        'bg-gray-100', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 
        'bg-red-600', 'bg-indigo-600', 'bg-cyan-600', 'bg-pink-600', 'bg-gray-600',
        'text-gray-600', 'text-white',
        'border-gray-200', 'border-blue-500', 'border-emerald-500', 'border-amber-500',
        'border-red-500', 'border-indigo-500', 'border-cyan-500', 'border-pink-500', 'border-gray-500'
      ];
      
      blockElement.classList.remove(...colorClasses);
      blockElement.classList.add(
        data.activity.color,
        data.activity.text,
        data.activity.border
      );
      
      // Update status indicator
      statusElement.classList.remove('bg-gray-300', 'dark:bg-gray-600', 'bg-green-500');
      statusElement.classList.add(activity !== 'none' ? 'bg-green-500' : 'bg-gray-300');
      if (activity === 'none') {
        statusElement.classList.add('dark:bg-gray-600');
      }
      
      // Update stats
      updateStats(data.stats);
      
      // Show success animation
      blockElement.classList.add('animate-pulse-soft');
      setTimeout(() => blockElement.classList.remove('animate-pulse-soft'), 500);
      
      showToast(`Updated ${formatHour(hour)} to ${data.activity.label}`);
    } else {
      showToast('Failed to update activity', 'error');
    }
  } catch (error) {
    console.error('Error updating activity:', error);
    showToast('Network error. Please try again.', 'error');
  } finally {
    blockElement.style.opacity = '1';
  }
}

// Update note when input changes
async function updateNote(inputElement) {
  const hour = inputElement.dataset.hour;
  const note = inputElement.value;
  const datePicker = document.getElementById('date-picker');
  const date = datePicker.value;
  
  const selectElement = document.querySelector(`select[data-hour="${hour}"]`);
  const activity = selectElement ? selectElement.value : 'none';
  
  try {
    const response = await fetch('/api/entry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date,
        hour: parseInt(hour),
        activity,
        note
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Show subtle save indicator
      inputElement.classList.add('ring-2', 'ring-green-400');
      setTimeout(() => inputElement.classList.remove('ring-2', 'ring-green-400'), 500);
    }
  } catch (error) {
    console.error('Error saving note:', error);
  }
}

// Update statistics display
function updateStats(stats) {
  // Update individual stat cards
  Object.entries(stats).forEach(([activity, hours]) => {
    const statElement = document.getElementById(`stat-${activity}`);
    if (statElement) {
      statElement.textContent = `${hours}h`;
      statElement.classList.add('animate-pulse-soft');
      setTimeout(() => statElement.classList.remove('animate-pulse-soft'), 500);
    }
  });
  
  // Fetch and update productivity score
  const datePicker = document.getElementById('date-picker');
  if (datePicker) {
    updateProductivityScore(datePicker.value);
  }
}

// Update productivity score
async function updateProductivityScore(date) {
  try {
    const response = await fetch(`/api/stats/${date}`);
    const data = await response.json();
    
    if (data.success) {
      const scoreElement = document.getElementById('productivity-score');
      const barElement = document.getElementById('productivity-bar');
      
      if (scoreElement) {
        scoreElement.textContent = `${data.productivityPercentage}%`;
      }
      if (barElement) {
        barElement.style.width = `${data.productivityPercentage}%`;
      }
    }
  } catch (error) {
    console.error('Error updating productivity score:', error);
  }
}

// Format hour for display
function formatHour(hour) {
  const h = parseInt(hour);
  const timeLabel = `${String(h).padStart(2, '0')}:00`;
  return timeLabel;
}

// Date picker change handler
document.addEventListener('DOMContentLoaded', () => {
  const datePicker = document.getElementById('date-picker');
  
  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      const newDate = e.target.value;
      window.location.href = `/tracker?date=${newDate}`;
    });
  }
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Arrow keys for navigation
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
  
  // Add touch swipe support for mobile
  let touchStartX = 0;
  let touchEndX = 0;
  
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, false);
  
  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, false);
  
  function handleSwipe() {
    const datePicker = document.getElementById('date-picker');
    if (!datePicker) return;
    
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
      const currentDate = new Date(datePicker.value);
      const newDate = new Date(currentDate);
      
      if (diff > 0) {
        // Swiped left - next day
        newDate.setDate(newDate.getDate() + 1);
      } else {
        // Swiped right - previous day
        newDate.setDate(newDate.getDate() - 1);
      }
      
      window.location.href = `/tracker?date=${newDate.toISOString().split('T')[0]}`;
    }
  }
});

// Intersection Observer for lazy animations
if ('IntersectionObserver' in window) {
  document.addEventListener('DOMContentLoaded', () => {
    const hourRows = document.querySelectorAll('.hour-row');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-slide-up');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });
    
    hourRows.forEach(row => observer.observe(row));
  });
}

// Debounce function for input handling
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

// Export functions for global access
window.updateActivity = updateActivity;
window.updateNote = debounce(updateNote, 500);
