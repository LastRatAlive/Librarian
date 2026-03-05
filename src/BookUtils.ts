import { App, TFile } from 'obsidian';

interface ReadSession {
    start: string;
    end: string;
}

export function getBooksActiveOnDate(app: App, dateString: string): TFile[] {
    const selectedDate = new Date(dateString);
    if (isNaN(selectedDate.getTime())) {
        return [];
    }

    const allFiles = app.vault.getMarkdownFiles();
    const matches: TFile[] = [];

    for (const file of allFiles) {
        const cache = app.metadataCache.getFileCache(file);
        const history = cache?.frontmatter?.['readHistory'] as ReadSession[] | undefined;

        if (Array.isArray(history)) {
            for (const session of history) {
                const start = session.start ? new Date(session.start) : null;
                const end = (session.end && session.end !== 'DNF' && session.end !== '') ? new Date(session.end) : null;

                if (start && start <= selectedDate) {
                    if (!session.end || session.end === '') {
                        matches.push(file);
                        break;
                    } else if (end && end >= selectedDate) {
                        matches.push(file);
                        break;
                    }
                }
            }
        }
    }

    return matches;
}
