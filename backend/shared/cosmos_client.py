import json
import os
from pathlib import Path
from typing import Optional
from azure.cosmos import CosmosClient, PartitionKey
try:
    from shared.models import ConsolidatedDossier
except ImportError:
    from backend.shared.models import ConsolidatedDossier


DATABASE_NAME = "DocumentIntelligenceDB"
CONTAINER_NAME = "Dossiers"


def get_cosmos_container():
    conn_str = os.environ.get("COSMOS_CONNECTION_STRING")
    if not conn_str or "AccountEndpoint=" not in conn_str:
        return None
    try:
        client = CosmosClient.from_connection_string(conn_str)
        database = client.create_database_if_not_exists(id=DATABASE_NAME)
        container = database.create_container_if_not_exists(
            id=CONTAINER_NAME,
            partition_key=PartitionKey(path="/batch_id")
        )
        return container
    except Exception as e:
        print(f"[Cosmos DB] Connection failed, falling back to local storage: {e}")
        return None


def persist_dossier(dossier: ConsolidatedDossier) -> str:
    """
    Saves the consolidated dossier into Cosmos DB Serverless.
    If running locally without cloud credentials, saves as an offline JSON artifact.
    """
    container = get_cosmos_container()
    dossier_dict = dossier.model_dump()

    if container:
        try:
            container.upsert_item(dossier_dict)
            return f"Cosmos DB: Upserted to {DATABASE_NAME}/{CONTAINER_NAME}"
        except Exception as e:
            print(f"[Cosmos DB] Upsert error: {e}")

    # Offline local storage fallback
    try:
        local_dir = Path("local_dossiers")
        local_dir.mkdir(exist_ok=True)
        out_file = local_dir / f"{dossier.batch_id}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(dossier_dict, f, indent=2)
        return f"Local Dossier Cache: Saved to {out_file}"
    except Exception as e:
        print(f"[Storage Fallback] Warning: Could not write local cache file: {e}")
        return "In-Memory Only: Dossier ready in response payload."
