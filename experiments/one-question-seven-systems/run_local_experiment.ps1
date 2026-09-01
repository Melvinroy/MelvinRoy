$ErrorActionPreference = 'Stop'

Write-Host '== One Question, Seven Systems: local experiment =='

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  Write-Host 'Ollama is not installed or not on PATH.'
  Write-Host 'Install Ollama first, then rerun this script.'
  exit 2
}

Write-Host ('Ollama: ' + (ollama --version))

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $PSScriptRoot

try {
  Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 3 | Out-Null
  Write-Host 'Ollama service is already running.'
} catch {
  Write-Host 'Starting Ollama service...'
  Start-Process -WindowStyle Hidden -FilePath 'ollama' -ArgumentList 'serve'
  Start-Sleep -Seconds 3
}

$model = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { 'qwen2.5:3b' }
Write-Host "Ensuring model is available: $model"
ollama pull $model

Write-Host 'Running 6-case local-model smoke test...'
python local_model_test.py

$resultPath = Join-Path $PSScriptRoot 'results\local_model_smoke.json'
if (-not (Test-Path $resultPath)) {
  throw "Expected result file not found: $resultPath"
}

Write-Host "Result written to: $resultPath"
Write-Host 'Done.'
