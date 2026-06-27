@echo off
echo ==============================================
echo  DEPLOYMENT SCRIPT HANLAPTOP APP
echo ==============================================
echo.

echo [1] Memulai proses Build Frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build Frontend gagal!
    exit /b %errorlevel%
)
echo [OK] Build Frontend sukses.
echo.

echo [2] Memulai proses Build Backend...
cd backend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build Backend gagal!
    cd ..
    exit /b %errorlevel%
)
echo [OK] Build Backend sukses.
cd ..
echo.

echo [3] Melakukan Deploy ke Vercel...
echo Pastikan Anda sudah login ke Vercel (npx vercel login) jika belum.
call npx vercel --prod
if %errorlevel% neq 0 (
    echo [ERROR] Deploy ke Vercel gagal!
    exit /b %errorlevel%
)

echo.
echo ==============================================
echo  DEPLOY SELESAI !
echo ==============================================
pause
