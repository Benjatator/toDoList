import React, {useState, useRef, useEffect} from 'react'
import CHANGELOG from './changelog.js'
import { check } from '@tauri-apps/plugin-updater'

// Returns black or white depending on background luminance
function getContrastColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // perceived luminance
    return (r * 299 + g * 587 + b * 114) / 1000 >= 175 ? '#000000' : '#ffffff';
}

function ToDoList(){

    // Persisted task list; each task: { id, text, dueDate, category }
    const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('todo-tasks') ?? '[]'));
    const [newTask, setNewTask] = useState("");
    const [newDueDate, setNewDueDate] = useState("");
    const [newCategory, setNewCategory] = useState("");
    // Monotonically increasing ID; seeded from stored tasks so IDs stay unique after reload
    // At 1,000 tasks created per day, this method will break after ~24,000 years.
    const nextId = useRef(Math.max(0, ...JSON.parse(localStorage.getItem('todo-tasks') ?? '[]').map(t => t.id + 1)));

    const [groupByCategory, setGroupByCategory] = useState(() => JSON.parse(localStorage.getItem('todo-groupByCategory') ?? 'false'));
    const [collapseFarTasks, setCollapseFarTasks] = useState(() => JSON.parse(localStorage.getItem('todo-collapseFarTasks') ?? 'false'));
    const [taskListWidth, setTaskListWidth] = useState(() => JSON.parse(localStorage.getItem('todo-taskListWidth') ?? '75'));
    // editingId tracks which task row is currently in edit mode
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState({text: "", dueDate: "", category: "", hasSubtasks: false});
    const [showSettings, setShowSettings] = useState(false);
    // Auto-show changelog when the app version is newer than what the user last saw
    const [showChangelog, setShowChangelog] = useState(() => {
        const current = CHANGELOG[0]?.version ?? '';
        const seen = localStorage.getItem('todo-lastSeenVersion') ?? '';
        if (current && current !== seen) {
            localStorage.setItem('todo-lastSeenVersion', current);
            return true;
        }
        return false;
    });
    // 'idle' | 'checking' | 'available' | 'downloading' | 'upToDate' | 'error'
    const [updateStatus, setUpdateStatus] = useState('idle');
    const [updateVersion, setUpdateVersion] = useState(null);
    const [updateError, setUpdateError] = useState(null);
    // Persisted categories; each category: { name, color }
    const [categories, setCategories] = useState(() => JSON.parse(localStorage.getItem('todo-categories') ?? '[]'));
    const [newCategoryInput, setNewCategoryInput] = useState("");
    const [newCategoryColor, setNewCategoryColor] = useState("#5b8dd9");
    const [newHasSubtasks, setNewHasSubtasks] = useState(false);
    // set of task IDs whose subtask panel is currently expanded
    const [expandedIds, setExpandedIds] = useState(new Set());
    // tracks the current text being typed in each task's subtask add-input
    const [subtaskInputs, setSubtaskInputs] = useState({});
    // tracks the date input for each task's subtask add-row
    const [subtaskDateInputs, setSubtaskDateInputs] = useState({});
    // { taskId, subtaskId } identifying which subtask is being edited
    const [editingSubtask, setEditingSubtask] = useState(null);
    const [subtaskEditDraft, setSubtaskEditDraft] = useState({text: "", dueDate: ""});
    const [today, setToday] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });

    // Re-render at midnight so overdue indicators update without a page refresh
    useEffect(() => {
        const now = new Date();
        const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
        const id = setTimeout(() => {
            const d = new Date(); d.setHours(0,0,0,0);
            setToday(d);
        }, msUntilMidnight);
        return () => clearTimeout(id);
    }, [today]);

    // Sync state to localStorage whenever it changes
    useEffect(() => { localStorage.setItem('todo-tasks', JSON.stringify(tasks)); }, [tasks]);
    useEffect(() => { localStorage.setItem('todo-categories', JSON.stringify(categories)); }, [categories]);
    useEffect(() => { localStorage.setItem('todo-groupByCategory', JSON.stringify(groupByCategory)); }, [groupByCategory]);
    useEffect(() => { localStorage.setItem('todo-taskListWidth', JSON.stringify(taskListWidth)); }, [taskListWidth]);
    useEffect(() => { localStorage.setItem('todo-collapseFarTasks', JSON.stringify(collapseFarTasks)); }, [collapseFarTasks]);

    // Appends a new task and resets the input fields
    function addTask(){
        if(newTask.trim() !== ""){
            setTasks(t => [...t, {id: nextId.current++, text: newTask, dueDate: newDueDate, category: newCategory, hasSubtasks: newHasSubtasks, subtasks: []}]);
            setNewTask("");
            setNewDueDate("");
            setNewCategory("");
            setNewHasSubtasks(false);
        }
    }

    function deleteTask(id){
        setTasks(t => t.filter(task => task.id !== id));
    }

    // --- Subtask handlers ---
    function addSubtask(taskId){
        const text = (subtaskInputs[taskId] ?? "").trim();
        if (!text) return;
        setTasks(t => t.map(task => task.id === taskId
            ? {...task, subtasks: [...(task.subtasks ?? []), {id: nextId.current++, text, dueDate: subtaskDateInputs[taskId] ?? "", completed: false}]}
            : task));
        setSubtaskInputs(s => ({...s, [taskId]: ""}));
        setSubtaskDateInputs(s => ({...s, [taskId]: ""}));
    }

    function commitSubtaskEdit(taskId, subtaskId){
        if (subtaskEditDraft.text.trim() !== "") {
            setTasks(t => t.map(task => task.id === taskId
                ? {...task, subtasks: task.subtasks.map(s => s.id === subtaskId ? {...s, text: subtaskEditDraft.text.trim(), dueDate: subtaskEditDraft.dueDate} : s)}
                : task));
        }
        setEditingSubtask(null);
        setSubtaskEditDraft({text: "", dueDate: ""});
    }

    function toggleSubtask(taskId, subtaskId){
        setTasks(t => t.map(task => task.id === taskId
            ? {...task, subtasks: task.subtasks.map(s => s.id === subtaskId ? {...s, completed: !s.completed} : s)}
            : task));
    }

    function deleteSubtask(taskId, subtaskId){
        setTasks(t => t.map(task => task.id === taskId
            ? {...task, subtasks: task.subtasks.filter(s => s.id !== subtaskId)}
            : task));
    }

    // --- Task edit handlers ---
    function startEdit(task){
        setEditingId(task.id);
        setEditDraft({text: task.text, dueDate: task.dueDate ?? "", category: task.category ?? "", hasSubtasks: task.hasSubtasks ?? false});
    }

    function commitEdit(id){
        if(editDraft.text.trim() !== ""){
            setTasks(t => t.map(task => task.id === id ? {...task, text: editDraft.text.trim(), dueDate: editDraft.dueDate, category: editDraft.category, hasSubtasks: editDraft.hasSubtasks} : task));
        }
        setEditingId(null);
        setEditDraft({text: "", dueDate: "", category: "", hasSubtasks: false});
    }

    // --- Category handlers ---
    // Adds a new category only if the name is non-empty and not already taken
    function addCategory(){
        const trimmed = newCategoryInput.trim();
        if(trimmed && !categories.find(c => c.name === trimmed)){
            setCategories(c => [...c, {name: trimmed, color: newCategoryColor}]);
        }
        setNewCategoryInput("");
        setNewCategoryColor("#5b8dd9");
    }

    // --- Updater ---
    async function handleUpdate(){
        if (updateStatus === 'checking' || updateStatus === 'downloading') return;
        setUpdateStatus('checking');
        setUpdateVersion(null);
        setUpdateError(null);
        try {
            const update = await check();
            if (!update) {
                setUpdateStatus('upToDate');
                return;
            }
            setUpdateVersion(update.version);
            setUpdateStatus('downloading');
            await update.downloadAndInstall();
            // app will restart; status below is a fallback
            setUpdateStatus('idle');
        } catch (e) {
            console.error('Updater error:', e);
            setUpdateError(String(e));
            setUpdateStatus('error');
        }
    }

    // Removes a category and clears it from any tasks that used it
    function deleteCategory(name){
        setCategories(cats => cats.filter(c => c.name !== name));
        setTasks(t => t.map(task => task.category === name ? {...task, category: ""} : task));
    }

    return(
        <>
        <div className="to-do-list">
            <h1>To-Do List</h1>

            {/* Settings gear button — toggles the settings panel */}
            <div className="settings-bar">
                <button className="settings-button" onClick={() => setShowSettings(s => !s)}>
                    ⚙
                </button>
            </div>

            {/* Settings panel — shown when gear button is active */}
            {showSettings && (
                <div className="settings-panel">
                    <label className="settings-toggle">
                        <input
                            type="checkbox"
                            checked={groupByCategory}
                            onChange={e => setGroupByCategory(e.target.checked)}/>
                        Group tasks by category
                    </label>
                    <label className="settings-toggle">
                        <input
                            type="checkbox"
                            checked={collapseFarTasks}
                            onChange={e => setCollapseFarTasks(e.target.checked)}/>
                        Collapse tasks beyond 30 days
                    </label>

                    {/* Task list width slider */}
                    <div className="width-slider-row">
                        <span className="width-slider-label">Task Bar Width: {taskListWidth}%</span>
                        <input
                            type="range"
                            min="20"
                            max="100"
                            value={taskListWidth}
                            onChange={e => setTaskListWidth(Number(e.target.value))}/>
                    </div>

                    {/* Category manager — add/remove named color categories */}
                    <div className="category-manager">
                        <div className="category-add-row">
                            <input
                                type="text"
                                placeholder="New category..."
                                value={newCategoryInput}
                                onChange={e => setNewCategoryInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addCategory()}/>
                            <input
                                type="color"
                                className="color-picker"
                                value={newCategoryColor}
                                onChange={e => setNewCategoryColor(e.target.value)}/>
                            <button className="add-button" onClick={addCategory}>Add</button>
                        </div>
                        <ul className="category-list">
                            {categories.map(cat => (
                                <li key={cat.name} className="category-item">
                                    <span className="category-color-dot" style={{backgroundColor: cat.color}}></span>
                                    <span>{cat.name}</span>
                                    <button className="delete-button" onClick={() => deleteCategory(cat.name)}>✕</button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Update checker */}
                    <div className="updater-row">
                        <button
                            className="updater-button"
                            onClick={handleUpdate}
                            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}>
                            {updateStatus === 'checking' && '🔍 Checking...'}
                            {updateStatus === 'downloading' && `⬇️ Installing v${updateVersion}...`}
                            {(updateStatus === 'idle' || updateStatus === 'upToDate' || updateStatus === 'error') && '🔄 Check for Updates'}
                        </button>
                        {updateStatus === 'upToDate' && <span className="updater-status updater-ok">✓ Up to date</span>}
                        {updateStatus === 'error' && <span className="updater-status updater-err">✕ {updateError ?? 'Update check failed'}</span>}
                    </div>

                    {/* Changelog button — opens the version history modal */}
                    <button className="changelog-button" onClick={() => setShowChangelog(true)}>📋 View Changelog</button>
                </div>
            )}

            {/* New task input row — text, category, due date, subtasks toggle, add button */}
            <div className="input-row">
                <input 
                    className="task-input"
                    type="text"
                    placeholder="Enter a task..."
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}/>
                {categories.length > 0 && (
                    <select
                        className="category-select"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}>
                        <option value="">No category</option>
                        {categories.map(cat => (
                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                )}
                <input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}/>
                <label className="subtasks-toggle">
                    <input
                        type="checkbox"
                        checked={newHasSubtasks}
                        onChange={e => setNewHasSubtasks(e.target.checked)}/>
                    Sub-tasks
                </label>
                <button
                    className="add-button"
                    onClick={addTask}>
                    Add
                </button>
            </div>

            {/* Task list — sorted by due date; rendered flat or grouped by category */}
            <div className="task-list" style={{width: `${taskListWidth}%`, maxWidth: `${taskListWidth}%`}}>
                {(() => {
                    // Sort tasks by due date ascending; undated tasks go to the bottom
                    const sorted = [...tasks].sort((a, b) => {
                        if (!a.dueDate && !b.dueDate) return 0;
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return a.dueDate.localeCompare(b.dueDate);
                    });

                    // Renders a single task row, including its edit form and subtask panel
                    const renderTask = (task, showPill = false) => {
                        const subtasks = task.subtasks ?? [];
                        const catObj = categories.find(c => c.name === task.category);
                        const hasOverdueSubtask = subtasks.some(s => !s.completed && s.dueDate && new Date(s.dueDate + 'T00:00:00') < today);
                        const isOverdue = (task.dueDate && new Date(task.dueDate + 'T00:00:00') < today) || hasOverdueSubtask;
                        return (
                            <li key={task.id} className="task-item">
                              <div className="task-row">
                                {/* Overdue indicator */}
                                {isOverdue && <span className="overdue-indicator" title="Overdue">!</span>}
                                {/* Subtask expand/collapse toggle */}
                                {task.hasSubtasks && (
                                    <button
                                        className={`subtasks-expand-btn${expandedIds.has(task.id) ? ' expanded' : ''}`}
                                        onClick={() => setExpandedIds(s => { const n = new Set(s); n.has(task.id) ? n.delete(task.id) : n.add(task.id); return n; })}
                                        title="Toggle subtasks">
                                        ⤷
                                    </button>
                                )}
                                {/* Task text — shows edit form when this task is being edited */}
                                {editingId === task.id ? (
                                    <span className="task-edit-row">
                                        <input
                                            className="task-edit-input"
                                            value={editDraft.text}
                                            autoFocus
                                            onChange={e => setEditDraft(d => ({...d, text: e.target.value}))}
                                            onKeyDown={e => { if(e.key === 'Enter') commitEdit(task.id); if(e.key === 'Escape') setEditingId(null); }}/>
                                        {categories.length > 0 && (
                                            <select
                                                className="category-select"
                                                value={editDraft.category}
                                                onChange={e => setEditDraft(d => ({...d, category: e.target.value}))}>
                                                <option value="">No category</option>
                                                {categories.map(cat => (
                                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </select>
                                        )}
                                        <input
                                            type="date"
                                            value={editDraft.dueDate}
                                            onChange={e => setEditDraft(d => ({...d, dueDate: e.target.value}))}/>
                                    </span>
                                ) : (
                                    <span className="text">
                                        {task.text}
                                        {showPill && catObj && (
                                            <span className="task-category" style={{backgroundColor: catObj.color, color: getContrastColor(catObj.color)}}>{catObj.name}</span>
                                        )}
                                        {task.dueDate && <span className="due-date"> - Due: {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>}
                                        {task.hasSubtasks && subtasks.length > 0 && (
                                            <span className="subtask-progress">
                                                {subtasks.filter(s => s.completed).length} / {subtasks.length}
                                            </span>
                                        )}
                                    </span>
                                )}
                                {/* Edit / Save button */}
                                <button
                                    className={editingId === task.id ? "edit-button save-button" : "edit-button"}
                                    onClick={() => editingId === task.id ? commitEdit(task.id) : startEdit(task)}>
                                    {editingId === task.id ? "✓" : "🖉"}
                                </button>
                                {/* Delete task button */}
                                <button
                                    className="delete-button"
                                    onClick={() => deleteTask(task.id)}>
                                    ✕
                                </button>
                              </div>
                              {/* Subtask panel — visible when expanded */}
                              {task.hasSubtasks && (
                                <div className={`subtask-panel${expandedIds.has(task.id) ? ' open' : ''}`}>
                                    <ul className="subtask-list">
                                        {[...subtasks].sort((a, b) => {
                                            if (!a.dueDate && !b.dueDate) return 0;
                                            if (!a.dueDate) return 1;
                                            if (!b.dueDate) return -1;
                                            return a.dueDate.localeCompare(b.dueDate);
                                        }).map(s => (
                                            <li key={s.id} className="subtask-item">
                                                <input
                                                    type="checkbox"
                                                    checked={s.completed}
                                                    onChange={() => toggleSubtask(task.id, s.id)}/>
                                                {editingSubtask?.taskId === task.id && editingSubtask?.subtaskId === s.id ? (
                                                    <>
                                                        <input
                                                            className="subtask-input"
                                                            autoFocus
                                                            value={subtaskEditDraft.text}
                                                            onChange={e => setSubtaskEditDraft(d => ({...d, text: e.target.value}))}
                                                            onKeyDown={e => { if(e.key === 'Enter') commitSubtaskEdit(task.id, s.id); if(e.key === 'Escape') setEditingSubtask(null); }}/>
                                                        <input
                                                            type="date"
                                                            className="subtask-date-input"
                                                            value={subtaskEditDraft.dueDate}
                                                            onChange={e => setSubtaskEditDraft(d => ({...d, dueDate: e.target.value}))}/>
                                                        <button className="edit-button save-button" onClick={() => commitSubtaskEdit(task.id, s.id)}>✓</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {s.dueDate && !s.completed && new Date(s.dueDate + 'T00:00:00') < today && (
                                                            <span className="overdue-indicator subtask-overdue" title="Overdue">!</span>
                                                        )}
                                                        <span className={s.completed ? 'subtask-text completed' : 'subtask-text'}>
                                                            {s.text}
                                                            {s.dueDate && <span className="due-date"> - Due: {new Date(s.dueDate + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>}
                                                        </span>
                                                        <button className="edit-button" onClick={() => { setEditingSubtask({taskId: task.id, subtaskId: s.id}); setSubtaskEditDraft({text: s.text, dueDate: s.dueDate ?? ""}); }}>🖉</button>
                                                    </>
                                                )}
                                                <button className="delete-button subtask-delete" onClick={() => deleteSubtask(task.id, s.id)}>✕</button>
                                            </li>
                                        ))}
                                    </ul>
                                    {/* Add subtask input row */}
                                    <div className="subtask-add-row">
                                        <input
                                            className="subtask-input"
                                            type="text"
                                            placeholder="Add a subtask..."
                                            value={subtaskInputs[task.id] ?? ""}
                                            onChange={e => setSubtaskInputs(s => ({...s, [task.id]: e.target.value}))}
                                            onKeyDown={e => e.key === 'Enter' && addSubtask(task.id)}/>
                                        <input
                                            type="date"
                                            className="subtask-date-input"
                                            value={subtaskDateInputs[task.id] ?? ""}
                                            onChange={e => setSubtaskDateInputs(s => ({...s, [task.id]: e.target.value}))}/>
                                        <button className="add-button subtask-add-btn" onClick={() => addSubtask(task.id)}>Add</button>
                                    </div>
                                </div>
                              )}
                            </li>
                        );
                    };

                    const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + 30);
                    const isNear = task => !task.dueDate || new Date(task.dueDate + 'T00:00:00') <= cutoff;

                    const renderFarSection = (farTasks, showPills) => {
                        if (!collapseFarTasks || farTasks.length === 0) return farTasks.map(t => renderTask(t, showPills));
                        return (
                            <details key="far-tasks" className="far-tasks-details">
                                <summary className="far-tasks-summary">Tasks beyond 30 days ({farTasks.length})</summary>
                                {farTasks.map(t => renderTask(t, showPills))}
                            </details>
                        );
                    };

                    if (!groupByCategory) {
                        const near = sorted.filter(isNear);
                        const far = sorted.filter(t => !isNear(t));
                        return <ol>{near.map(t => renderTask(t, true))}{renderFarSection(far, true)}</ol>;
                    }

                    // Build groups keyed by category name; uncategorized tasks go last under ""
                    const groups = {};
                    sorted.forEach(task => {
                        const key = task.category || "";
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(task);
                    });

                    const orderedKeys = [
                        ...categories.filter(c => groups[c.name]).map(c => c.name),
                        ...(groups[""] ? [""] : [])
                    ];

                    return orderedKeys.map(key => {
                        const near = groups[key].filter(isNear);
                        const far = groups[key].filter(t => !isNear(t));
                        return (
                            <div key={key} className="category-group">
                                <h2 className="category-header">{key || "Uncategorized"}</h2>
                                <ol>{near.map(t => renderTask(t))}{renderFarSection(far, false)}</ol>
                            </div>
                        );
                    });
                })()}
            </div>

        </div>

        {/* Changelog modal — shown on first launch after an update, or via settings */}
        {showChangelog && (
            <div className="changelog-overlay" onClick={() => setShowChangelog(false)}>
                <div className="changelog-modal" onClick={e => e.stopPropagation()}>
                    <div className="changelog-header">
                        <h2>Version History</h2>
                        <button className="changelog-close" onClick={() => setShowChangelog(false)}>✕</button>
                    </div>
                    <div className="changelog-body">
                        {CHANGELOG.map(entry => (
                            <div key={entry.version} className="changelog-entry">
                                <div className="changelog-version">
                                    <span className="changelog-version-tag">v{entry.version}</span>
                                    <span className="changelog-date">{new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}</span>
                                </div>
                                <ul className="changelog-changes">
                                    {entry.changes.map((change, i) => (
                                        <li key={i}>{change}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        </>
    );
}

export default ToDoList