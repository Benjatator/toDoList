const CHANGELOG = [
    {
        version: "0.3.1",
        date: "2026-08-20",
        changes: [
            "• Cleaned up back-end.",
            "• Save buttons now display '✓' due to smaller button sizes."
        ],
    },
    {
        version: "0.3.0",
        date: "2026-08-17",
        changes: [
            "Lots of Visual Updates:",
            "• Fixed strikethrough line for subtask name and due date so they line up.",
            "• Decreased the size of the main task's edit and delete buttons to reduce clutter on smaller windows.",
            "• When adding a sub-task, the input section will now wrap for smaller windows.",
            "• Users can now adjust the width of the task list items via a slider in the settings panel.",
            "• Added setting to collapse tasks beyond 30 days.",
            "• Fixed tasks not auto-marking as past due correctly. Tasks now update their status at midnight automatically.",
            "• The changelog now forces open on new versions.",
        ],
    },
    {
        version: "0.2.4",
        date: "2026-08-17",
        changes: [
            "• Added ability to edit tasks.",
            "• Overdue tasks will now be marked with a red '!'.",
            "• Tasks can now have sub-tasks that can be checked off, each with their own due date. If a sub-task is past due, it will also give itself and its main task an overdue indicator.",
            "• Improved readability on back-end.",
        ],
    },
    {
        version: "0.2.3",
        date: "2026-08-13",
        changes: [
            "• New setting allows for automatic update tracking: no more need for uninstalling/reinstalling every update.",
            "• Updated icons (taskbar, start menu, etc.)",
        ],
    },
    {
        version: "0.1.1",
        date: "2026-08-13",
        changes: [
            "• Added version changelog popup accessible from the settings panel (The thing you're reading now!)",
            "• Category pill text colors now change based on background color (now shows black text on lighter category colors)",
            "• Category names are now truncated in the settings menu, and the category selector no longer grows to fit long category names",
        ],
    },
    {
        version: "0.1.0",
        date: "2026-08-13",
        changes: [
            "Initial release!",
            "• Allows for adding, viewing, and deleting tasks",
            "• Can assign due dates to tasks; tasks are sorted by date automatically",
            "• Create color-coded categories and assign them to tasks",
            "• Group tasks by category in the task list",
            "• Functional settings panel with category management and grouping toggle",
            "• Tasks and categories persist across sessions via a local storage",
        ],
    },
];

export default CHANGELOG;
