# ==============================================================================
# Azure Resource Automated Deployment Script (PowerShell)
# Project: Serverless Fan-Out/Fan-In Parallel Document Extraction Engine
# Region: eastasia (Targeted from allowed student regions)
# Budget Strategy: Serverless / Consumption / Free F0 ($0.00 idle cost)
# ==============================================================================

param(
    [string]$ResourceGroup = "rg-fanin-fanout-prod",
    [string]$Location = "eastasia",
    [string]$Suffix = (Get-Random -Minimum 1000 -Maximum 9999).ToString()
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  AZURE SERVERLESS DEPLOYMENT: FAN-OUT / FAN-IN ENGINE" -ForegroundColor Cyan
Write-Host "  Target Region   : $Location" -ForegroundColor Yellow
Write-Host "  Resource Group  : $ResourceGroup" -ForegroundColor Yellow
Write-Host "  Resource Suffix : $Suffix" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan

# Service Names (Global Uniqueness)
$STORAGE_NAME     = "stfanin$Suffix"
$COSMOS_NAME      = "cosmos-fanin-$Suffix"
$AI_DOC_NAME      = "docintel-$Suffix"
$FUNC_APP_NAME    = "func-fanin-$Suffix"
$APPINSIGHTS_NAME = "appi-fanin-$Suffix"
$SWA_NAME         = "swa-fanin-$Suffix"

# 1. Create Resource Group
Write-Host "`n[1/7] Creating Resource Group: $ResourceGroup in $Location..." -ForegroundColor Green
az group create --name $ResourceGroup --location $Location -o table

# 2. Azure Storage Account (Standard LRS Hot Tier)
Write-Host "`n[2/7] Creating Azure Storage Account: $STORAGE_NAME..." -ForegroundColor Green
az storage account create `
    --name $STORAGE_NAME `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku Standard_LRS `
    --kind StorageV2 `
    --allow-blob-public-access false `
    -o table

$STORAGE_KEY = (az storage account keys list --account-name $STORAGE_NAME --resource-group $ResourceGroup --query "[0].value" -o tsv)
$STORAGE_CONN = (az storage account show-connection-string --name $STORAGE_NAME --resource-group $ResourceGroup --query "connectionString" -o tsv)

# Create Ingestion & Dossier Containers
Write-Host "  Creating Storage Containers: 'incoming-batches' & 'processed-dossiers'..." -ForegroundColor Gray
az storage container create --name "incoming-batches" --account-name $STORAGE_NAME --account-key $STORAGE_KEY -o table
az storage container create --name "processed-dossiers" --account-name $STORAGE_NAME --account-key $STORAGE_KEY -o table

# 3. Application Insights (Basic Telemetry Ingestion)
Write-Host "`n[3/7] Provisioning Application Insights: $APPINSIGHTS_NAME..." -ForegroundColor Green
az monitor app-insights component create `
    --app $APPINSIGHTS_NAME `
    --location $Location `
    --resource-group $ResourceGroup `
    --application-type web `
    -o table

$AI_CONN = (az monitor app-insights component show --app $APPINSIGHTS_NAME --resource-group $ResourceGroup --query "connectionString" -o tsv)

# 4. Azure Cosmos DB (STRICTLY Serverless Capability to eliminate $24/mo provisioned fee)
Write-Host "`n[4/7] Provisioning Azure Cosmos DB in SERVERLESS mode: $COSMOS_NAME..." -ForegroundColor Green
az cosmosdb create `
    --name $COSMOS_NAME `
    --resource-group $ResourceGroup `
    --capabilities EnableServerless `
    --default-consistency-level Session `
    --locations regionName=$Location failoverPriority=0 `
    -o table

Write-Host "  Configuring Cosmos DB SQL Database & Container '/batch_id'..." -ForegroundColor Gray
az cosmosdb sql database create `
    --account-name $COSMOS_NAME `
    --resource-group $ResourceGroup `
    --name "DocumentIntelligenceDB" `
    -o table

az cosmosdb sql container create `
    --account-name $COSMOS_NAME `
    --resource-group $ResourceGroup `
    --database-name "DocumentIntelligenceDB" `
    --name "Dossiers" `
    --partition-key-path "/batch_id" `
    -o table

$COSMOS_CONN = (az cosmosdb keys list --name $COSMOS_NAME --resource-group $ResourceGroup --type connection-strings --query "connectionStrings[0].connectionString" -o tsv)

# 5. Azure AI Document Intelligence (Free F0 SKU)
Write-Host "`n[5/7] Provisioning Azure AI Document Intelligence (Free F0 SKU): $AI_DOC_NAME..." -ForegroundColor Green
az cognitiveservices account create `
    --name $AI_DOC_NAME `
    --resource-group $ResourceGroup `
    --kind FormRecognizer `
    --sku F0 `
    --location $Location `
    --yes `
    -o table

$DOC_ENDPOINT = (az cognitiveservices account show --name $AI_DOC_NAME --resource-group $ResourceGroup --query "properties.endpoint" -o tsv)
$DOC_KEY = (az cognitiveservices account keys list --name $AI_DOC_NAME --resource-group $ResourceGroup --query "key1" -o tsv)

# 6. Azure Function App (Linux Consumption Plan, Python 3.10/3.11)
Write-Host "`n[6/7] Deploying Azure Function App (Consumption Y1): $FUNC_APP_NAME..." -ForegroundColor Green
az functionapp create `
    --name $FUNC_APP_NAME `
    --resource-group $ResourceGroup `
    --storage-account $STORAGE_NAME `
    --consumption-plan-location $Location `
    --runtime python `
    --runtime-version 3.11 `
    --functions-version 4 `
    --os-type Linux `
    --app-insights $APPINSIGHTS_NAME `
    -o table

Write-Host "  Injecting Application Environment Secrets & App Settings..." -ForegroundColor Gray
az functionapp config appsettings set `
    --name $FUNC_APP_NAME `
    --resource-group $ResourceGroup `
    --settings `
        "AzureWebJobsStorage=$STORAGE_CONN" `
        "DOCUMENT_INTELLIGENCE_ENDPOINT=$DOC_ENDPOINT" `
        "DOCUMENT_INTELLIGENCE_KEY=$DOC_KEY" `
        "COSMOS_CONNECTION_STRING=$COSMOS_CONN" `
        "STORAGE_CONNECTION_STRING=$STORAGE_CONN" `
        "RAW_CONTAINER_NAME=incoming-batches" `
        "OUTPUT_CONTAINER_NAME=processed-dossiers" `
        "ENABLE_MOCK_EXTRACTION=false" `
        "APPLICATIONINSIGHTS_CONNECTION_STRING=$AI_CONN" `
    -o table

# 7. Azure Static Web Apps (Free SKU)
Write-Host "`n[7/7] Creating Azure Static Web App: $SWA_NAME..." -ForegroundColor Green
az staticwebapp create `
    --name $SWA_NAME `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku Free `
    -o table

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "  AZURE DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Function App URL     : https://$FUNC_APP_NAME.azurewebsites.net" -ForegroundColor White
Write-Host "  Document Intelligence: $DOC_ENDPOINT" -ForegroundColor White
Write-Host "  Cosmos DB Account    : $COSMOS_NAME (Serverless)" -ForegroundColor White
Write-Host "  Storage Account      : $STORAGE_NAME" -ForegroundColor White
Write-Host "  Static Web App       : $SWA_NAME" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
