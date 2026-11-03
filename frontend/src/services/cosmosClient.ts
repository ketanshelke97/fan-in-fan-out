import { CosmosClient } from '@azure/cosmos';
import { ConsolidatedDossier } from './azureApi';

const ENDPOINT = import.meta.env.VITE_COSMOS_ENDPOINT || 'https://cosmos-fanin-3718.documents.azure.com:443/';
const KEY = import.meta.env.VITE_COSMOS_KEY || '';
const DATABASE_ID = 'DocumentIntelligenceDB';
const CONTAINER_ID = 'Dossiers';

let cosmosClientInstance: CosmosClient | null = null;

function getClient(): CosmosClient | null {
  if (!cosmosClientInstance && KEY) {
    try {
      cosmosClientInstance = new CosmosClient({ endpoint: ENDPOINT, key: KEY });
    } catch (e) {
      console.warn('[Cosmos DB] Initialization note:', e);
    }
  }
  return cosmosClientInstance;
}

export async function saveDossierToCosmos(dossier: ConsolidatedDossier): Promise<boolean> {
  try {
    const client = getClient();
    if (!client) {
      console.warn('[Cosmos DB] Client not configured.');
      return false;
    }
    const database = client.database(DATABASE_ID);
    const container = database.container(CONTAINER_ID);

    await container.items.upsert(dossier);
    console.log(`[Cosmos DB] Real-time persistence complete for batch '${dossier.batch_id}'!`);
    return true;
  } catch (err) {
    console.warn('[Cosmos DB] Client persistence note:', err);
    return false;
  }
}
