// Activities page JavaScript

// Show add activity modal
function showAddActivityModal() {
  const content = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Add New Activity</h3>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <form id="add-activity-form" onsubmit="handleAddActivity(event)">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity Name</label>
            <input 
              type="text" 
              name="name" 
              required
              maxlength="30"
              placeholder="e.g., Meditation, Gaming, Reading"
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emoji</label>
            <input 
              type="text" 
              name="emoji" 
              maxlength="5"
              placeholder="📝"
              value="📝"
              class="w-24 px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-xl"
            >
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Paste any emoji (Win + . or Cmd + Ctrl + Space)</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div class="flex flex-wrap gap-2">
              ${[
                '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1',
                '#06B6D4', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316',
                '#84CC16', '#06AED5', '#D946EF', '#F43F5E', '#6B7280'
              ].map(color => `
                <button 
                  type="button"
                  onclick="selectColor('${color}')"
                  class="color-option w-10 h-10 rounded-lg border-2 transition-all hover:scale-110"
                  style="background-color: ${color}; border-color: transparent;"
                  data-color="${color}"
                ></button>
              `).join('')}
            </div>
            <input type="hidden" name="color" id="selected-color" value="#3B82F6" required>
          </div>
          
          <div class="flex items-center">
            <input 
              type="checkbox" 
              name="is_productive" 
              id="is_productive" 
              value="1"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            >
            <label for="is_productive" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              This is a productive activity (counts towards productivity score)
            </label>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button type="submit" class="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            Add Activity
          </button>
          <button type="button" onclick="closeModal()" class="py-3 px-4 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;
  
  showModal(content);
  
  // Select first color by default
  setTimeout(() => selectColor('#3B82F6'), 100);
}

// Color selection
function selectColor(color) {
  document.getElementById('selected-color').value = color;
  
  // Update visual selection
  document.querySelectorAll('.color-option').forEach(btn => {
    if (btn.dataset.color === color) {
      btn.style.borderColor = '#1f2937';
      btn.style.transform = 'scale(1.15)';
    } else {
      btn.style.borderColor = 'transparent';
      btn.style.transform = 'scale(1)';
    }
  });
}

// Handle add activity form submission
async function handleAddActivity(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const data = {
    name: formData.get('name'),
    emoji: formData.get('emoji'),
    color: formData.get('color'),
    is_productive: formData.get('is_productive') === '1'
  };
  
  try {
    const response = await fetch('/activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      closeModal();
      showToast(`Activity "${data.name}" created`);
      setTimeout(() => window.location.reload(), 500);
    } else {
      showToast(result.message || 'Failed to create activity', 'error');
    }
  } catch (error) {
    console.error('Error creating activity:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Edit activity
function editActivity(id, currentName, currentEmoji, currentColor, currentIsProductive) {
  const content = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Edit Activity</h3>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <form id="edit-activity-form" onsubmit="handleEditActivity(event, ${id})">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity Name</label>
            <input 
              type="text" 
              name="name" 
              required
              maxlength="30"
              value="${currentName}"
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emoji</label>
            <input 
              type="text" 
              name="emoji" 
              maxlength="5"
              value="${currentEmoji}"
              class="w-24 px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-xl"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div class="flex flex-wrap gap-2">
              ${[
                '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1',
                '#06B6D4', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316',
                '#84CC16', '#06AED5', '#D946EF', '#F43F5E', '#6B7280'
              ].map(color => `
                <button 
                  type="button"
                  onclick="selectColor('${color}')"
                  class="color-option w-10 h-10 rounded-lg border-2 transition-all hover:scale-110"
                  style="background-color: ${color}; border-color: ${color === currentColor ? '#1f2937' : 'transparent'}; transform: ${color === currentColor ? 'scale(1.15)' : 'scale(1)'}"
                  data-color="${color}"
                ></button>
              `).join('')}
            </div>
            <input type="hidden" name="color" id="selected-color" value="${currentColor}" required>
          </div>
          
          <div class="flex items-center">
            <input 
              type="checkbox" 
              name="is_productive" 
              id="is_productive" 
              value="1"
              ${currentIsProductive ? 'checked' : ''}
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            >
            <label for="is_productive" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              This is a productive activity (counts towards productivity score)
            </label>
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
}

// Handle edit activity form submission
async function handleEditActivity(event, id) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const data = {
    name: formData.get('name'),
    emoji: formData.get('emoji'),
    color: formData.get('color'),
    is_productive: formData.get('is_productive') === '1'
  };
  
  try {
    const response = await fetch(`/activities/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      closeModal();
      showToast('Activity updated');
      setTimeout(() => window.location.reload(), 500);
    } else {
      showToast(result.message || 'Failed to update activity', 'error');
    }
  } catch (error) {
    console.error('Error updating activity:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Delete activity
function deleteActivity(id, name, usageCount) {
  let warningMessage = '';
  if (usageCount > 0) {
    warningMessage = `<p class="text-amber-600 dark:text-amber-400 mt-2 text-sm">⚠️ This activity has ${usageCount} hours logged. Deleting will remove these entries.</p>`;
  }
  
  const content = `
    <div class="p-6">
      <div class="flex items-center justify-center mb-4">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </div>
      </div>
      
      <h3 class="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">Delete Activity</h3>
      <p class="text-gray-600 dark:text-gray-400 text-center">
        Are you sure you want to delete <strong>${name}</strong>?
      </p>
      ${warningMessage}
      
      <div class="flex gap-3 mt-6">
        <button onclick="confirmDeleteActivity(${id})" class="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
          Delete
        </button>
        <button onclick="closeModal()" class="py-3 px-4 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  `;
  
  showModal(content);
}

// Confirm delete activity
async function confirmDeleteActivity(id) {
  try {
    const response = await fetch(`/activities/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      closeModal();
      showToast('Activity deleted');
      setTimeout(() => window.location.reload(), 500);
    } else {
      showToast(result.message || 'Failed to delete activity', 'error');
    }
  } catch (error) {
    console.error('Error deleting activity:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Export functions
window.showAddActivityModal = showAddActivityModal;
window.selectColor = selectColor;
window.handleAddActivity = handleAddActivity;
window.editActivity = editActivity;
window.handleEditActivity = handleEditActivity;
window.deleteActivity = deleteActivity;
window.confirmDeleteActivity = confirmDeleteActivity;
