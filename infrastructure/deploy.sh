#!/usr/bin/env bash
# ==============================================================================
# Azure Resource Automated Deployment Script (Bash)
# Project: Serverless Fan-Out/Fan-In Parallel Document Extraction Engine
# Region: eastasia
# ==============================================================================
set -euo pipefail

RG="${1:-rg-fanin-fanout-prod}"
LOCATION="${2:-eastasia}"
SUFFIX="${3:-$((1000 + RANDOM % 9000))}"

echo "Deploying Antigravity Fan-Out Engine to $LOCATION in resource group $RG (suffix: $SUFFIX)..."

STORAGE_NAME="stfanin$SUFFIX"
COSMOS_NAME="cosmos-fanin-$SUFFIX"
AI_DOC_NAME="docintel-$SUFFIX"
FUNC_APP_NAME="func-fanin-$SUFFIX"
APPINSIGHTS_NAME="appi-fanin-$SUFFIX"
SWA_NAME="swa-fanin-$SUFFIX"

# Register core Azure resource providers
echo "Ensuring required Azure Resource Providers are registered..."
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.Insights
az provider register --namespace Microsoft.CognitiveServices
az provider register --namespace Microsoft.DocumentDB
az provider register --namespace Microsoft.Web

# 1. Resource Group
az group create --name "$RG" --location "$LOCATION" -o table

# 2. Storage
az storage account create \
  --name "$STORAGE_NAME" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access false -o table

STORAGE_KEY=$(az storage account keys list --account-name "$STORAGE_NAME" --resource-group "$RG" --query "[0].value" -o tsv)
STORAGE_CONN=$(az storage account show-connection-string --name "$STORAGE_NAME" --resource-group "$RG" --query "connectionString" -o tsv)

az storage container create --name "incoming-batches" --account-name "$STORAGE_NAME" --account-key "$STORAGE_KEY" -o table
az storage container create --name "processed-dossiers" --account-name "$STORAGE_NAME" --account-key "$STORAGE_KEY" -o table

# 3. Log Analytics Workspace & Application Insights (Modern Workspace Mode)
LAW_NAME="law-$SUFFIX"
az monitor log-analytics workspace create \
  --resource-group "$RG" \
  --workspace-name "$LAW_NAME" \
  --location "$LOCATION" -o table || true

az monitor app-insights component create \
  --app "$APPINSIGHTS_NAME" \
  --location "$LOCATION" \
  --resource-group "$RG" \
  --workspace "$LAW_NAME" \
  --application-type web -o table || az monitor app-insights component create \
  --app "$APPINSIGHTS_NAME" \
  --location "$LOCATION" \
  --resource-group "$RG" \
  --application-type web -o table

AI_CONN=$(az monitor app-insights component show --app "$APPINSIGHTS_NAME" --resource-group "$RG" --query "connectionString" -o tsv || echo "")

# 4. Cosmos DB (Serverless) - with automatic fallback if region capacity is full
echo "Creating Azure Cosmos DB in Serverless mode..."
COSMOS_LOC="$LOCATION"
if ! az cosmosdb create \
  --name "$COSMOS_NAME" \
  --resource-group "$RG" \
  --capabilities EnableServerless \
  --default-consistency-level Session \
  --locations regionName="$COSMOS_LOC" failoverPriority=0 -o table; then
    echo "Notice: High demand in $LOCATION for Cosmos DB. Automatically falling back to backup region: koreacentral..."
    COSMOS_LOC="koreacentral"
    az cosmosdb create \
      --name "$COSMOS_NAME" \
      --resource-group "$RG" \
      --capabilities EnableServerless \
      --default-consistency-level Session \
      --locations regionName="$COSMOS_LOC" failoverPriority=0 -o table
fi

az cosmosdb sql database create --account-name "$COSMOS_NAME" --resource-group "$RG" --name "DocumentIntelligenceDB" -o table
az cosmosdb sql container create --account-name "$COSMOS_NAME" --resource-group "$RG" --database-name "DocumentIntelligenceDB" --name "Dossiers" --partition-key-path "/batch_id" -o table

COSMOS_CONN=$(az cosmosdb keys list --name "$COSMOS_NAME" --resource-group "$RG" --type connection-strings --query "connectionStrings[0].connectionString" -o tsv)

# 5. AI Document Intelligence F0
DOC_LOC="$LOCATION"
if ! az cognitiveservices account create \
  --name "$AI_DOC_NAME" \
  --resource-group "$RG" \
  --kind FormRecognizer \
  --sku F0 \
  --location "$DOC_LOC" \
  --yes -o table; then
    echo "Notice: High demand in $LOCATION for AI Document Intelligence. Falling back to koreacentral..."
    DOC_LOC="koreacentral"
    az cognitiveservices account create \
      --name "$AI_DOC_NAME" \
      --resource-group "$RG" \
      --kind FormRecognizer \
      --sku F0 \
      --location "$DOC_LOC" \
      --yes -o table
fi

DOC_ENDPOINT=$(az cognitiveservices account show --name "$AI_DOC_NAME" --resource-group "$RG" --query "properties.endpoint" -o tsv)
DOC_KEY=$(az cognitiveservices account keys list --name "$AI_DOC_NAME" --resource-group "$RG" --query "key1" -o tsv)

# 6. Function App (Consumption Y1)
az functionapp create \
  --name "$FUNC_APP_NAME" \
  --resource-group "$RG" \
  --storage-account "$STORAGE_NAME" \
  --consumption-plan-location "$LOCATION" \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --os-type Linux \
  --app-insights "$APPINSIGHTS_NAME" -o table

az functionapp config appsettings set \
  --name "$FUNC_APP_NAME" \
  --resource-group "$RG" \
  --settings \
    "AzureWebJobsStorage=$STORAGE_CONN" \
    "DOCUMENT_INTELLIGENCE_ENDPOINT=$DOC_ENDPOINT" \
    "DOCUMENT_INTELLIGENCE_KEY=$DOC_KEY" \
    "COSMOS_CONNECTION_STRING=$COSMOS_CONN" \
    "STORAGE_CONNECTION_STRING=$STORAGE_CONN" \
    "RAW_CONTAINER_NAME=incoming-batches" \
    "OUTPUT_CONTAINER_NAME=processed-dossiers" \
    "ENABLE_MOCK_EXTRACTION=false" \
    "APPLICATIONINSIGHTS_CONNECTION_STRING=$AI_CONN" -o table

# 7. Static Web App (Free - always in eastasia as SWA is edge-hosted)
az staticwebapp create \
  --name "$SWA_NAME" \
  --resource-group "$RG" \
  --location "eastasia" \
  --sku Free -o table

echo "=================================================================="
echo "  AZURE DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=================================================================="
echo "  Function App URL     : https://${FUNC_APP_NAME}.azurewebsites.net"
echo "  Document Intelligence: ${DOC_ENDPOINT}"
echo "  Cosmos DB Account    : ${COSMOS_NAME} (Serverless in ${COSMOS_LOC})"
echo "  Storage Account      : ${STORAGE_NAME}"
echo "  Static Web App       : https://${SWA_NAME}.azurestaticapps.net"
echo "=================================================================="
