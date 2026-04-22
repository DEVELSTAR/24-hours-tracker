// Tracker page JavaScript - Minute Precision with AM/PM

// Format minutes to AM/PM time string
function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  const displayM = m.toString().padStart(2, '0');
  return displayM === '00' ? `${displayH} ${ampm}` : `${displayH}:${displayM} ${ampm}`;
}

// Format minutes to duration string
function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Generate time options in 30-minute increments
function generateTimeOptions(minMinutes, maxMinutes, selected) {
  let options = '';
  for (let i = minMinutes; i <= maxMinutes; i += 30) {
    const label = formatTime(i);
    const selectedAttr = i === selected ? 'selected' : '';
    options += `<option value="${i}" ${selectedAttr}>${label}</option>`;
  }
  return options;
}

// Get existing entries from the page
function getExistingEntries() {
  const entries = [];
  document.querySelectorAll('.entry-row').forEach(row => {
    const entryId = row.dataset.entryId;
    const timeText = row.querySelector('.text-sm.font-mono')?.textContent || '';
    const match = timeText.match(/(\d+:\d+\s*[AP]M)\s*→\s*(\d+:\d+\s*[AP]M)/);
    if (match) {
      const startMin = parseTimeToMinutes(match[1]);
      const endMin = parseTimeToMinutes(match[2]);
      entries.push({ id: entryId, start: startMin, end: endMin });
    }
  });
  return entries;
}

// Parse AM/PM time to minutes
function parseTimeToMinutes(timeStr) {
  const [time, ampm] = timeStr.trim().split(/\s+/);
  const [h, m] = time.split(':').map(Number);
  let minutes = h * 60 + m;
  if (ampm === 'PM' && h !== 12) minutes += 720;
  if (ampm === 'AM' && h === 12) minutes -= 720;
  return minutes;
}

// Check if a time overlaps with existing entries
function isTimeTracked(time, entries, isStart) {
  return entries.some(entry => {
    if (isStart) {
      // For start time: can't start during an existing entry
      return time >= entry.start && time < entry.end;
    } else {
      // For end time: can't end during or before start of an existing entry
      return time > entry.start && time <= entry.end;
    }
  });
}

// Generate time options, excluding tracked times
function generateAvailableTimeOptions(minMinutes, maxMinutes, selected, entries, isStart) {
  let options = '';
  let foundSelected = false;
  
  for (let i = minMinutes; i <= maxMinutes; i += 30) {
    // Skip if this time is already tracked
    if (isTimeTracked(i, entries, isStart)) continue;
    
    const label = formatTime(i);
    const isSelected = i === selected;
    if (isSelected) foundSelected = true;
    const selectedAttr = isSelected ? 'selected' : '';
    options += `<option value="${i}" ${selectedAttr}>${label}</option>`;
  }
  
  // If selected time is not available (tracked), select first available
  if (!foundSelected && options) {
    const firstOption = options.match(/value="(\d+)"/);
    if (firstOption) {
      options = options.replace(`value="${firstOption[1]}"`, `value="${firstOption[1]}" selected`);
    }
  }
  
  return options || '<option value="" disabled>No available time</option>';
}

// Show visual timeline of tracked periods
function renderTrackedTimeline(entries) {
  if (entries.length === 0) return '';
  
  const sorted = [...entries].sort((a, b) => a.start - b.start);
  
  let timeline = '<div class="mb-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"><p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Already tracked:</p><div class="flex flex-wrap gap-1">';
  
  sorted.forEach(entry => {
    timeline += `<span class="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded">${formatTime(entry.start)} - ${formatTime(entry.end)}</span>`;
  });
  
  timeline += '</div></div>';
  return timeline;
}

