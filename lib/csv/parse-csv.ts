/** Parser CSV بسيط يدعم الحقول بين علامتي اقتباس ومضاعفة الاقتباس داخل الحقل. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const pushCell = () => {
    row.push(cur);
    cur = "";
  };
  const pushRow = () => {
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushCell();
    } else if (c === "\r") {
      continue;
    } else if (c === "\n") {
      pushCell();
      pushRow();
    } else {
      cur += c;
    }
  }
  pushCell();
  if (row.length && row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}
