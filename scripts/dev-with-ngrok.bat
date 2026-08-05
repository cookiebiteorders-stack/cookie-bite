@echo off
echo Starting Cookie Bite Dev Server with ngrok...
echo.
echo This will:
echo 1. Start the Next.js dev server on port 3000
echo 2. Start ngrok tunnel to expose localhost:3000
echo.
echo Copy the ngrok HTTPS URL and use it in Paymob Dashboard:
echo - Webhook URL: https://YOUR-NGROK-URL/api/webhooks/paymob
echo - Redirect URL: https://YOUR-NGROK-URL/checkout/paymob-response
echo.
echo Press Ctrl+C to stop both servers
echo.
echo Starting dev server...
start "Cookie Bite Dev Server" cmd /k "npm run dev"
echo Waiting for dev server to start...
timeout /t 5
echo.
echo Starting ngrok...
ngrok http 3000
