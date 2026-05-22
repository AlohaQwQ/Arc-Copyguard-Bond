from web3 import Web3

from config import settings

CHAIN_ID = 5042002

RISK_ORACLE_ADAPTER_ABI = [
    {
        "inputs": [
            {"name": "bondId", "type": "uint256"},
            {"name": "riskScoreBps", "type": "uint16"},
            {"name": "reportHash", "type": "bytes32"},
        ],
        "name": "submitRiskUpdate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


def submit_risk_update(bond_id: int, risk_score_bps: int, report_hash: str) -> str:
    if not settings.RISK_ORACLE_ADAPTER_ADDRESS or not settings.ORACLE_PRIVATE_KEY:
        raise ValueError("chain submission is not configured")
    if risk_score_bps < 0 or risk_score_bps > 10000:
        raise ValueError("invalid risk_score_bps")

    report_hash_bytes32 = _report_hash_to_bytes32(report_hash)
    web3 = Web3(Web3.HTTPProvider(settings.ARC_RPC_URL))
    if web3.eth.chain_id != CHAIN_ID:
        raise ValueError("wrong chain")

    oracle_account = web3.eth.account.from_key(settings.ORACLE_PRIVATE_KEY)
    adapter = web3.eth.contract(
        address=Web3.to_checksum_address(settings.RISK_ORACLE_ADAPTER_ADDRESS),
        abi=RISK_ORACLE_ADAPTER_ABI,
    )
    tx = adapter.functions.submitRiskUpdate(
        bond_id,
        risk_score_bps,
        report_hash_bytes32,
    ).build_transaction(
        {
            "from": oracle_account.address,
            "nonce": web3.eth.get_transaction_count(oracle_account.address),
            "gas": 300_000,
            "gasPrice": web3.eth.gas_price,
            "chainId": CHAIN_ID,
        }
    )

    signed = oracle_account.sign_transaction(tx)
    tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
    if receipt["status"] != 1:
        raise RuntimeError(f"Transaction reverted: {receipt['transactionHash'].hex()}")

    return receipt["transactionHash"].hex()


def _report_hash_to_bytes32(report_hash: str) -> bytes:
    if not isinstance(report_hash, str) or not report_hash.startswith("0x") or len(report_hash) != 66:
        raise ValueError("invalid report_hash")

    try:
        report_hash_bytes32 = bytes.fromhex(report_hash[2:])
    except ValueError as exc:
        raise ValueError("invalid report_hash") from exc

    if len(report_hash_bytes32) != 32:
        raise ValueError("invalid report_hash bytes32 length")
    return report_hash_bytes32
