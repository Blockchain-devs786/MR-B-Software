@echo off
setlocal enabledelayedexpansion

:: 1. Get current version using Node.js
for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set CURRENT_VERSION=%%v

echo =========================================
echo Current Version is: %CURRENT_VERSION%
echo =========================================

:: 2. Ask for new version
set /p NEW_VERSION="Enter new version to release (e.g., 1.1.8): "

if "%NEW_VERSION%"=="" (
    echo Error: Version cannot be empty.
    pause
    exit /b 1
)

:: 3. Update package.json version
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('./package.json','utf8')); p.version=process.env.NEW_VERSION; fs.writeFileSync('./package.json',JSON.stringify(p,null,2) + String.fromCharCode(10));"
echo [+] Updated package.json to %NEW_VERSION%

:: 4. Ask for commit message
set /p COMMIT_MSG="Enter commit message (Leave empty for 'Release version %NEW_VERSION%'): "

if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=Release version %NEW_VERSION%
)

:: 5. Git commands
echo.
echo [+] Running git add, commit, and push...
git add .
git commit -m "%COMMIT_MSG%"
git push origin main

:: 6. Build application
echo.
echo [+] Running npm build...
call npm run build

:: 7. Publish using electron-builder
echo.
echo [+] Publishing via electron-builder...
set GH_TOKEN=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
call npx electron-builder --publish always

echo.
echo =========================================
echo Release %NEW_VERSION% completed successfully!
echo =========================================
pause
