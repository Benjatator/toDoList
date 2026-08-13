import React, {useState, useRef, useEffect} from 'react'
import CHANGELOG from './changelog.js'
import { check } from '@tauri-apps/plugin-updater'

function getContrastColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // perceived luminance
    return (r * 299 + g * 587 + b * 114) / 1000 >= 175 ? '#000000' : '#ffffff';
}

function ToDoList(){

    const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('todo-tasks') ?? '[]'));
    const [newTask, setNewTask] = useState("");
    const [newDueDate, setNewDueDate] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const nextId = useRef(Math.max(0, ...JSON.parse(localStorage.getItem('todo-tasks') ?? '[]').map(t => t.id + 1)));

    const [groupByCategory, setGroupByCategory] = useState(() => JSON.parse(localStorage.getItem('todo-groupByCategory') ?? 'false'));
    const [showSettings, setShowSettings] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    // 'idle' | 'checking' | 'available' | 'downloading' | 'upToDate' | 'error'
    const [updateStatus, setUpdateStatus] = useState('idle');
    const [updateVersion, setUpdateVersion] = useState(null);
    const [categories, setCategories] = useState(() => JSON.parse(localStorage.getItem('todo-categories') ?? '[]'));
    const [newCategoryInput, setNewCategoryInput] = useState("");
    const [newCategoryColor, setNewCategoryColor] = useState("#5b8dd9");

    useEffect(() => { localStorage.setItem('todo-tasks', JSON.stringify(tasks)); }, [tasks]);
    useEffect(() => { localStorage.setItem('todo-categories', JSON.stringify(categories)); }, [categories]);
    useEffect(() => { localStorage.setItem('todo-groupByCategory', JSON.stringify(groupByCategory)); }, [groupByCategory]);

    function handleInputChange(event){
        setNewTask(event.target.value);
    }

    function addTask(){
        if(newTask.trim() !== ""){
            setTasks(t => [...t, {id: nextId.current++, text: newTask, dueDate: newDueDate, category: newCategory}]);
            setNewTask("");
            setNewDueDate("");
            setNewCategory("");
        }
    }

    function deleteTask(id){
        setTasks(t => t.filter(task => task.id !== id));
    }

    function addCategory(){
        const trimmed = newCategoryInput.trim();
        if(trimmed && !categories.find(c => c.name === trimmed)){
            setCategories(c => [...c, {name: trimmed, color: newCategoryColor}]);
        }
        setNewCategoryInput("");
        setNewCategoryColor("#5b8dd9");
    }

    async function handleUpdate(){
        if (updateStatus === 'checking' || updateStatus === 'downloading') return;
        setUpdateStatus('checking');
        setUpdateVersion(null);
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
            setUpdateStatus('error');
        }
    }

    function deleteCategory(name){
        setCategories(c => c.filter(c => c.name !== name));
        setTasks(t => t.map(task => task.category === name ? {...task, category: ""} : task));
    }

    return(
        <>
        <div className="to-do-list">
            <h1>To-Do List</h1>

            <div className="settings-bar">
                <button className="settings-button" onClick={() => setShowSettings(s => !s)}>
                    ⚙
                </button>
            </div>

            {showSettings && (
                <div className="settings-panel">
                    <label className="settings-toggle">
                        <input
                            type="checkbox"
                            checked={groupByCategory}
                            onChange={e => setGroupByCategory(e.target.checked)}/>
                        Group tasks by category
                    </label>

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

                    <div className="updater-row">
                        <button
                            className="updater-button"
                            onClick={handleUpdate}
                            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}>
                            {updateStatus === 'checking' && '🔍 Checking...'}
                            {updateStatus === 'downloading' && `⬇️ Installing v${updateVersion}...`}
                            {(updateStatus === 'idle' || updateStatus === 'upToDate' || updateStatus === 'available' || updateStatus === 'error') && '🔄 Check for Updates'}
                        </button>
                        {updateStatus === 'upToDate' && <span className="updater-status updater-ok">✓ Up to date</span>}
                        {updateStatus === 'error' && <span className="updater-status updater-err">✕ Update check failed. Please Contact Support for assistance.</span>}
                    </div>

                    <button className="changelog-button" onClick={() => setShowChangelog(true)}>📋 View Changelog</button>
                </div>
            )}

            <div className="input-row">
                <input 
                    className="task-input"
                    type="text"
                    placeholder="Enter a task..."
                    value={newTask}
                    onChange={handleInputChange}/>
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
                <button
                    className="add-button"
                    onClick={addTask}>

                    Add
                </button>
            </div>

            <div className="task-list">
                {(() => {
                    const sorted = [...tasks].sort((a, b) => {
                        if (!a.dueDate && !b.dueDate) return 0;
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return a.dueDate.localeCompare(b.dueDate);
                    });

                    const renderTask = (task, showPill = false) => {
                        const catObj = categories.find(c => c.name === task.category);
                        return (
                            <li key={task.id}>
                                <span className="text">
                                    {task.text}
                                    {showPill && catObj && (
                                        <span className="task-category" style={{backgroundColor: catObj.color, color: getContrastColor(catObj.color)}}>{catObj.name}</span>
                                    )}
                                    {task.dueDate && <span className="due-date"> - Due: {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>}
                                </span>
                                <button
                                    className="delete-button"
                                    onClick={() => deleteTask(task.id)}>
                                    ✕
                                </button>
                            </li>
                        );
                    };

                    if (!groupByCategory) {
                        return <ol>{sorted.map(t => renderTask(t, true))}</ol>;
                    }

                    // group by category name; uncategorized tasks go last under ""
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

                    return orderedKeys.map(key => (
                        <div key={key} className="category-group">
                            <h2 className="category-header">{key || "Uncategorized"}</h2>
                            <ol>{groups[key].map(t => renderTask(t))}</ol>
                        </div>
                    ));
                })()}
            </div>

        </div>

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