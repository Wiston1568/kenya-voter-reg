// backend/helpers/pdfGenerator.js
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs-extra');

async function generateVoterPDF(record) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create document
      const doc = new PDFDocument({ size: [360, 230], margin: 12 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(12).text('REPUBLIC OF KENYA', { align: 'center' });
      doc.fontSize(14).text('VOTER ID CARD', { align: 'center' });
      doc.moveDown(0.5);

      // Left side: photo area
      if (record.photoPath && await fs.pathExists(record.photoPath)) {
        try { doc.image(record.photoPath, 12, 70, { width: 80, height: 100 }); } catch(e) { /* ignore */ }
      }

      // Text info
      doc.fontSize(10);
      doc.text(`Name: ${record.first_name || ''} ${record.last_name || ''}`, 110, 70);
      doc.text(`Kenyan ID: ${record.kenyan_id || ''}`);
      doc.text(`County: ${record.county || ''}`);
      doc.text(`Sub-County: ${record.sub_county || ''}`);
      doc.text(`Ward: ${record.ward || ''}`);
      doc.moveDown(0.2);
      doc.text(`Voter Reg No: ${record.voter_reg_no || ''}`);

      // QR code (voter_reg_no + kenyan_id)
      const qrData = JSON.stringify({ voter_reg_no: record.voter_reg_no, kenyan_id: record.kenyan_id });
      const qrDataUrl = await QRCode.toDataURL(qrData);
      const base64 = qrDataUrl.split(',')[1];
      const imgBuf = Buffer.from(base64, 'base64');

      doc.image(imgBuf, 260, 70, { width: 80, height: 80 });

      doc.moveDown(1);
      doc.fontSize(8).text('Present this card with your national ID on election day.', { align: 'left' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateVoterPDF };
