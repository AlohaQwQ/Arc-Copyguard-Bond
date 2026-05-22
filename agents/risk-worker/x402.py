from web3 import Web3

from config import settings

CHAIN_ID = 5042002
REPORT_FEE = 1_000_000_000_000_000_000

REPORT_PAYMENT_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "user", "type": "address"},
            {"indexed": True, "name": "leaderId", "type": "bytes32"},
            {"indexed": False, "name": "amount", "type": "uint256"},
            {"indexed": False, "name": "timestamp", "type": "uint256"},
        ],
        "name": "ReportPurchased",
        "type": "event",
    }
]


def build_402_response(leader_id: str) -> dict:
    report_payment_address = settings.REPORT_PAYMENT_ADDRESS or ""
    return {
        "status": 402,
        "message": "Payment required to unlock full risk report",
        "price": str(REPORT_FEE),
        "priceHuman": "1 USDC",
        "recipient": report_payment_address,
        "resource": f"report:{leader_id}",
        "chainId": CHAIN_ID,
        "contractAddress": report_payment_address,
        "instructions": (
            "Call purchaseReport(leaderId) with msg.value = 1 USDC on Arc Testnet, "
            "then retry with X-Payment-Tx-Hash and X-Wallet-Address headers"
        ),
    }


def verify_payment(tx_hash: str, wallet_address: str, leader_id: str) -> tuple[bool, str]:
    try:
        if not settings.REPORT_PAYMENT_ADDRESS:
            return False, "report payment contract is not configured"
        if not _is_hex_string(tx_hash, 66):
            return False, "invalid tx hash"

        web3 = Web3(Web3.HTTPProvider(settings.ARC_RPC_URL))
        if web3.eth.chain_id != CHAIN_ID:
            return False, "wrong chain"

        expected_contract = Web3.to_checksum_address(settings.REPORT_PAYMENT_ADDRESS)
        expected_wallet = Web3.to_checksum_address(wallet_address)
        receipt = web3.eth.get_transaction_receipt(tx_hash)
        if receipt is None:
            return False, "transaction receipt not found"
        if receipt.get("status") != 1:
            return False, "transaction failed"

        receipt_to = receipt.get("to")
        if not receipt_to or Web3.to_checksum_address(receipt_to) != expected_contract:
            return False, "transaction target mismatch"

        event_signature = Web3.keccak(text="ReportPurchased(address,bytes32,uint256,uint256)")
        expected_leader_id = _leader_id_to_bytes32(leader_id)

        for log in receipt.get("logs", []):
            if Web3.to_checksum_address(log.get("address")) != expected_contract:
                continue

            topics = log.get("topics", [])
            if len(topics) < 3 or bytes(topics[0]) != event_signature:
                continue

            event_user = Web3.to_checksum_address("0x" + bytes(topics[1])[-20:].hex())
            event_leader_id = bytes(topics[2])
            amount = _decode_amount(log.get("data"))

            if event_user != expected_wallet:
                continue
            if event_leader_id != expected_leader_id:
                continue
            if amount != REPORT_FEE:
                return False, "payment amount mismatch"
            return True, "verified"

        return False, "matching ReportPurchased event not found"
    except Exception as exc:
        return False, f"payment verification failed: {type(exc).__name__}"


def _is_hex_string(value: str, length: int) -> bool:
    if not isinstance(value, str) or len(value) != length or not value.startswith("0x"):
        return False
    try:
        bytes.fromhex(value[2:])
    except ValueError:
        return False
    return True


def _leader_id_to_bytes32(leader_id: str) -> bytes:
    encoded = leader_id.encode("utf-8")
    if len(encoded) > 32:
        raise ValueError("leader_id too long")
    return encoded.ljust(32, b"\x00")


def _decode_amount(data) -> int:
    data_bytes = bytes(data)
    if len(data_bytes) < 64:
        raise ValueError("invalid event data")
    return int.from_bytes(data_bytes[:32], byteorder="big")
