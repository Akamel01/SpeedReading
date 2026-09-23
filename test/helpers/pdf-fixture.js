// Test-only minimal PDF builder (pure string assembly, no dependencies).
// Produces a valid single-font PDF with correct xref offsets.

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildMinimalPdf(pages) {
  const objects = [];
  const pageRefs = [];
  let nextId = 3;

  const pageIds = pages.map(() => nextId++);
  const contentIds = pages.map(() => nextId++);
  const fontId = nextId++;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  pages.forEach((pageText, i) => {
    objects[pageIds[i]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[i]} 0 R ` +
      `/Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
    const stream = `BT /F1 12 Tf 72 720 Td (${escapePdfText(pageText)}) Tj ET`;
    const bytes = Buffer.byteLength(stream, 'latin1');
    objects[contentIds[i]] = `<< /Length ${bytes} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  const maxId = nextId - 1;
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id <= maxId; id++) {
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}
