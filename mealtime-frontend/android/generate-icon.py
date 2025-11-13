#!/usr/bin/env python3
"""
Скрипт для генерации иконок приложения из исходной картинки
Масштабирует исходную иконку до нужных размеров и создает круглые версии
"""

from PIL import Image, ImageDraw
import os
import sys

# Размеры для разных плотностей
SIZES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
}

def create_round_icon(img, size):
    """Создает круглую версию иконки"""
    # Создаем маску для круга
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([0, 0, size-1, size-1], fill=255)

    # Применяем маску
    output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    output.paste(img, (0, 0))
    output.putalpha(mask)

    return output

def resize_icon(source_img, size, high_quality=True):
    """Масштабирует иконку до нужного размера с высоким качеством"""
    if high_quality:
        # Используем LANCZOS для лучшего качества при уменьшении
        return source_img.resize((size, size), Image.Resampling.LANCZOS)
    else:
        return source_img.resize((size, size), Image.Resampling.NEAREST)

def main():
    """Генерирует все необходимые иконки из исходного файла"""
    import sys

    base_dir = os.path.dirname(os.path.abspath(__file__))
    res_dir = os.path.join(base_dir, 'app', 'src', 'main', 'res')

    # Проверяем, передан ли путь к файлу как аргумент
    source_path = None
    if len(sys.argv) > 1:
        custom_path = sys.argv[1]
        if os.path.exists(custom_path):
            source_path = os.path.abspath(custom_path)
            print(f"📁 Используется указанный файл: {source_path}")
        else:
            print(f"❌ Указанный файл не найден: {custom_path}")
            sys.exit(1)

    # Ищем исходную иконку
    if not source_path:
        source_icon_paths = [
            os.path.join(base_dir, 'icon.png'),
            os.path.join(base_dir, 'icon.jpg'),
            os.path.join(base_dir, 'app-icon.png'),
            os.path.join(base_dir, 'app-icon.jpg'),
            os.path.join(base_dir, 'ic_launcher_source.png'),
            os.path.join(base_dir, 'ic_launcher_source.jpg'),
        ]

        # Отладочный вывод: показываем, где ищем
        print(f"🔍 Ищем иконку в папке: {base_dir}")
        print("")

        for path in source_icon_paths:
            print(f"   Проверяем: {os.path.basename(path)}... ", end="")
            if os.path.exists(path):
                print("✅ Найдено!")
                source_path = path
                break
            else:
                print("❌")

        print("")

    if not source_path:
        print("❌ Исходная иконка не найдена!")
        print("")
        print(f"📁 Скрипт ищет файлы в папке: {base_dir}")
        print("")
        print("Поместите исходную иконку в эту папку с одним из имен:")
        print("  - icon.png")
        print("  - icon.jpg")
        print("  - app-icon.png")
        print("  - app-icon.jpg")
        print("  - ic_launcher_source.png")
        print("  - ic_launcher_source.jpg")
        print("")
        print("Рекомендуемый размер исходной иконки: 1024x1024px")
        print("")
        print("💡 Проверьте:")
        print(f"   1. Файл находится в папке: {base_dir}")
        print("   2. Имя файла точно совпадает (с учетом регистра)")
        print("   3. У вас есть права на чтение файла")
        print("")
        print("💡 Или укажите путь к файлу вручную:")
        print("   python3 generate-icon.py /путь/к/вашей/иконке.png")
        sys.exit(1)

    print(f"🎨 Генерация иконок из: {source_path}")

    try:
        source_icon = Image.open(source_path)
        # Конвертируем в RGBA если нужно
        if source_icon.mode != 'RGBA':
            source_icon = source_icon.convert('RGBA')
    except Exception as e:
        print(f"❌ Ошибка при открытии исходной иконки: {e}")
        sys.exit(1)

    # Проверяем размер исходной иконки
    if source_icon.size[0] != source_icon.size[1]:
        print("⚠️  Предупреждение: Исходная иконка не квадратная!")
        print(f"   Размер: {source_icon.size}")
        print("   Рекомендуется использовать квадратную иконку (например, 1024x1024px)")

    print("")

    # Создаем иконки для каждой плотности
    for density, size in SIZES.items():
        mipmap_dir = os.path.join(res_dir, f'mipmap-{density}')
        os.makedirs(mipmap_dir, exist_ok=True)

        # Масштабируем исходную иконку
        resized_icon = resize_icon(source_icon, size, high_quality=True)

        # Обычная иконка (квадратная)
        icon_path = os.path.join(mipmap_dir, 'ic_launcher.png')
        resized_icon.save(icon_path, 'PNG', optimize=True)
        print(f"✅ Создана иконка: {icon_path} ({size}x{size})")

        # Круглая иконка
        round_icon = create_round_icon(resized_icon, size)
        icon_round_path = os.path.join(mipmap_dir, 'ic_launcher_round.png')
        round_icon.save(icon_round_path, 'PNG', optimize=True)
        print(f"✅ Создана круглая иконка: {icon_round_path} ({size}x{size})")

        # Foreground иконка (для adaptive icons) - используем ту же иконку
        foreground_path = os.path.join(mipmap_dir, 'ic_launcher_foreground.png')
        resized_icon.save(foreground_path, 'PNG', optimize=True)
        print(f"✅ Создана foreground иконка: {foreground_path} ({size}x{size})")

    print("\n✅ Все иконки успешно созданы!")
    print(f"\n📝 Исходная иконка: {source_path}")
    print("   Иконки сохранены в папки mipmap-*")

if __name__ == '__main__':
    try:
        main()
    except ImportError:
        print("❌ Ошибка: Не установлена библиотека Pillow")
        print("   Установите: pip install Pillow")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

