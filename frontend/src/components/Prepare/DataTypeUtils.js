export const RapidMinerTypes = [
    'polynominal',
    'binominal',
    'real',
    'integer',
    'date_time',
    'date',
    'time'
];

/**
 * Automatische Erkennung der Datentypen für jede Spalte
 * @param {Array<Array<any>>} data - Tabelle (erste Zeile sind Header)
 * @returns {Array<string>} - Array mit einem Typ pro Spalte
 */
export function inferColumnTypes(data) {
    if (!data || data.length < 2) return [];

    const headers = data[0];
    const numCols = headers.length;
    const types = new Array(numCols).fill('polynominal');

    for (let col = 0; col < numCols; col++) {
        let isInteger = true;
        let isReal = true;
        let isDate = true;
        let uniqueValues = new Set();
        let hasData = false;

        for (let row = 1; row < data.length; row++) {
            const val = data[row][col];
            if (val === '?' || val === '' || val === null || val === undefined) continue;

            hasData = true;
            const strVal = String(val).trim();
            uniqueValues.add(strVal);

            // Integer check
            if (isInteger && !/^-?\d+$/.test(strVal)) isInteger = false;
            // Real check
            if (isReal && !/^-?\d+(\.\d+)?$/.test(strVal)) isReal = false;
            // Date check
            if (isDate && isNaN(Date.parse(strVal))) isDate = false;
        }

        if (!hasData) {
            types[col] = 'polynominal';
        } else if (uniqueValues.size <= 2 && uniqueValues.size > 0) {
            types[col] = 'binominal';
        } else if (isInteger) {
            types[col] = 'integer';
        } else if (isReal) {
            types[col] = 'real';
        } else if (isDate) {
            // Einfache Unterscheidung zwischen date_time, date, time
            // Hier nutzen wir standardmäßig date_time fürs Erste
            types[col] = 'date_time';
        } else {
            types[col] = 'polynominal';
        }
    }

    return types;
}

/**
 * Konvertiert das Tabellen-Array wieder in ein CSV String für den Upload
 */
export function convertDataToCSV(data) {
    return data.map(row =>
        row.map(cell => {
            let str = String(cell !== null && cell !== undefined && cell !== '?' ? cell : '');
            // Maskiere Kommas und Anführungszeichen nach CSV-Standard
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                str = `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')
    ).join('\n');
}
