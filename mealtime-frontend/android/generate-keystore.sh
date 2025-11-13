#!/bin/bash

# Скрипт для генерации keystore для подписи Android приложения
# Использование: ./generate-keystore.sh

KEYSTORE_FILE="app/mealtime-release-key.jks"
KEY_ALIAS="mealtime-key"
VALIDITY_YEARS=25

echo "🔐 Генерация keystore для подписи Android приложения"
echo ""

# Проверяем, существует ли уже keystore
if [ -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  Keystore уже существует: $KEYSTORE_FILE"
    read -p "Перезаписать? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Отменено."
        exit 1
    fi
    rm "$KEYSTORE_FILE"
fi

# Запрашиваем пароли
echo "Введите пароль для keystore (минимум 6 символов):"
read -s STORE_PASSWORD
echo ""

if [ ${#STORE_PASSWORD} -lt 6 ]; then
    echo "❌ Пароль должен быть минимум 6 символов"
    exit 1
fi

echo "Введите пароль для ключа (можно использовать тот же):"
read -s KEY_PASSWORD
echo ""

if [ ${#KEY_PASSWORD} -lt 6 ]; then
    echo "❌ Пароль должен быть минимум 6 символов"
    exit 1
fi

# Генерируем keystore
echo "📦 Генерация keystore..."
keytool -genkeypair \
    -v \
    -storetype PKCS12 \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity $((VALIDITY_YEARS * 365)) \
    -storepass "$STORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=Mealtime Planner, OU=Development, O=Mealtime, L=City, ST=State, C=RU"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Keystore успешно создан: $KEYSTORE_FILE"
    echo ""
    echo "📝 Теперь создайте файл keystore.properties со следующим содержимым:"
    echo ""
    echo "storeFile=$KEYSTORE_FILE"
    echo "storePassword=$STORE_PASSWORD"
    echo "keyAlias=$KEY_ALIAS"
    echo "keyPassword=$KEY_PASSWORD"
    echo ""
    echo "⚠️  ВАЖНО: Сохраните пароли в безопасном месте! Без них вы не сможете обновлять приложение в Google Play!"
else
    echo "❌ Ошибка при создании keystore"
    exit 1
fi

