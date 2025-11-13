#!/bin/bash

# Скрипт для сборки release версии Android приложения
# Использование: ./build-release.sh [apk|aab|both]

BUILD_TYPE=${1:-aab}  # По умолчанию собираем AAB (рекомендуется для Google Play)

echo "🔨 Сборка release версии Android приложения"
echo ""

# Проверяем наличие keystore.properties
if [ ! -f "keystore.properties" ]; then
    echo "❌ Файл keystore.properties не найден!"
    echo ""
    echo "Для сборки release версии необходимо:"
    echo "1. Запустить ./generate-keystore.sh для создания keystore"
    echo "2. Создать файл keystore.properties с паролями"
    echo ""
    exit 1
fi

# Переходим в корень проекта
cd "$(dirname "$0")/.." || exit 1

echo "📦 Сборка веб-версии..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при сборке веб-версии"
    exit 1
fi

echo ""
echo "🔄 Синхронизация с Capacitor..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при синхронизации"
    exit 1
fi

echo ""
cd android || exit 1

if [ "$BUILD_TYPE" = "both" ]; then
    # Собираем оба формата
    echo "📱 Сборка Android App Bundle (AAB)..."
    ./gradlew bundleRelease

    if [ $? -ne 0 ]; then
        echo "❌ Ошибка при сборке AAB"
        exit 1
    fi

    echo ""
    echo "📱 Сборка APK..."
    ./gradlew assembleRelease

    if [ $? -ne 0 ]; then
        echo "❌ Ошибка при сборке APK"
        exit 1
    fi

    AAB_FILE="app/build/outputs/bundle/release/app-release.aab"
    APK_FILE="app/build/outputs/apk/release/app-release.apk"

    if [ -f "$AAB_FILE" ] && [ -f "$APK_FILE" ]; then
        echo ""
        echo "✅ Оба файла успешно собраны:"
        echo "   AAB: $AAB_FILE (для Google Play)"
        echo "   APK: $APK_FILE (для прямой установки)"
    fi

elif [ "$BUILD_TYPE" = "aab" ]; then
    echo "📱 Сборка Android App Bundle (AAB)..."
    echo "   (Рекомендуется для Google Play Store)"
    ./gradlew bundleRelease

    if [ $? -eq 0 ]; then
        AAB_FILE="app/build/outputs/bundle/release/app-release.aab"
        if [ -f "$AAB_FILE" ]; then
            echo ""
            echo "✅ AAB успешно собран:"
            echo "   $AAB_FILE"
            echo ""
            echo "📤 Этот файл можно загрузить в Google Play Console"
            echo "   (Google Play требует AAB для новых приложений)"
        fi
    else
        echo "❌ Ошибка при сборке AAB"
        exit 1
    fi

else
    echo "📱 Сборка APK..."
    echo "   (Для прямой установки или альтернативных магазинов)"
    ./gradlew assembleRelease

    if [ $? -eq 0 ]; then
        APK_FILE="app/build/outputs/apk/release/app-release.apk"
        if [ -f "$APK_FILE" ]; then
            echo ""
            echo "✅ APK успешно собран:"
            echo "   $APK_FILE"
            echo ""
            echo "📤 Этот файл можно:"
            echo "   - Установить напрямую на устройство"
            echo "   - Использовать для тестирования"
            echo "   - Загрузить в альтернативные магазины"
            echo ""
            echo "⚠️  Для Google Play Store рекомендуется использовать AAB"
        fi
    else
        echo "❌ Ошибка при сборке APK"
        exit 1
    fi
fi

