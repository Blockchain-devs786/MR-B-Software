import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';

let win: BrowserWindow | null = null;

export function initAutoUpdater(mainWindow: BrowserWindow) {
    win = mainWindow;

    // Disable auto-download — we'll notify the user first
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Check for updates on startup
    autoUpdater.checkForUpdates().catch((err) => {
        console.log('Update check failed (this is normal in dev):', err?.message);
    });

    // Re-check every 30 minutes
    setInterval(() => {
        autoUpdater.checkForUpdates().catch(() => { });
    }, 30 * 60 * 1000);

    // --- Events sent to renderer ---
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
    });

    // --- IPC handler: user clicks "Restart & Update" ---
    ipcMain.handle('install-update', () => {
        autoUpdater.quitAndInstall(false, true);
    });
}
