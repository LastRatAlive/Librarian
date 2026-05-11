import { App, Notice, TFile } from 'obsidian';
import LibrarianPlugin from './main';
import { DEFAULT_SETTINGS } from './settings';

export interface BookData {
    title: string;
    author: string;
    year: string;
    cover: string;
    isbn: string;
    pages: number;
    subject: string;
    id: string;
    dataSource: string;
}

export function sanitizePathSegment(value: string): string {
    return value.replace(/[\\/:*?"<>|]/g, '').trim();
}

export function resolveFolderPath(template: string, vars: Record<string, string>): string {
    let resolved = template;
    for (const [key, value] of Object.entries(vars)) {
        const sanitized = sanitizePathSegment(value || 'Unknown');
        resolved = resolved.split(`{{${key}}}`).join(sanitized);
    }
    return resolved;
}

export async function createBookNote(app: App, plugin: LibrarianPlugin, book: BookData) {
    const dateAdded = new Date().toISOString().split('T')[0] ?? "";
    const safeTitle = book.title.replace(/[\\/:*?"<>|]/g, '');

    const enabledProps = plugin.settings.enabledProperties;
    let fmLines: string[] = ["---"];

    const addFM = (key: string, value: string | number | boolean) => {
        if (enabledProps[key]) {
            if (typeof value === 'string') {
                fmLines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
            } else {
                fmLines.push(`${key}: ${value}`);
            }
        }
    };

    fmLines.push('type: book');
    addFM('title', book.title);
    addFM('englishTitle', book.title);
    addFM('year', book.year);
    addFM('dataSource', book.dataSource);
    addFM('id', book.id);
    addFM('author', book.author);
    fmLines.push(`pages: ${book.pages}`);
    addFM('image', book.cover);
    addFM('isbn', book.isbn);
    addFM('tags', '');
    addFM('dateAdded', dateAdded);
    fmLines.push('readCount: 0');
    fmLines.push('currentlyReading: false');
    addFM('myRating', 0);
    addFM('subject', book.subject);

    if (plugin.settings.additionalProperties && plugin.settings.additionalProperties.trim()) {
        fmLines.push(plugin.settings.additionalProperties.trim());
    }
    fmLines.push("---");
    const generatedFM = fmLines.join("\n");

    let body = plugin.settings.bookTemplate || DEFAULT_SETTINGS.bookTemplate;

    if (plugin.settings.templatePath) {
        const templateFile = app.vault.getAbstractFileByPath(plugin.settings.templatePath);
        if (templateFile instanceof TFile) {
            body = await app.vault.read(templateFile);
        } else {
            new Notice(`Template file not found at: ${plugin.settings.templatePath}. Using fallback template.`);
        }
    }

    const placeholders: { [key: string]: string } = {
        '{{title}}': book.title,
        '{{author}}': book.author,
        '{{pages}}': book.pages.toString(),
        '{{year}}': book.year,
        '{{cover}}': book.cover,
        '{{cover_image}}': book.cover ? `![](${book.cover})` : '',
        '{{isbn}}': book.isbn,
        '{{id}}': book.id,
        '{{dateAdded}}': dateAdded
    };

    for (const [key, value] of Object.entries(placeholders)) {
        body = body.split(key).join(value);
    }

    const finalContent = `${generatedFM}\n${body}`;

    const pathTemplate = plugin.settings.defaultBookFolder || '';
    const pathVars: Record<string, string> = {
        author: book.author,
        year: book.year,
        title: book.title,
        firstLetter: book.title.charAt(0).toUpperCase(),
        subject: book.subject,
    };
    let folderPath = resolveFolderPath(pathTemplate, pathVars);
    folderPath = folderPath.replace(/^\/+|\/+$/g, '');

    let fileName = `${safeTitle}.md`;
    let fullPath = folderPath === '' ? fileName : `${folderPath}/${fileName}`;

    let i = 1;
    while (app.vault.getAbstractFileByPath(fullPath)) {
        fileName = `${safeTitle} (${i}).md`;
        fullPath = folderPath === '' ? fileName : `${folderPath}/${fileName}`;
        i++;
    }

    try {
        if (folderPath !== '') {
            const folders = folderPath.split('/');
            let currentPath = '';

            for (const folder of folders) {
                currentPath = currentPath === '' ? folder : `${currentPath}/${folder}`;
                const folderExists = app.vault.getAbstractFileByPath(currentPath);
                if (!folderExists) {
                    await app.vault.createFolder(currentPath);
                }
            }
        }

        const file = await app.vault.create(fullPath, finalContent);
        void app.workspace.getLeaf(false).openFile(file);
        new Notice(`Added ${book.title} to your library`);
    } catch (error) {
        console.error("Error creating book note:", error);
        new Notice("Error creating book note. Does the target folder exist?");
    }
}
