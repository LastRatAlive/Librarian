# Librarian for Obsidian

Librarian is a comprehensive book-tracking and library management plugin for Obsidian. It provides a local-first alternative to services like Goodreads by managing book metadata, reading progress, and personal libraries directly within your vault.

## Introduction

Librarian transforms Obsidian into a sophisticated reading journal. It automates the creation of book notes using the Open Library API, manages reading states through non-destructive frontmatter updates, and provides high-level data visualization for your reading habits.

## Key Features

### Metadata Management
- **Open Library Integration**: Search and import book metadata including Title, Author, ISBN, Page Count, and Cover URLs.
- **Automated Note Generation**: Create standardized book notes based on customizable templates.
- **Custom Properties**: Support for user-defined YAML properties alongside core tracking fields.

### Reading Lifecycle Tracking
- **State Management**: Track books through "To-Read", "Currently Reading", "Finished", and "DNF" (Did Not Finish) states.
- **Session Logging**: Automatically records start and end dates for every reading session, supporting multiple re-reads.
- **Header Actions**: Injects functional UI elements directly into the Obsidian note header for frictionless state updates.

### Library Organization & Visualization
- **Bookshelves**: Group books into custom shelves (e.g., "Reference", "Philosophy", "2024 Queue").
- **Sidebar Views**: Dedicated views for browsing your library by shelf and analyzing reading statistics.
- **Statistical Analysis**: Track total pages read, unique books completed, and drill down into specific date ranges.

### Quote & Annotation Support
- **Contextual Quotes**: Quickly capture quotes with page numbers and tags.
- **Block Referencing**: Generates stable block IDs for easy embedding in other notes.
- **Aggregation**: Surface quotes across your entire library using dynamic code blocks.

## Data Structure

Librarian relies on standardized YAML frontmatter. Below is an example of the data structure generated and managed by the plugin:

```yaml
---
type: book
title: "Foundation"
author: "Isaac Asimov"
isbn: "9780553293357"
pages: 244
cover: "https://covers.openlibrary.org/b/id/10416358-L.jpg"
shelf: 
  - Classics
  - Sci-Fi
readCount: 1
currentlyReading: false
dateRead: 2024-03-01
readHistory:
  - start: 2024-02-15
    end: 2024-03-01
---
```

## Usage Examples

### The `librarian` Code Block

You can embed dynamic lists or quote aggregations into any note (e.g., your Daily Note) using the `librarian` code block.

**Query reading history for a specific date:**
````markdown
```librarian
date: 2024-03-05
hideHeader: false
```
````

**Aggregate quotes by tag:**
````markdown
```librarian
tag: philosophy
limit: 5
hideHeader: true
```
````

### Custom Templates

Librarian allows you to define a **Template file** in the settings. This template controls the body content below the automatically managed frontmatter.

#### Available Placeholders
- `{{title}}`: The book's title.
- `{{author}}`: The primary author.
- `{{pages}}`: Page count.
- `{{year}}`: Publication year.
- `{{cover}}`: URL of the cover image.
- `{{cover_image}}`: Formatted markdown image (e.g., `![](url)`).
- `{{isbn}}`: ISBN-10 or ISBN-13.
- `{{id}}`: Open Library Work ID.
- `{{dateAdded}}`: Date the book was added to your vault.

#### Template Example
Create a markdown file (e.g., `templates/book-template.md`) with the following content:

```markdown
# {{title}} - {{author}}

{{cover_image}}

## Summary
(Write your summary here...)

## Quotes
> [!quote]
> Add your favorite quotes here.

## Notes
- 
```

## Installation

### From Community Plugins (Recommended)
1. Open Obsidian **Settings** > **Community Plugins**.
2. Click **Browse** and search for "Librarian".
3. Click **Install**, then **Enable**.

### Manual Installation (Development)
1. Clone this repository into your vault's `.obsidian/plugins/` folder.
2. Install dependencies: `npm install`.
3. Build the plugin: `npm run build`.
4. Enable **Librarian** in the Obsidian Community Plugins settings.

## Technical Details

- **Language**: TypeScript
- **Dependencies**: Obsidian API, Open Library API
- **License**: 0-BSD

---
*Developed by LastRatAlive*
