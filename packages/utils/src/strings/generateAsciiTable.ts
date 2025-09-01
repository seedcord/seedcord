/**
 * Generates an ASCII table from the provided data.
 *
 * @param data - The data to be displayed in the table.
 * @returns The generated ASCII table as a string.
 */

export function generateAsciiTable(data: string[][]): string {
  if (data.length === 0) return '';

  const firstRow = data[0];
  if (!firstRow || firstRow.length === 0) return '';

  let table = '';
  const columnWidths: number[] = [];

  // Determine the maximum width for each column
  for (let i = 0; i < firstRow.length; i++) {
    let maxWidth = 0;
    for (const row of data) {
      const cell = row[i];
      if (cell !== undefined) maxWidth = Math.max(maxWidth, cell.length);
    }
    columnWidths.push(maxWidth);
  }

  // Function to create a horizontal line
  const createLine = (char: string, left: string, intersect: string, right: string): string => {
    let line = left;
    columnWidths.forEach((width, index) => {
      line += char.repeat(width + 2);
      if (index < columnWidths.length - 1) line += intersect;
      else line += right;
    });
    line += '\n';
    return line;
  };

  // Top border
  table += createLine('═', '╔', '╦', '╗');

  data.forEach((row, rowIndex) => {
    // Row content
    table += '║';
    row.forEach((cell, columnIndex) => {
      const columnWidth = columnWidths[columnIndex];
      if (columnWidth !== undefined) table += ` ${cell.padEnd(columnWidth)} ║`;
    });
    table += '\n';

    // Separator or bottom border
    if (rowIndex < data.length - 1) table += createLine('─', '╠', '╬', '╣');
    else table += createLine('═', '╚', '╩', '╝');
  });

  return table;
}
