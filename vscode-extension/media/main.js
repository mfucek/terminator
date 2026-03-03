// @ts-check
(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  /** @type {import('../src/types').TaskData[]} */
  let tasks = [];
  /** @type {string | null} */
  let editingId = null;
  /** @type {string | null} */
  let draggedId = null;

  const inputArea = /** @type {HTMLTextAreaElement} */ (document.getElementById('task-input'));
  const addBtn = /** @type {HTMLButtonElement} */ (document.getElementById('add-btn'));
  const todoBody = /** @type {HTMLElement} */ (document.getElementById('todo-body'));
  const doingBody = /** @type {HTMLElement} */ (document.getElementById('doing-body'));
  const doneBody = /** @type {HTMLElement} */ (document.getElementById('done-body'));
  const todoBadge = /** @type {HTMLElement} */ (document.getElementById('todo-badge'));
  const doingBadge = /** @type {HTMLElement} */ (document.getElementById('doing-badge'));
  const doneBadge = /** @type {HTMLElement} */ (document.getElementById('done-badge'));
  const doneSection = /** @type {HTMLElement} */ (document.getElementById('done-section'));

  /**
   * Auto-resize a textarea to fit its content within CSS min/max constraints.
   * @param {HTMLTextAreaElement} textarea
   * @param {number} [extraLines=0] - extra blank lines to add beyond content
   */
  function autoResize(textarea, extraLines) {
    // Temporarily collapse to measure true scrollHeight
    textarea.style.height = '0';
    textarea.style.overflow = 'hidden';
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || (parseFloat(getComputedStyle(textarea).fontSize) * 1.4);
    const contentHeight = textarea.scrollHeight + (extraLines || 0) * lineHeight;
    textarea.style.height = contentHeight + 'px';
    textarea.style.overflow = '';
  }

  // Auto-resize main input on typing
  inputArea.addEventListener('input', () => autoResize(inputArea));

  // Add task
  addBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) { return; }
    vscode.postMessage({ command: 'addTask', text });
    inputArea.value = '';
    autoResize(inputArea);
  });

  // Enter to add task, Option/Alt+Enter for newline
  inputArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.altKey) {
        e.preventDefault();
        const start = inputArea.selectionStart;
        const end = inputArea.selectionEnd;
        inputArea.value = inputArea.value.substring(0, start) + '\n' + inputArea.value.substring(end);
        inputArea.selectionStart = inputArea.selectionEnd = start + 1;
        autoResize(inputArea);
      } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        addBtn.click();
      }
    }
  });

  // Collapsible sections
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      header.classList.toggle('collapsed');
      const body = header.nextElementSibling;
      if (body) { body.classList.toggle('hidden'); }
    });
  });

  // Drag-and-drop on section bodies
  /** @param {HTMLElement} sectionBody @param {string} status */
  function setupDropZone(sectionBody, status) {
    sectionBody.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      sectionBody.classList.add('drag-over');

      // Find the task item we're hovering over to show insertion point
      const items = [...sectionBody.querySelectorAll('.task-item:not(.dragging)')];
      // Remove old indicators
      sectionBody.querySelectorAll('.drop-indicator').forEach(el => el.remove());

      const afterElement = getDragAfterElement(sectionBody, e.clientY);
      const indicator = document.createElement('div');
      indicator.className = 'drop-indicator';

      if (afterElement) {
        afterElement.parentNode.insertBefore(indicator, afterElement);
      } else {
        const list = sectionBody.querySelector('.task-list');
        if (list) {
          list.appendChild(indicator);
        } else {
          sectionBody.appendChild(indicator);
        }
      }
    });

    sectionBody.addEventListener('dragleave', (e) => {
      // Only remove if leaving the section body itself
      if (!sectionBody.contains(/** @type {Node} */ (e.relatedTarget))) {
        sectionBody.classList.remove('drag-over');
        sectionBody.querySelectorAll('.drop-indicator').forEach(el => el.remove());
      }
    });

    sectionBody.addEventListener('drop', (e) => {
      e.preventDefault();
      sectionBody.classList.remove('drag-over');
      sectionBody.querySelectorAll('.drop-indicator').forEach(el => el.remove());

      if (!draggedId) { return; }

      const afterElement = getDragAfterElement(sectionBody, e.clientY);
      const insertBeforeId = afterElement ? afterElement.dataset.taskId : undefined;

      vscode.postMessage({
        command: 'moveTask',
        id: draggedId,
        status,
        insertBeforeId,
      });
    });
  }

  /**
   * Find the element the dragged item should be inserted before
   * @param {HTMLElement} container
   * @param {number} y
   * @returns {HTMLElement | null}
   */
  function getDragAfterElement(container, y) {
    const items = [...container.querySelectorAll('.task-item:not(.dragging)')];
    let closest = null;
    let closestOffset = Number.POSITIVE_INFINITY;

    items.forEach(child => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > -closestOffset) {
        closestOffset = -offset;
        closest = child;
      }
    });

    return closest;
  }

  setupDropZone(todoBody, 'todo');
  setupDropZone(doingBody, 'doing');
  setupDropZone(doneBody, 'done');

  // Popover state
  /** @type {HTMLElement | null} */
  let activePopover = null;

  /** @type {{ taskId: string, x: number, y: number, status: string, isContextMenu: boolean } | null} */
  let pendingPopover = null;

  function closePopover() {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }
    pendingPopover = null;
  }

  // Close popover on outside click
  document.addEventListener('click', (e) => {
    if (activePopover && !activePopover.contains(/** @type {Node} */ (e.target))) {
      closePopover();
    }
  });

  /**
   * Request terminal list and show popover anchored below a button
   * @param {string} taskId
   * @param {HTMLElement} anchorBtn
   */
  function showTerminalPicker(taskId, anchorBtn) {
    closePopover();
    const rect = anchorBtn.getBoundingClientRect();
    const task = tasks.find(t => t.id === taskId);
    pendingPopover = {
      taskId,
      x: rect.right,
      y: rect.bottom + 2,
      status: task ? task.status : 'todo',
      isContextMenu: false,
    };
    vscode.postMessage({ command: 'requestTerminals', id: taskId });
  }

  /**
   * Request terminal list and show context menu at mouse position
   * @param {string} taskId
   * @param {string} status
   * @param {number} x
   * @param {number} y
   */
  function showContextMenu(taskId, status, x, y) {
    closePopover();
    pendingPopover = { taskId, x, y, status, isContextMenu: true };
    vscode.postMessage({ command: 'requestTerminals', id: taskId });
  }

  /**
   * @param {string} taskId
   * @param {{ name: string, index: number }[]} terminals
   * @param {number} x
   * @param {number} y
   * @param {string} status
   * @param {boolean} isContextMenu
   */
  function renderPopover(taskId, terminals, x, y, status, isContextMenu) {
    closePopover();

    const popover = document.createElement('div');
    popover.className = 'terminal-popover';

    // Terminal send options
    const header = document.createElement('div');
    header.className = 'terminal-popover-header';
    header.textContent = 'Send to terminal';
    popover.appendChild(header);

    if (terminals.length > 0) {
      terminals.forEach(t => {
        const item = document.createElement('div');
        item.className = 'terminal-popover-item';
        item.textContent = t.name;
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'sendToTerminalSelected', id: taskId, terminalIndex: t.index });
          closePopover();
        });
        popover.appendChild(item);
      });
    }

    const newItem = document.createElement('div');
    newItem.className = 'terminal-popover-item terminal-popover-new';
    newItem.textContent = '+ New Terminal';
    newItem.addEventListener('click', (e) => {
      e.stopPropagation();
      vscode.postMessage({ command: 'sendToTerminalSelected', id: taskId, createNew: true });
      closePopover();
    });
    popover.appendChild(newItem);

    // Context menu: status-specific actions + delete
    if (isContextMenu) {
      const sep = document.createElement('div');
      sep.className = 'terminal-popover-separator';
      popover.appendChild(sep);

      if (status === 'doing') {
        const completeItem = document.createElement('div');
        completeItem.className = 'terminal-popover-item';
        completeItem.textContent = 'Mark as done';
        completeItem.addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'completeTask', id: taskId });
          closePopover();
        });
        popover.appendChild(completeItem);

        const revertItem = document.createElement('div');
        revertItem.className = 'terminal-popover-item';
        revertItem.textContent = 'Revert to todo';
        revertItem.addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'revertTask', id: taskId });
          closePopover();
        });
        popover.appendChild(revertItem);
      }

      if (status === 'todo') {
        const markDoneItem = document.createElement('div');
        markDoneItem.className = 'terminal-popover-item';
        markDoneItem.textContent = 'Mark as done';
        markDoneItem.addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'completeTask', id: taskId });
          closePopover();
        });
        popover.appendChild(markDoneItem);
      }

      const sep2 = document.createElement('div');
      sep2.className = 'terminal-popover-separator';
      popover.appendChild(sep2);

      const deleteItem = document.createElement('div');
      deleteItem.className = 'terminal-popover-item terminal-popover-danger';
      deleteItem.textContent = 'Delete';
      deleteItem.addEventListener('click', (e) => {
        e.stopPropagation();
        vscode.postMessage({ command: 'deleteTask', id: taskId });
        closePopover();
      });
      popover.appendChild(deleteItem);
    }

    // Position: try to keep within viewport
    popover.style.top = y + 'px';
    popover.style.left = '0';
    popover.style.visibility = 'hidden';
    document.body.appendChild(popover);

    // Adjust position after measuring
    const popRect = popover.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    let finalX = x;
    let finalY = y;
    if (finalX + popRect.width > vw) { finalX = vw - popRect.width - 4; }
    if (finalX < 0) { finalX = 4; }
    if (finalY + popRect.height > vh) { finalY = y - popRect.height - 2; }
    if (finalY < 0) { finalY = 4; }

    popover.style.left = finalX + 'px';
    popover.style.top = finalY + 'px';
    popover.style.right = '';
    popover.style.visibility = '';

    activePopover = popover;
  }

  // Listen for messages from extension
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.command === 'updateTasks') {
      tasks = msg.tasks;
      render();
    }
    if (msg.command === 'terminalList' && pendingPopover && pendingPopover.taskId === msg.taskId) {
      renderPopover(msg.taskId, msg.terminals, pendingPopover.x, pendingPopover.y, pendingPopover.status, pendingPopover.isContextMenu);
    }
  });

  function render() {
    const todo = tasks.filter(t => t.status === 'todo');
    const doing = tasks.filter(t => t.status === 'doing');
    const done = tasks.filter(t => t.status === 'done');

    todoBadge.textContent = String(todo.length);
    doingBadge.textContent = String(doing.length);
    doneBadge.textContent = String(done.length);

    // Always show all sections

    renderList(todoBody, todo, 'todo');
    renderList(doingBody, doing, 'doing');
    renderList(doneBody, done, 'done');
  }

  /**
   * @param {HTMLElement} container
   * @param {import('../src/types').TaskData[]} items
   * @param {string} status
   */
  function renderList(container, items, status) {
    container.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = status === 'todo' ? 'No tasks yet' : status === 'doing' ? 'No active tasks' : 'No completed tasks';
      container.appendChild(empty);
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'task-list';

    items.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${status}`;
      li.title = task.text;
      li.draggable = true;
      li.dataset.taskId = task.id;

      li.addEventListener('dragstart', (e) => {
        draggedId = task.id;
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
      });

      li.addEventListener('dragend', () => {
        draggedId = null;
        li.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
      });

      li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(task.id, status, e.clientX, e.clientY);
      });

      if (editingId === task.id) {
        li.innerHTML = renderEditForm(task);
        ul.appendChild(li);
        // Focus the textarea after render and auto-resize
        requestAnimationFrame(() => {
          const ta = /** @type {HTMLTextAreaElement | null} */ (li.querySelector('.edit-textarea'));
          if (ta) {
            ta.focus();
            autoResize(ta, 1);
            ta.addEventListener('input', () => autoResize(ta, 1));
            // Enter to save, Option/Alt+Enter for newline
            ta.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                if (e.altKey) {
                  e.preventDefault();
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  ta.value = ta.value.substring(0, start) + '\n' + ta.value.substring(end);
                  ta.selectionStart = ta.selectionEnd = start + 1;
                  autoResize(ta, 1);
                } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  const saveBtn = li.querySelector('.edit-save-btn');
                  if (saveBtn) { /** @type {HTMLButtonElement} */ (saveBtn).click(); }
                }
              }
            });
          }
        });
        return;
      }

      const textSpan = document.createElement('span');
      textSpan.className = 'task-text';
      textSpan.textContent = task.text;
      if (status !== 'done') {
        textSpan.style.cursor = 'pointer';
        textSpan.addEventListener('click', () => {
          editingId = task.id;
          render();
        });
      }
      li.appendChild(textSpan);

      const actions = document.createElement('span');
      actions.className = 'task-actions';

      if (status === 'todo') {
        let sendQuick = false;
        const sendBtn = actionBtn('▶', 'Send to terminal', () => {});
        sendBtn.addEventListener('mousedown', (e) => {
          if (e.button === 2 || (e.button === 0 && e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            sendQuick = true;
            vscode.postMessage({ command: 'sendToActiveTerminal', id: task.id });
          }
        });
        sendBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (sendQuick) { sendQuick = false; return; }
          showTerminalPicker(task.id, sendBtn);
        });
        sendBtn.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });
        actions.appendChild(sendBtn);
      } else if (status === 'doing') {
        let resendQuick = false;
        const resendBtn = actionBtn('▶', 'Resend to terminal', () => {});
        resendBtn.addEventListener('mousedown', (e) => {
          if (e.button === 2 || (e.button === 0 && e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            resendQuick = true;
            vscode.postMessage({ command: 'sendToActiveTerminal', id: task.id });
          }
        });
        resendBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (resendQuick) { resendQuick = false; return; }
          showTerminalPicker(task.id, resendBtn);
        });
        resendBtn.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });
        actions.appendChild(resendBtn);
        actions.appendChild(actionBtn('✓', 'Complete task', () => {
          vscode.postMessage({ command: 'completeTask', id: task.id });
        }));
      }

      li.appendChild(actions);
      ul.appendChild(li);
    });

    container.appendChild(ul);
  }

  /**
   * @param {string} label
   * @param {string} title
   * @param {() => void} onClick
   * @returns {HTMLButtonElement}
   */
  function actionBtn(label, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'task-action-btn';
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  /**
   * @param {import('../src/types').TaskData} task
   * @returns {string}
   */
  function renderEditForm(task) {
    const escaped = task.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `
      <div class="task-edit-area">
        <textarea class="edit-textarea">${escaped}</textarea>
        <div class="edit-actions">
          <button class="edit-save-btn" data-id="${task.id}">Save</button>
          <button class="edit-cancel-btn">Cancel</button>
        </div>
      </div>
    `;
  }

  // Delegate click events for edit save/cancel
  document.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);

    if (target.classList.contains('edit-save-btn')) {
      const id = target.getAttribute('data-id');
      const textarea = target.closest('.task-edit-area')?.querySelector('.edit-textarea');
      if (id && textarea) {
        const text = /** @type {HTMLTextAreaElement} */ (textarea).value.trim();
        if (text) {
          vscode.postMessage({ command: 'editTask', id, text });
        }
      }
      editingId = null;
      render();
    }

    if (target.classList.contains('edit-cancel-btn')) {
      editingId = null;
      render();
    }
  });

  // Initial render
  render();
})();
