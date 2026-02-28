import nodemailer from 'nodemailer';
import Imap from 'imap';
import { simpleParser } from 'mailparser';

const EMAIL = 'malikazan8768@gmail.com';
const APP_PASSWORD = 'nzdz lgxg vghe ledd';

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL,
        pass: APP_PASSWORD
    }
});

export async function sendLicenseRequest(systemInfo: any): Promise<{ success: boolean; error?: string }> {
    try {
        const emailBody = JSON.stringify(systemInfo, null, 2) + '\n\nPlease reply with: validate:X (where X is the number of days)';

        await transporter.sendMail({
            from: EMAIL,
            to: EMAIL,
            subject: 'License request received from:',
            text: emailBody
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error sending license request:', error);
        return { success: false, error: error.message };
    }
}

export async function checkLicenseReply(): Promise<{ success: boolean; days?: number; error?: string }> {
    return new Promise((resolve) => {
        const imap = new Imap({
            user: EMAIL,
            password: APP_PASSWORD,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        });

        // Set timeout for connection
        const timeout = setTimeout(() => {
            if (imap.state !== 'closed') {
                imap.end();
            }
            resolve({ success: false, error: 'Connection timeout' });
        }, 30000); // 30 seconds timeout

        const cleanup = () => {
            clearTimeout(timeout);
            if (imap.state !== 'closed') {
                imap.end();
            }
        };

        imap.once('ready', () => {
            imap.openBox('INBOX', false, (err) => {
                if (err) {
                    console.error('Error opening inbox:', err);
                    cleanup();
                    resolve({ success: false, error: err.message });
                    return;
                }

                // Search for unseen emails from the sender
                imap.search([['FROM', EMAIL], 'UNSEEN'], (err, allResults) => {
                    if (err) {
                        console.error('Error searching emails:', err);
                        cleanup();
                        resolve({ success: false, error: err.message });
                        return;
                    }

                    if (!allResults || allResults.length === 0) {
                        cleanup();
                        resolve({ success: false, error: 'No new replies found from ' + EMAIL });
                        return;
                    }

                    // Sort by sequence number (newest first) and get last 10 emails
                    allResults.sort((a, b) => b - a);
                    const recentEmails = allResults.slice(0, 10);

                    processEmails(recentEmails);
                });

                const processEmails = (emailIds: number[]) => {
                    if (!emailIds || emailIds.length === 0) {
                        cleanup();
                        resolve({ success: false, error: 'No new replies found' });
                        return;
                    }

                    // Get the emails (check all provided)
                    const fetch = imap.fetch(emailIds, { bodies: '', markSeen: true }); // Mark as seen when fetching
                    let emailFound = false;
                    let processedCount = 0;
                    const totalEmails = emailIds.length;

                    fetch.on('message', (msg, seqno) => {
                        msg.on('body', (stream) => {
                            simpleParser(stream as any, (err, parsed) => {
                                processedCount++;

                                if (err) {
                                    console.error('Error parsing email:', err);
                                    if (processedCount >= totalEmails && !emailFound) {
                                        cleanup();
                                        resolve({ success: false, error: 'Error parsing email' });
                                    }
                                    return;
                                }

                                if (emailFound) return;

                                // Check both text and html content (original and lowercase)
                                const text = parsed.text || '';
                                const html = parsed.html || '';
                                const subject = parsed.subject || '';

                                // Combine all content for searching
                                const allContent = (text + ' ' + html + ' ' + subject).toLowerCase();
                                const originalContent = text + ' ' + html;

                                // Search for validate: pattern (flexible - allows spaces, case insensitive)
                                // Try multiple patterns to catch variations
                                let validateMatch = null;

                                // Pattern 0: "4 days" or "30 days" check first as it is most common in human replies
                                validateMatch = allContent.match(/(\d+)\s*days?/i);

                                // Pattern 1: "validate:90" or "validate: 90"
                                if (!validateMatch) {
                                    validateMatch = allContent.match(/validate\s*:\s*(\d+)/i);
                                }

                                // Pattern 2: "validate 90" (without colon)
                                if (!validateMatch) {
                                    validateMatch = allContent.match(/validate\s+(\d+)/i);
                                }

                                // Pattern 3: Check original case-sensitive text
                                if (!validateMatch) {
                                    validateMatch = originalContent.match(/validate\s*:\s*(\d+)/i);
                                }

                                // Pattern 4: Just numbers if email is very short (like "90" or "validate:90")
                                if (!validateMatch && text.trim().length < 50) {
                                    const numberMatch = text.match(/(\d+)/);
                                    if (numberMatch && parseInt(numberMatch[1]) > 0) {
                                        validateMatch = numberMatch;
                                    }
                                }

                                if (validateMatch) {
                                    emailFound = true;
                                    const days = parseInt(validateMatch[1], 10);

                                    if (days > 0 && days <= 3650) { // Max 10 years
                                        // Mark email as read
                                        imap.addFlags(seqno, '\\Seen', (err) => {
                                            if (err) console.error('Error marking email as read:', err);
                                        });

                                        cleanup();
                                        resolve({ success: true, days });
                                        return;
                                    }
                                }

                                // If we've processed all emails and found nothing
                                if (processedCount >= totalEmails && !emailFound) {
                                    cleanup();
                                    resolve({ success: false, error: 'No valid license found. Make sure your reply contains "validate:X" where X is the number of days (e.g., "validate:90").' });
                                }
                            });
                        });
                    });

                    fetch.once('error', (err) => {
                        console.error('Error fetching email:', err);
                        cleanup();
                        resolve({ success: false, error: err.message });
                    });

                    fetch.once('end', () => {
                        if (!emailFound && processedCount >= totalEmails) {
                            cleanup();
                            resolve({ success: false, error: 'No valid license found. Make sure your reply contains "validate:X" where X is the number of days (e.g., "validate:90").' });
                        }
                    });
                };
            });
        });

        imap.once('error', (err) => {
            console.error('IMAP error:', err);
            cleanup();
            resolve({ success: false, error: err.message });
        });

        imap.once('end', () => {
            clearTimeout(timeout);
        });

        imap.connect();
    });
}
