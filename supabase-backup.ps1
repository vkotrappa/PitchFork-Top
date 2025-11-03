# -------------------------------
# Supabase full backup for Windows
# -------------------------------

$projectRef = "nsimmsznrutwgtkkblgw"
$timestamp  = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir  = "C:\supabase_backups\$timestamp"
$funcDir    = "$backupDir\edge_functions"
$secretsFile = "$backupDir\secrets.txt"

New-Item -ItemType Directory -Force -Path $backupDir,$funcDir | Out-Null

Write-Host "Backing up database schema, roles, and data..."

# Roles
supabase db dump --project-ref $projectRef --role-only -f "$backupDir\roles.sql"

# Schema (tables, views, policies, triggers, functions)
supabase db dump --project-ref $projectRef -f "$backupDir\schema.sql"

# Data
supabase db dump --project-ref $projectRef --data-only -f "$backupDir\data.sql"

Write-Host "Backing up Edge Functions..."
# Get function list (strip header)
$funcList = (supabase functions list --project-ref $projectRef | Select-String -Skip 1).ToString().Split(" ",[System.StringSplitOptions]::RemoveEmptyEntries)
if ($funcList.Length -gt 0) {
    foreach ($f in $funcList) {
        Write-Host "  -> $f"
        supabase functions download $f --project-ref $projectRef --path "$funcDir\$f"
    }
} else {
    Write-Host "  (No edge functions found)"
}

Write-Host "Backing up environment secrets..."
try {
    supabase secrets list --project-ref $projectRef | Out-File -Encoding utf8 $secretsFile
} catch {
    Write-Host "  (Could not list secrets; skipping.)"
}

Write-Host "`n✅ Backup complete!"
Write-Host "Location: $backupDir"
