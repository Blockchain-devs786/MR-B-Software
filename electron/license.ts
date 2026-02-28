import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import { execSync } from 'child_process';

interface LicenseData {
    valid: boolean;
    days: number;
    activatedAt: string;
    expiresAt: string;
    hostname: string;
    platform: string;
    arch: string;
}

// Get secure license file path in AppData
function getLicenseFilePath(): string {
    const appDataPath = app.getPath('userData');
    // Store in a hidden subdirectory
    const licenseDir = path.join(appDataPath, '.license');

    // Create directory if it doesn't exist
    if (!fs.existsSync(licenseDir)) {
        fs.mkdirSync(licenseDir, { recursive: true });
    }

    return path.join(licenseDir, 'license.dat');
}

export function getLicenseData(): LicenseData | null {
    try {
        const licensePath = getLicenseFilePath();

        if (!fs.existsSync(licensePath)) {
            return null;
        }

        const data = fs.readFileSync(licensePath, 'utf-8');
        const license: LicenseData = JSON.parse(data);

        return license;
    } catch (error) {
        console.error('Error reading license:', error);
        return null;
    }
}

export function saveLicenseData(days: number): boolean {
    try {
        const licensePath = getLicenseFilePath();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        const license: LicenseData = {
            valid: true,
            days,
            activatedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            hostname: os.hostname(),
            platform: process.platform,
            arch: process.arch
        };

        // Remove hidden attribute if file exists (Windows)
        if (process.platform === 'win32' && fs.existsSync(licensePath)) {
            try {
                execSync(`attrib -h "${licensePath}"`, { stdio: 'ignore' });
            } catch (e) {
                // Ignore if attrib command fails
            }
        }

        fs.writeFileSync(licensePath, JSON.stringify(license, null, 2), 'utf-8');

        // Make file hidden on Windows
        if (process.platform === 'win32') {
            try {
                execSync(`attrib +h "${licensePath}"`, { stdio: 'ignore' });
            } catch (e) {
                // Ignore if attrib command fails
            }
        }

        return true;
    } catch (error) {
        console.error('Error saving license:', error);
        return false;
    }
}

export function isLicenseValid(): boolean {
    const license = getLicenseData();

    if (!license || !license.valid) {
        return false;
    }

    const now = new Date();
    const expiresAt = new Date(license.expiresAt);

    // Check if expired
    if (now > expiresAt) {
        return false;
    }

    // Verify hostname matches (prevent license transfer)
    if (license.hostname !== os.hostname()) {
        return false;
    }

    return true;
}

export function getSystemInfo() {
    return {
        hostname: os.hostname(),
        platform: process.platform,
        arch: process.arch,
        timestamp: new Date().toISOString()
    };
}
