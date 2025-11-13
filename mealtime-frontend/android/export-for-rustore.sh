#!/bin/bash

# Скрипт для экспорта ключа для Rustore
# Использование: ./export-for-rustore.sh

echo "🔐 Экспорт ключа для Rustore"
echo ""

PEPK_JAR="$HOME/Downloads/pepk.jar"
KEYSTORE="app/mealtime-release-key.jks"
ALIAS="mealtime-key"
OUTPUT_DIR="rustore_export"
OUTPUT_FILE="$OUTPUT_DIR/pepk_out.zip"
ENCRYPTION_KEY="00006d6919eaac5a69c95414d628a1026d016c871bb718b8f3cc2e887624f07f69c2687cbf0f003977a7fb2b66d206075fb87ba83d2d33f77bb2e91b6bca471023ddd752"

# Проверяем наличие pepk.jar
if [ ! -f "$PEPK_JAR" ]; then
    echo "❌ Файл pepk.jar не найден в ~/Downloads/"
    echo "   Скачайте его из инструкции Rustore"
    exit 1
fi

# Проверяем наличие keystore
if [ ! -f "$KEYSTORE" ]; then
    echo "❌ Keystore не найден: $KEYSTORE"
    exit 1
fi

# Создаем папку для экспорта
mkdir -p "$OUTPUT_DIR"

echo "📦 Параметры экспорта:"
echo "   Keystore: $KEYSTORE"
echo "   Alias: $ALIAS"
echo "   Output: $OUTPUT_FILE"
echo ""
# Пароль из keystore.properties
KEYSTORE_PASSWORD="Mealtime2024!"
KEY_PASSWORD="Mealtime2024!"

echo "🔑 Используется пароль из keystore.properties"
echo ""

# Запускаем экспорт с паролями в командной строке
java -jar "$PEPK_JAR" \
    --keystore "$KEYSTORE" \
    --alias "$ALIAS" \
    --output "$OUTPUT_FILE" \
    --encryptionkey="$ENCRYPTION_KEY" \
    --keystore-pass "$KEYSTORE_PASSWORD" \
    --key-pass "$KEY_PASSWORD" \
    --include-cert

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Ключ успешно экспортирован!"
    echo "   Файл: $OUTPUT_FILE"
    echo ""
    echo "📤 Этот файл можно загрузить в Rustore"
else
    echo ""
    echo "❌ Ошибка при экспорте ключа"
    exit 1
fi

