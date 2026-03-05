# The Librarian - Obsidian Plugin

A native, lightweight book tracking plugin for Obsidian. Think Goodreads, but your data stays in your vault.

## Key Features

### 📚 Book Search & Auto-Note Generation
- Search the **Open Library API** directly from Obsidian.
- Automatically generate book notes with complete metadata: Title, Author, ISBN, Page Count, Cover Image, and more.
- Customizable default folder for all your new book notes.

### 🔘 One-Click Reading Status
- **▶ Start Reading**: Automatically increments your read count and marks the book as "Currently Reading".
- **✅ Finished**: Sets your finish date and closes the current reading session.
- **❌ Didn't Finish**: Marks the book as DNF and adjusts counts accordingly.
- Buttons are injected directly into the header of your book notes for zero-friction updates.

### 🗄️ Bookshelf Management
- **Shelf Assignment**: Use the "Shelf +" button to quickly add books to custom shelves (e.g., "Favorites", "Reference", "To-Read").
- **Custom Sidebar View**: See your entire library grouped by shelf in a dedicated sidebar tab.
- **Unshelved Grouping**: Automatically identifies books that haven't been organized yet.

### 📊 Reading Statistics
- Track your library's health with a dedicated **Stats View**.
- Monitor total books, total pages read, and books currently in progress.

### 🕰️ Re-read History
- Automatically logs every reading session (start and end dates) in the note's frontmatter.
- Perfect for tracking re-reads over several years.

---

## How to Use

### 1. Adding a Book
1. Open the **Command Palette** (`Cmd/Ctrl + P`).
2. Search for `Librarian: Add Book`.
3. Type the book title or author.
4. Select the result to create a new note in your designated library folder.

### 2. Organizing with Shelves
1. Open a book note.
2. Click the **Shelf +** button in the header.
3. Select an existing shelf or type a new name to create one.
4. Open the **Bookshelves** sidebar (Library icon) to see your collection organized.

### 3. Tracking Progress
- Use the **Start Reading** and **Finished** buttons as you go. 
- The plugin handles the metadata updates and session logging automatically.

---

## Installation (Development)

1. Clone this repository into your vault's `.obsidian/plugins/` folder.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the compilation in watch mode.
4. Enable **The Librarian** in Obsidian's Community Plugins settings.

---

## Contributing
Feel free to open issues or pull requests if you have ideas for new features or find bugs!

---
*Built with ❤️ for the Obsidian community.*