// Show add entry modal
function showAddEntryModal() {
  const activities = window.TRACKER_DATA.activities;
  const unallocated = window.TRACKER_DATA.unallocatedHours;
  const existingEntries = getExistingEntries();
  
  if (unallocated <= 0) {
    showToast('All 24 hours are already allocated!', 'error');
    return;
  }
  
  // Find first available time slot
  let defaultStart = 540; // 9:00 AM
  while (isTimeTracked(defaultStart, existingEntries, true) && defaultStart < 1410) {
    defaultStart += 30;
  }
  
  if (defaultStart >= 1410) {
    defaultStart = 0;
    while (isTimeTracked(defaultStart, existingEntries, true) && defaultStart < 1410) {
      defaultStart += 30;
    }
  }
  
  const defaultEnd = Math.min(defaultStart + 60, 1440);
  
  const activityOptions = activities.map(a => 
    `<option value="${a.id}">${a.emoji} ${a.name}</option>`
  ).join('');
  
  const trackedTimeline = renderTrackedTimeline(existingEntries);
  
  const content = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Add Activity Entry</h3>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      ${trackedTimeline}
      
      <form id="add-entry-form" onsubmit="handleAddEntry(event)">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity</label>
            <select name="activity_id" required
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="">Select an activity...</option>
              ${activityOptions}
            </select>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
              <select name="start_time" id="start-time" required
                class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                ${generateAvailableTimeOptions(0, 1435, defaultStart, existingEntries, true)}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
              <select name="end_time" id="end-time" required
                class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                ${generateAvailableTimeOptions(defaultStart + 30, 1440, defaultEnd, existingEntries, false)}
              </select>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
            <input type="text" name="note" placeholder="What did you do?"
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
          </div>
          
          <div class="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
            <span id="duration-preview">Duration: 1 hour</span>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button type="submit" class="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            Add Entry
          </button>
          <button type="button" onclick="closeModal()" class="py-3 px-4 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;
  
  showModal(content);
  
  // Add duration preview update listener and end time filtering
  setTimeout(() => {
    const startSelect = document.getElementById('start-time');
    const endSelect = document.getElementById('end-time');
    const preview = document.getElementById('duration-preview');
    
    function updateEndTimeOptions() {
      const start = parseInt(startSelect.value);
      const currentEnd = parseInt(endSelect.value);
      
      // Regenerate end time options - only show available times after start
      const newOptions = generateAvailableTimeOptions(start + 30, 1440, Math.max(currentEnd, start + 30), existingEntries, false);
      endSelect.innerHTML = newOptions;
      
      updatePreview();
    }
    
    function updatePreview() {
      const start = parseInt(startSelect.value);
      const end = parseInt(endSelect.value);
      const duration = end - start;
      preview.textContent = `Duration: ${formatDuration(duration)}`;
    }
    
    startSelect.addEventListener('change', updateEndTimeOptions);
    endSelect.addEventListener('change', updatePreview);
    updatePreview();
  }, 100);
}

