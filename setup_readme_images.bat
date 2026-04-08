@echo off
set SRC=C:\Users\Administrator\.gemini\antigravity\brain\7542542c-5e15-4278-af8e-1dc759602d22
set DEST=assets\screenshots

echo [Tank.io] Creating screenshots directory...
if not exist %DEST% mkdir %DEST%

echo [Tank.io] Copying and Renaming images...
copy "%SRC%\media__1775646188604.png" "%DEST%\lobby.png" /y
copy "%SRC%\media__1775646200642.png" "%DEST%\bosses.png" /y
copy "%SRC%\media__1775646207890.png" "%DEST%\classes.png" /y
copy "%SRC%\media__1775646217073.png" "%DEST%\gameplay.png" /y
copy "%SRC%\media__1775646230690.png" "%DEST%\death.png" /y

echo.
echo [Tank.io] Images are now in the project!
echo [Tank.io] Pushing latest changes to GitHub...
call upload_to_github.bat

echo.
echo [Tank.io] DONE! Refresh your GitHub page to see the beautiful README.
pause
