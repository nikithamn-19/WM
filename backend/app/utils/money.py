from decimal import Decimal, ROUND_HALF_UP

def format_money_to_string(val) -> str:
    """Format decimal/float to exact string money with 2 decimal places (e.g., '15.00')"""
    if val is None:
        return "0.00"
    d = Decimal(str(val))
    return str(d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
