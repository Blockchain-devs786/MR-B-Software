import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { BrowserWindow, ipcMain } from 'electron';

let win: BrowserWindow | null = null;

export function initAutoUpdater(mainWindow: BrowserWindow) {
    win = mainWindow;

    // For private repos, set the GitHub token so electron-updater can access releases
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'Blockchain-devs786',
        repo: 'MR-B-Software',
        private: true,
        token: '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',
        releaseType: 'release',
    });

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Log all events for debugging
    autoUpdater.logger = console;

    // Check for updates on startup (delay 5 seconds to let app fully load)
    setTimeout(() => {
        console.log('Checking for updates...');
        autoUpdater.checkForUpdates().then((result) => {
            console.log('Update check result:', result?.updateInfo?.version);
        }).catch((err) => {
            console.error('Update check failed:', err?.message);
            win?.webContents.send('update-error', { message: err?.message });
        });
    }, 5000);

    // Re-check every 30 minutes
    setInterval(() => {
        autoUpdater.checkForUpdates().catch(() => { });
    }, 30 * 60 * 1000);

    // --- Events sent to renderer ---
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...');
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('No update available. Current version is latest:', info.version);
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        win?.webContents.send('update-available', {
            version: info.version,
            releaseDate: info.releaseDate,
        });
    });

    autoUpdater.on('download-progress', (progress) => {
        win?.webContents.send('update-download-progress', {
            percent: Math.round(progress.percent),
            transferred: progress.transferred,
            total: progress.total,
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info.version);
        win?.webContents.send('update-downloaded', {
            version: info.version,
        });
    });

    autoUpdater.on('error', (err) => {
        console.error('Auto-updater error:', err?.message);
        win?.webContents.send('update-error', { message: err?.message });
    });

    // --- IPC handler: user clicks "Restart & Update" ---
    ipcMain.handle('install-update', () => {
        autoUpdater.quitAndInstall(false, true);
    });
}
