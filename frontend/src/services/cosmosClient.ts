import { ConsolidatedDossier } from './azureApi';

const ENDPOINT = import.meta.env.VITE_COSMOS_ENDPOINT || 'https://cosmos-fanin-3718.documents.azure.com:443/';
const KEY = import.meta.env.VITE_COSMOS_KEY || '';
const DATABASE_ID = 'DocumentIntelligenceDB';
const CONTAINER_ID = 'Dossiers';

/**
 * Generates an RFC-compliant Cosmos DB Master Key HMAC-SHA256 signature
 * using the browser's native Web Crypto API (supported in all modern browsers).
 */
async function generateCosmosAuthToken(
  verb: string,
  resourceType: string,
  resourceId: string,
  date: string,
  masterKey: string
): Promise<string> {
  const payload = `${verb.toLowerCase()}\n${resourceType.toLowerCase()}\n${resourceId}\n${date.toLowerCase()}\n\n`;
  const keyBytes = Uint8Array.from(atob(masterKey), c => c.charCodeAt(0));

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  const sigBuffer = await window.crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(payload)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
  return encodeURIComponent(`type=master&ver=1.0&sig=${sig}`);
}

/**
 * Saves a consolidated batch dossier directly to Azure Cosmos DB Serverless
 * via the native Cosmos DB REST API with zero Node polyfill requirements.
 */
export async function saveDossierToCosmos(dossier: ConsolidatedDossier): Promise<boolean> {
  if (!KEY) {
    console.warn('[Cosmos DB] Key is not configured.');
    return false;
  }
  try {
    const resourceType = 'docs';
    const resourceId = `dbs/${DATABASE_ID}/colls/${CONTAINER_ID}`;
    const date = new Date().toUTCString();
    const authToken = await generateCosmosAuthToken('post', resourceType, resourceId, date.toLowerCase(), KEY);
    const targetUrl = `${ENDPOINT}dbs/${DATABASE_ID}/colls/${CONTAINER_ID}/docs`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'x-ms-date': date,
        'x-ms-version': '2018-12-31',
        'authorization': authToken,
        'content-type': 'application/json',
        'x-ms-documentdb-partitionkey': JSON.stringify([dossier.batch_id]),
        'x-ms-documentdb-is-upsert': 'true'
      },
      body: JSON.stringify(dossier)
    });

    if (response.ok || response.status === 200 || response.status === 201) {
      console.log(`[Cosmos DB] Real-time persistence complete for batch '${dossier.batch_id}'! (Status: ${response.status})`);
      return true;
    } else {
      const errText = await response.text();
      console.error(`[Cosmos DB] HTTP ${response.status} persistence failure:`, errText);
      return false;
    }
  } catch (err) {
    console.error('[Cosmos DB] Client persistence error:', err);
    return false;
  }
}

