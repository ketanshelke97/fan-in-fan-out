@description('Primary deployment location for all resources (selected from allowed student regions)')
param location string = 'eastasia'

@description('Unique naming suffix for globally unique Azure resources')
param suffix string = substring(uniqueString(resourceGroup().id), 0, 5)

var storageAccountName = 'stfanin${suffix}'
var cosmosAccountName = 'cosmos-fanin-${suffix}'
var docIntelAccountName = 'docintel-${suffix}'
var appInsightsName = 'appi-fanin-${suffix}'
var hostingPlanName = 'plan-fanin-${suffix}'
var functionAppName = 'func-fanin-${suffix}'
var staticWebAppName = 'swa-fanin-${suffix}'

// 1. Storage Account (Standard LRS Hot Tier)
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource rawContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'incoming-batches'
}

resource outputContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'processed-dossiers'
}

// 2. Azure Cosmos DB (Strictly Serverless Capability to eliminate $24/mo cost)
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: 'DocumentIntelligenceDB'
  properties: {
    resource: {
      id: 'DocumentIntelligenceDB'
    }
  }
}

resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDatabase
  name: 'Dossiers'
  properties: {
    resource: {
      id: 'Dossiers'
      partitionKey: {
        paths: [
          '/batch_id'
        ]
        kind: 'Hash'
      }
    }
  }
}

// 3. Azure AI Document Intelligence (Free F0 SKU)
resource docIntelAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: docIntelAccountName
  location: location
  kind: 'FormRecognizer'
  sku: {
    name: 'F0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}

// 4. Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 30
  }
}

// 5. Consumption Hosting Plan (Y1 Dynamic Linux)
resource hostingPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: hostingPlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true
  }
}

// 6. Azure Function App (Python 3.11 Consumption)
resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: hostingPlan.id
    reserved: true
    siteConfig: {
      linuxFxVersion: 'Python|3.11'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'python'
        }
        {
          name: 'DOCUMENT_INTELLIGENCE_ENDPOINT'
          value: docIntelAccount.properties.endpoint
        }
        {
          name: 'DOCUMENT_INTELLIGENCE_KEY'
          value: docIntelAccount.listKeys().key1
        }
        {
          name: 'COSMOS_CONNECTION_STRING'
          value: cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
        }
        {
          name: 'STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'RAW_CONTAINER_NAME'
          value: 'incoming-batches'
        }
        {
          name: 'OUTPUT_CONTAINER_NAME'
          value: 'processed-dossiers'
        }
        {
          name: 'ENABLE_MOCK_EXTRACTION'
          value: 'false'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
      ]
    }
  }
}

// 7. Static Web App (Free SKU)
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output docIntelEndpoint string = docIntelAccount.properties.endpoint
output cosmosAccountName string = cosmosAccount.name
output storageAccountName string = storageAccount.name
