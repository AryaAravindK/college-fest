import puppeteer from 'puppeteer';
import path from 'path';

interface CertificateOptions {
  eventName: string;
  type: 'winner' | 'participant';
  recipientName: string;
  collegeName: string;
}

/**
 * Utility function to generate a certificate as a PDF buffer
 */
export async function generateCertificatePDFBuffer({
  eventName,
  type,
  recipientName,
  collegeName,
}: CertificateOptions): Promise<Buffer> {
  const logoPath = path.resolve('./public/logos/college_logo.png'); // ✅ works in Next.js
  const logoURL = `file://${logoPath}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // for Vercel/production
  });

  const page = await browser.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Certificate</title>
      <style>
        body { margin:0; padding:0; font-family:'Times New Roman',serif; background:#faf9f6; display:flex; justify-content:center; align-items:center; }
        .certificate-container { width:90%; max-width:1100px; padding:70px 60px; text-align:center; background:#fff; border:16px solid #b8860b; outline:8px double #000; box-shadow:0 0 25px rgba(0,0,0,0.3); position:relative; }
        .certificate-container::before { content:"SURANA COLLEGE"; position:absolute; top:40%; left:50%; transform:translate(-50%,-50%) rotate(-20deg); font-size:100px; font-weight:bold; color:rgba(184,134,11,0.08); }
        .logo { width:150px; margin-bottom:15px; }
        .college-name { font-size:44px; font-weight:bold; text-transform:uppercase; letter-spacing:3px; color:#2c2c54; text-shadow:1px 1px #aaa; margin-bottom:30px; }
        .title { font-size:50px; font-weight:bold; margin:20px 0; color:#b8860b; text-transform:uppercase; }
        .subtitle { font-size:22px; margin:8px 0; color:#333; }
        .name { font-size:44px; margin:25px 0; text-decoration:underline; font-weight:bold; color:#000; font-family:'Brush Script MT',cursive; }
        .event-title { font-size:26px; font-weight:bold; margin-top:10px; color:#2c2c54; }
        .type { font-size:22px; margin-top:8px; color:#444; font-style:italic; }
        .footer { margin-top:120px; display:flex; justify-content:space-around; padding:0 50px; }
        .footer div { font-size:18px; border-top:2px solid #000; width:220px; text-align:center; padding-top:8px; font-weight:bold; color:#2c2c54; }
        .seal { position:absolute; bottom:70px; right:80px; width:120px; height:120px; border:4px solid #b8860b; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#b8860b; text-transform:uppercase; }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        <img src="${logoURL}" class="logo"/>
        <div class="college-name">${collegeName}</div>
        <div class="title">Certificate of ${type === 'winner' ? 'Excellence' : 'Participation'}</div>
        <div class="subtitle">This certificate is proudly presented to</div>
        <div class="name">${recipientName}</div>
        <div class="subtitle">For participating in the event</div>
        <div class="event-title">${eventName}</div>
        <div class="type">${type === 'winner' ? 'Winner' : 'Participant'}</div>
        <div class="footer"><div>Coordinator</div><div>Head of Department</div><div>Principal</div></div>
        <div class="seal">Official Seal</div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

  await browser.close();
  return pdfBuffer;
}
