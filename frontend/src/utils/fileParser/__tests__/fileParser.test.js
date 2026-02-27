import { parseFile } from '../fileParser';

/* =====================
   FileReader Mock
===================== */

/**
 * Wir hängen den Inhalt explizit an das File-Objekt,
 * da Jest/jsdom weder TextDecoder noch file.text() zuverlässig unterstützt.
 */
class MockFileReader {
    readAsText(file) {
        this.onload({
            target: { result: file.__text }
        });
    }

    readAsArrayBuffer(file) {
        this.onload({
            target: { result: file.__buffer }
        });
    }
}

global.FileReader = MockFileReader;

/* =====================
   Helpers
===================== */

const createTextFile = (name, content) => {
    const file = new File([content], name, { type: 'text/plain' });
    file.__text = content; // 👈 explizit für Tests
    return file;
};

/* =====================
   Tests
===================== */

describe('parseFile', () => {

    test('parses CSV file with comma delimiter', async () => {
        const csv = `name,age\nAlice,30\nBob,25`;
        const file = createTextFile('test.csv', csv);

        const result = await parseFile(file);

        expect(result).toEqual([
            ['name', 'age'],
            ['Alice', '30'],
            ['Bob', '25']
        ]);
    });

    test('parses CSV file with semicolon delimiter', async () => {
        const csv = `name;age\nAlice;30\nBob;25`;
        const file = createTextFile('test.csv', csv);

        const result = await parseFile(file);

        expect(result).toEqual([
            ['name', 'age'],
            ['Alice', '30'],
            ['Bob', '25']
        ]);
    });

    test('parses JSON array of objects', async () => {
        const json = JSON.stringify([
            { name: 'Alice', age: 30 },
            { name: 'Bob', age: 25 }
        ]);

        const file = createTextFile('test.json', json);
        const result = await parseFile(file);

        expect(result).toEqual([
            ['name', 'age'],
            ['Alice', 30],
            ['Bob', 25]
        ]);
    });

    test('throws error for unsupported JSON structure', async () => {
        const json = JSON.stringify({ name: 'Alice' });
        const file = createTextFile('test.json', json);

        await expect(parseFile(file)).rejects.toThrow(
            'Unsupported JSON structure'
        );
    });
});