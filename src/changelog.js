const CHANGELOG = [
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
        date: "2026-08-01",
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
