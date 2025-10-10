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
