& "$env:ProgramFiles\Microsoft Visual Studio\2022\Community\Common7\Tools\Launch-VsDevShell.ps1" *>$null

Write-Host "Compiling..."
& cl /nologo /W4 /O2 ".\DosDateTimeUtil.c"
Remove-Item -Force ".\DosDateTimeUtil.obj"

Write-Host ""

Write-Host "Running..."
Write-Output "##############################"
& ./DosDateTimeUtil.exe $args
Write-Output "##############################"