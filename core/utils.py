# core/utils.py
UNIT_DISPLAY_MAP = {
    "g": "Граммы",
    "kg": "Килограммы",
    "ml": "Миллилитры",
    "l": "Литры",
    "pcs": "Штуки",
    "tsp": "Чайные ложки",
    "tbsp": "Столовые ложки",
    "pinch": "Щепотка",
    "to_taste": "По вкусу",
}


def get_unit_display(unit_code):
    return UNIT_DISPLAY_MAP.get(unit_code, unit_code)

from django.conf import settings
import hashlib

def get_robokassa_config():
    """
    Возвращает конфигурацию Robokassa в зависимости от режима
    """
    is_test = settings.ROBOKASSA_TEST_MODE

    if is_test:
        password1 = settings.ROBOKASSA_TEST_PASSWORD1
        password2 = settings.ROBOKASSA_TEST_PASSWORD2
        mode_description = "TEST"
    else:
        password1 = settings.ROBOKASSA_PASSWORD1
        password2 = settings.ROBOKASSA_PASSWORD2
        mode_description = "PRODUCTION"

    return {
        'merchant_login': settings.ROBOKASSA_MERCHANT_LOGIN,
        'password1': password1,
        'password2': password2,
        'is_test': is_test,
        'mode_description': mode_description,
        'currency': settings.ROBOKASSA_CURRENCY
    }

def format_amount(amount, is_test=None):
    """
    Форматирует сумму для Robokassa
    В тестовом режиме - целые числа, в боевом - 6 знаков после точки
    """
    if is_test is None:
        is_test = settings.ROBOKASSA_TEST_MODE

    if is_test:
        return str(amount)
    else:
        try:
            return f"{float(amount):.6f}"
        except ValueError:
            return str(amount)

def calculate_signature(params, password, encoding='utf-8'):
    """
    Рассчитывает подпись для Robokassa
    """
    signature_base = ":".join(str(params[key]) for key in sorted(params.keys()))
    signature_base += f":{password}"
    return hashlib.md5(signature_base.encode(encoding)).hexdigest().lower()