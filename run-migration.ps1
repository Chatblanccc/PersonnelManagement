# 数据库迁移脚本
$env:PGPASSWORD = "postgres"
$PSQL_PATH = "C:\Program Files\PostgreSQL\15\bin\psql.exe"

# 如果找不到 PostgreSQL 15，尝试其他版本
if (-not (Test-Path $PSQL_PATH)) {
    $PSQL_PATH = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
}
if (-not (Test-Path $PSQL_PATH)) {
    $PSQL_PATH = "C:\Program Files\PostgreSQL\14\bin\psql.exe"
}

Write-Host "正在执行数据库迁移..." -ForegroundColor Green
& $PSQL_PATH -U postgres -d personnel_management -f backend\add_profile_features.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 迁移成功完成！" -ForegroundColor Green
} else {
    Write-Host "✗ 迁移失败，请检查错误信息" -ForegroundColor Red
}

$env:PGPASSWORD = ""

