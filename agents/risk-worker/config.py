from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    LLM_PROVIDER: str | None = None
    LLM_API_KEY: str | None = None
    ARC_RPC_URL: str = "https://rpc.testnet.arc.network"
    ORACLE_PRIVATE_KEY: str | None = None
    BOND_VAULT_ADDRESS: str | None = None
    RISK_ORACLE_ADAPTER_ADDRESS: str | None = None
    REPORT_PAYMENT_ADDRESS: str | None = None
    LEADER_REGISTRY_ADDRESS: str | None = None


settings = Settings()
