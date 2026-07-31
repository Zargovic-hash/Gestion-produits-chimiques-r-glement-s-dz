// Génération de rapports PDF / CSV (spec §5.2)
const PDFDocument = require('pdfkit');

const PAGE_MARGIN = 40;

const escapeCsvCell = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const generateCsv = ({ columns, rows }) => {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(';');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvCell(c.value(row))).join(';')
  );
  return [header, ...lines].join('\n');
};

/**
 * Génère un PDF tabulaire simple et le retourne sous forme de Buffer.
 */
const generatePdfTable = ({ title, subtitle, columns, rows }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).fillColor('#001965').text(title, { align: 'left' });
    if (subtitle) {
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor('#666666').text(subtitle);
    }
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#999999').text(`Généré le ${new Date().toLocaleString('fr-FR')}`);
    doc.moveDown(0.8);

    const pageWidth = doc.page.width - PAGE_MARGIN * 2;
    const colWidth = pageWidth / columns.length;
    let y = doc.y;

    const drawHeaderRow = () => {
      doc.fontSize(8).fillColor('#ffffff');
      doc.rect(PAGE_MARGIN, y, pageWidth, 20).fill('#001965');
      columns.forEach((col, i) => {
        doc.fillColor('#ffffff').text(col.label, PAGE_MARGIN + i * colWidth + 4, y + 6, {
          width: colWidth - 8,
          ellipsis: true,
        });
      });
      y += 20;
    };

    drawHeaderRow();

    rows.forEach((row, idx) => {
      if (y > doc.page.height - PAGE_MARGIN - 20) {
        doc.addPage();
        y = PAGE_MARGIN;
        drawHeaderRow();
      }
      if (idx % 2 === 0) {
        doc.rect(PAGE_MARGIN, y, pageWidth, 18).fill('#f3f4f6');
      }
      doc.fontSize(7.5).fillColor('#1f2937');
      columns.forEach((col, i) => {
        doc.text(String(col.value(row) ?? ''), PAGE_MARGIN + i * colWidth + 4, y + 5, {
          width: colWidth - 8,
          ellipsis: true,
        });
      });
      y += 18;
    });

    if (rows.length === 0) {
      doc.fontSize(9).fillColor('#999999').text('Aucune donnée pour cette période.', PAGE_MARGIN, y + 10);
    }

    doc.end();
  });
};

/**
 * Rapport 2 : détail d'une autorisation (infos générales + produits + historique achats).
 */
const generateAutorisationDetailPdf = ({ autorisation, produits, achats }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).fillColor('#001965').text(`Autorisation ${autorisation.numero_autorisation}`);
    doc.fontSize(8).fillColor('#999999').text(`Généré le ${new Date().toLocaleString('fr-FR')}`);
    doc.moveDown(0.8);

    doc.fontSize(10).fillColor('#1f2937');
    doc.text(`Date de délivrance : ${new Date(autorisation.date_delivrance).toLocaleDateString('fr-FR')}`);
    doc.text(`Date d'échéance : ${new Date(autorisation.date_echeance).toLocaleDateString('fr-FR')} (${autorisation.jours_restants} jour(s) restant(s))`);
    doc.text(`Type de marché : ${autorisation.type_marche}`);
    doc.text(`État : ${autorisation.etat_libelle}`);
    doc.text(`% Acquis global : ${autorisation.pourcentage_acquis}%`);
    doc.moveDown(1);

    const pageWidth = doc.page.width - PAGE_MARGIN * 2;

    const drawTable = (heading, columns, rows) => {
      doc.fontSize(12).fillColor('#001965').text(heading);
      doc.moveDown(0.3);
      let y = doc.y;
      const colWidth = pageWidth / columns.length;

      doc.rect(PAGE_MARGIN, y, pageWidth, 18).fill('#001965');
      columns.forEach((col, i) => {
        doc.fontSize(7.5).fillColor('#ffffff').text(col.label, PAGE_MARGIN + i * colWidth + 4, y + 5, {
          width: colWidth - 8,
          ellipsis: true,
        });
      });
      y += 18;

      rows.forEach((row, idx) => {
        if (y > doc.page.height - PAGE_MARGIN - 20) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
        if (idx % 2 === 0) doc.rect(PAGE_MARGIN, y, pageWidth, 16).fill('#f3f4f6');
        columns.forEach((col, i) => {
          doc.fontSize(7.5).fillColor('#1f2937').text(String(col.value(row) ?? ''), PAGE_MARGIN + i * colWidth + 4, y + 4, {
            width: colWidth - 8,
            ellipsis: true,
          });
        });
        y += 16;
      });
      if (rows.length === 0) {
        doc.fontSize(8).fillColor('#999999').text('Aucune donnée.', PAGE_MARGIN, y + 6);
        y += 20;
      }
      doc.y = y + 15;
    };

    drawTable(
      'Produits autorisés',
      [
        { label: 'Product ID', value: (r) => r.product_code },
        { label: 'Désignation', value: (r) => r.designation_technique },
        { label: 'Qté Autorisée', value: (r) => `${r.quantite_autorisee} ${r.unite}` },
        { label: 'Qté Acquise', value: (r) => `${r.quantite_acquise} ${r.unite}` },
        { label: 'Reste', value: (r) => `${r.reste_a_acquerir} ${r.unite}` },
        { label: '% Acquis', value: (r) => `${r.pourcentage_acquis}%` },
      ],
      produits
    );

    drawTable(
      'Historique des achats',
      [
        { label: 'Date', value: (r) => new Date(r.date_achat).toLocaleDateString('fr-FR') },
        { label: 'Produit', value: (r) => r.designation_technique },
        { label: 'Quantité', value: (r) => `${r.quantite_acquise} ${r.unite}` },
        { label: 'Fournisseur', value: (r) => r.fournisseur },
        { label: 'N° Facture', value: (r) => r.numero_facture },
      ],
      achats
    );

    doc.end();
  });
};

module.exports = { generateCsv, generatePdfTable, generateAutorisationDetailPdf };