// Handle add entry form submission
async function handleAddEntry(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const data = {
    date: window.TRACKER_DATA.date,
    activity_id: formData.get('activity_id'),
    start_time: parseInt(formData.get('start_time')),
    end_time: parseInt(formData.get('end_time')),
    note: formData.get('note')
  };
  
  if (data.end_time <= data.start_time) {
    showToast('End time must be after start time', 'error');
    return;
  }
  
  try {
    const response = await fetch('/tracker/api/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      closeModal();
      showToast('Activity added successfully');
      window.location.reload();
    } else {
      showToast(result.message || 'Failed to add entry', 'error');
    }
  } catch (error) {
    console.error('Error adding entry:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Check if time overlaps with other entries (excluding current entry)
function isTimeTrackedByOthers(time, entries, isStart, excludeEntryId) {
  return entries.some(entry => {
    if (entry.id === excludeEntryId) return false; // Skip current entry
    if (isStart) {
      return time >= entry.start && time < entry.end;
    } else {
      return time > entry.start && time <= entry.end;
    }
  });
}

// Generate time options excluding other entries' times but including current entry's time
function generateEditTimeOptions(minMinutes, maxMinutes, selected, entries, isStart, excludeEntryId) {
  let options = '';
  let foundSelected = false;
  
  for (let i = minMinutes; i <= maxMinutes; i += 30) {
    // Skip if this time is tracked by OTHER entries (not current)
    if (isTimeTrackedByOthers(i, entries, isStart, excludeEntryId) && i !== selected) continue;
    
    const label = formatTime(i);
    const isSelected = i === selected;
    if (isSelected) foundSelected = true;
    const selectedAttr = isSelected ? 'selected' : '';
    options += `<option value="${i}" ${selectedAttr}>${label}</option>`;
  }
  
  // If selected time is not available, add it anyway
  if (!foundSelected && selected >= minMinutes && selected <= maxMinutes) {
    options = `<option value="${selected}" selected>${formatTime(selected)}</option>` + options;
  }
  
  return options || '<option value="" disabled>No available time</option>';
}

// Edit entry
function editEntry(entryId, activityId, startTime, endTime, note) {
  const activities = window.TRACKER_DATA.activities;
  const existingEntries = getExistingEntries();
  
  const activityOptions = activities.map(a => 
    `<option value="${a.id}" ${a.id === activityId ? 'selected' : ''}>${a.emoji} ${a.name}</option>`
  ).join('');
  
  // Show other entries' tracked times
  const otherEntries = existingEntries.filter(e => e.id !== entryId.toString());
  const trackedTimeline = renderTrackedTimeline(otherEntries);
  
  const content = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Edit Entry</h3>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      ${trackedTimeline}
      
      <form id="edit-entry-form" onsubmit="handleEditEntry(event, ${entryId})">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity</label>
            <select name="activity_id" required
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="">Select an activity...</option>
              ${activityOptions}
            </select>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
              <select name="start_time" id="edit-start-time" required
                class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                ${generateEditTimeOptions(0, 1435, startTime, existingEntries, true, entryId.toString())}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
              <select name="end_time" id="edit-end-time" required
                class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                ${generateEditTimeOptions(startTime + 30, 1440, endTime, existingEntries, false, entryId.toString())}
              </select>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
            <input type="text" name="note" value="${note.replace(/"/g, '&quot;')}" placeholder="What did you do?"
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
          </div>
          
          <div class="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
            <span id="edit-duration-preview">Duration: ${formatDuration(endTime - startTime)}</span>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button type="submit" class="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            Save Changes
          </button>
          <button type="button" onclick="closeModal()" class="py-3 px-4 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;
  
  showModal(content);
  
  // Add dynamic end time filtering for edit form
  setTimeout(() => {
    const startSelect = document.getElementById('edit-start-time');
    const endSelect = document.getElementById('edit-end-time');
    const preview = document.getElementById('edit-duration-preview');
    
    function updateEndTimeOptions() {
      const start = parseInt(startSelect.value);
      const currentEnd = parseInt(endSelect.value);
      
      // Regenerate end time options - exclude other entries' times
      const newOptions = generateEditTimeOptions(start + 30, 1440, Math.max(currentEnd, start + 30), existingEntries, false, entryId.toString());
      endSelect.innerHTML = newOptions;
      
      updatePreview();
    }
    
    function updatePreview() {
      const start = parseInt(startSelect.value);
      const end = parseInt(endSelect.value);
      const duration = end - start;
      preview.textContent = `Duration: ${formatDuration(duration)}`;
    }
    
    startSelect.addEventListener('change', updateEndTimeOptions);
    endSelect.addEventListener('change', updatePreview);
  }, 100);
}

// Handle edit entry form submission
async function handleEditEntry(event, entryId) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const data = {
    activity_id: formData.get('activity_id'),
    start_time: parseInt(formData.get('start_time')),
    end_time: parseInt(formData.get('end_time')),
    note: formData.get('note')
  };
  
  if (data.end_time <= data.start_time) {
    showToast('End time must be after start time', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/tracker/api/entry/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      closeModal();
      showToast('Entry updated successfully');
      window.location.reload();
    } else {
      showToast(result.message || 'Failed to update entry', 'error');
    }
  } catch (error) {
    console.error('Error updating entry:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Delete entry
async function deleteEntry(entryId) {
  if (!confirm('Are you sure you want to delete this entry?')) {
    return;
  }
  
  try {
    const response = await fetch(`/tracker/api/entry/${entryId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('Entry deleted');
      window.location.reload();
    } else {
      showToast(result.message || 'Failed to delete entry', 'error');
    }
  } catch (error) {
    console.error('Error deleting entry:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Copy yesterday's entries
async function copyYesterday() {
  const date = window.TRACKER_DATA.date;
  
  try {
    const response = await fetch('/tracker/api/copy-yesterday', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toDate: date })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Copied yesterday\'s entries');
      setTimeout(() => window.location.reload(), 500);
    } else {
      showToast('Failed to copy entries', 'error');
    }
  } catch (error) {
    console.error('Error copying entries:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Apply template
async function applyTemplate(templateId) {
  const date = window.TRACKER_DATA.date;
  
  try {
    const response = await fetch('/tracker/api/apply-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, date })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Template applied');
      setTimeout(() => window.location.reload(), 500);
    } else {
      showToast('Failed to apply template', 'error');
    }
  } catch (error) {
    console.error('Error applying template:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Show save template modal
function showSaveTemplateModal() {
  const content = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Save as Template</h3>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <p class="text-gray-600 dark:text-gray-400 mb-4">Save today's schedule as a reusable template.</p>
      <input 
        type="text" 
        id="template-name" 
        placeholder="Template name (e.g., 'Work Day', 'Weekend')"
        class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
      >
      <div class="flex gap-3">
        <button onclick="saveTemplate()" class="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Save Template
        </button>
        <button onclick="closeModal()" class="py-3 px-4 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  `;
  
  showModal(content);
  setTimeout(() => document.getElementById('template-name').focus(), 100);
}

// Save template
async function saveTemplate() {
  const name = document.getElementById('template-name').value.trim();
  const date = window.TRACKER_DATA.date;
  
  if (!name) {
    showToast('Please enter a template name', 'error');
    return;
  }
  
  try {
    const response = await fetch('/tracker/api/save-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, date })
    });
    
    const data = await response.json();
    
    if (data.success) {
      closeModal();
      showToast(`Template "${name}" saved`);
      window.TRACKER_DATA.templates.push({ id: data.templateId, name });
    } else {
      showToast('Failed to save template', 'error');
    }
  } catch (error) {
    console.error('Error saving template:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Export functions
window.showAddEntryModal = showAddEntryModal;
window.handleAddEntry = handleAddEntry;
window.editEntry = editEntry;
window.handleEditEntry = handleEditEntry;
window.deleteEntry = deleteEntry;
window.copyYesterday = copyYesterday;
window.applyTemplate = applyTemplate;
window.showSaveTemplateModal = showSaveTemplateModal;
window.saveTemplate = saveTemplate;
window.formatTime = formatTime;
window.formatDuration = formatDuration;
