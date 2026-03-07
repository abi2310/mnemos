import * as XLSX from 'xlsx';

/**
 * Parses a CSV or Excel file and returns data as:
 * [
 *   ['col1', 'col2', ...],
 *   ['value1', 'value2', ...],
 *   ...
 * ]
 */
export const parseFile = (file) => {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
        return parseDelimitedText(file);
    }

    if (extension === 'json') {
        return parseJson(file);
    }

    if (extension === 'xlsx' || extension === 'xls') {
        return parseExcel(file);
    }

    throw new Error('Unsupported file type');
};

/* ===================== CSV ===================== */

const parseDelimitedText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target.result;

            const delimiter = detectDelimiter(text);

            const rows = text
                .split(/\r?\n/)
                .map(r => r.trim())
                .filter(Boolean)
                .map(row => row.split(delimiter));

            resolve(rows);
        };

        reader.onerror = reject;
        reader.readAsText(file);
    });
};

const detectDelimiter = (text) => {
    const candidates = [',', ';', '\t', '|'];

    const lines = text.split(/\r?\n/).slice(0, 5);

    const scores = candidates.map(delim => {
        return lines.reduce((acc, line) => acc + (line.split(delim).length - 1), 0);
    });

    const maxScore = Math.max(...scores);
    return candidates[scores.indexOf(maxScore)] || ',';
};


/* ===================== EXCEL ===================== */

const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const rows = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: ''
                });

                resolve(rows);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(file); // 🔴 wichtig für Excel
    });
};
const parseJson = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);

                // Array of Objects → Header + Rows
                if (Array.isArray(json) && typeof json[0] === 'object') {
                    const headers = Object.keys(json[0]);
                    const rows = json.map(obj =>
                        headers.map(h => obj[h] ?? '')
                    );
                    resolve([headers, ...rows]);
                    return;
                }

                // Array of Arrays
                if (Array.isArray(json)) {
                    resolve(json);
                    return;
                }

                reject(new Error('Unsupported JSON structure'));
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = reject;
        reader.readAsText(file);
    });
};