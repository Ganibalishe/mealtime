import hashlib
import uuid
import json
import time
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import UserPurchase, PremiumMealPlan
import logging

logger = logging.getLogger(__name__)


def get_robokassa_passwords():
    """
    Возвращает пароли для Robokassa в зависимости от режима (тест/прод)
    """
    if settings.ROBOKASSA_TEST_MODE:
        logger.info("Using TEST passwords for Robokassa")
        return settings.ROBOKASSA_TEST_PASSWORD1, settings.ROBOKASSA_TEST_PASSWORD2
    else:
        logger.info("Using PRODUCTION passwords for Robokassa")
        return settings.ROBOKASSA_PASSWORD1, settings.ROBOKASSA_PASSWORD2


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def payment_result(request):
    """
    Обработка уведомления от Robokassa (ResultURL)
    """
    log_lines = []

    def add_log(message):
        log_lines.append(message)
        logger.info(message)
        print(f"ROBOKASSA_DEBUG: {message}")

    try:
        add_log("=== НАЧАЛО ОБРАБОТКИ PAYMENT_RESULT ===")
        add_log("✅ Эндпоинт доступен без авторизации")

        # Логируем ВСЕ входящие данные (БЕЗ request.body - он вызывает ошибку)
        add_log(f"Метод запроса: {request.method}")
        add_log(f"Content-Type: {request.content_type}")
        add_log(f"Все заголовки: {dict(request.headers)}")
        add_log(f"Все POST параметры: {dict(request.POST)}")
        add_log(f"Все GET параметры: {dict(request.GET)}")
        # УБИРАЕМ СТРОКУ: add_log(f"Тело запроса (raw): {request.body}") - она вызывает ошибку

        # Проверяем, есть ли вообще данные
        if not request.POST:
            add_log("❌ ОШИБКА: Нет POST данных в запросе!")
            return HttpResponse('ERROR: No POST data', status=400)

        # Получаем параметры
        out_sum = request.POST.get('OutSum') or request.POST.get('out_summ', '').strip()
        inv_id = request.POST.get('InvId') or request.POST.get('inv_id', '').strip()
        signature_value = request.POST.get('SignatureValue') or request.POST.get('crc', '').strip().upper()
        fee = request.POST.get('Fee', '0').strip()
        email = request.POST.get('EMail', '').strip()
        payment_method = request.POST.get('PaymentMethod', '').strip()
        inc_curr_label = request.POST.get('IncCurrLabel', '').strip()
        is_test = request.POST.get('IsTest', '0').strip()

        add_log(f"📋 РАСПАРСЕННЫЕ ПАРАМЕТРЫ:")
        add_log(f"  OutSum: '{out_sum}'")
        add_log(f"  InvId: '{inv_id}'")
        add_log(f"  SignatureValue: '{signature_value}'")
        add_log(f"  Fee: '{fee}'")
        add_log(f"  EMail: '{email}'")
        add_log(f"  PaymentMethod: '{payment_method}'")
        add_log(f"  IncCurrLabel: '{inc_curr_label}'")
        add_log(f"  IsTest: '{is_test}'")

        # Проверяем обязательные параметры
        if not out_sum:
            add_log("❌ ОШИБКА: Отсутствует параметр OutSum")
            return HttpResponse('ERROR: Missing OutSum', status=400)

        if not inv_id:
            add_log("❌ ОШИБКА: Отсутствует параметр InvId")
            return HttpResponse('ERROR: Missing InvId', status=400)

        if not signature_value:
            add_log("❌ ОШИБКА: Отсутствует параметр SignatureValue")
            return HttpResponse('ERROR: Missing SignatureValue', status=400)

        # Преобразуем InvId в число
        try:
            inv_id_int = int(inv_id)
            add_log(f"✅ InvId преобразован в число: {inv_id_int}")
        except (TypeError, ValueError) as e:
            add_log(f"❌ ОШИБКА: Неверный формат InvId: {inv_id}, ошибка: {str(e)}")
            return HttpResponse('ERROR: Invalid InvId format', status=400)

        # Собираем пользовательские параметры (Shp_*)
        shp_params = {}
        for key, value in request.POST.items():
            if key.startswith('Shp_'):
                shp_params[key] = value.strip()
                add_log(f"  Пользовательский параметр: {key} = {value}")

        add_log(f"📦 Найдено пользовательских параметров: {len(shp_params)}")

        # Сортируем пользовательские параметры по алфавиту
        sorted_shp_params = sorted(shp_params.items())
        add_log(f"📦 Отсортированные Shp параметры: {sorted_shp_params}")

        # Получаем пароль для проверки подписи
        try:
            password1, password2 = get_robokassa_passwords()
            add_log(f"🔑 Получены пароли Robokassa (первые 5 символов password2): {password2[:5]}...")
        except Exception as e:
            add_log(f"❌ ОШИБКА: Не удалось получить пароли Robokassa: {str(e)}")
            return HttpResponse('ERROR: Cannot get Robokassa passwords', status=500)

        # Правильная база для расчета контрольной суммы
        signature_base = f"{out_sum}:{inv_id}:{password2}"
        add_log(f"🔢 База для подписи (без Shp): {signature_base}")

        # Добавляем пользовательские параметры если они есть
        for key, value in sorted_shp_params:
            signature_base += f":{key}={value}"

        add_log(f"🔢 Полная база для подписи: {signature_base}")

        # Рассчитываем ожидаемую подпись (MD5 в верхнем регистре)
        expected_signature = hashlib.md5(signature_base.encode('utf-8')).hexdigest().upper()
        add_log(f"✅ Рассчитанная подпись: {expected_signature}")
        add_log(f"📨 Полученная подпись: {signature_value}")

        # Проверяем подпись
        if signature_value != expected_signature:
            add_log(f"❌ ОШИБКА: Неверная подпись!")
            add_log(f"   Ожидалось: {expected_signature}")
            add_log(f"   Получено:  {signature_value}")
            add_log(f"   База была: {signature_base}")
            return HttpResponse('ERROR: Invalid signature', status=400)
        else:
            add_log("✅ Подпись верна!")

        # Ищем покупку по order_number
        add_log(f"🔍 Поиск покупки с order_number: {inv_id_int}")
        try:
            purchase = UserPurchase.objects.get(order_number=inv_id_int)
            add_log(f"✅ Покупка найдена: {purchase.id}, статус: {purchase.status}")
            add_log(f"   Цена в покупке: {purchase.price_paid}")
            add_log(f"   Полученная сумма: {out_sum}")

            # Проверяем сумму
            expected_amount = str(purchase.price_paid) if purchase.price_paid else '0'
            add_log(f"💰 Сравнение сумм: ожидаемая '{expected_amount}' vs полученная '{out_sum}'")

            # Нормализуем суммы для сравнения
            try:
                received_amount_normalized = str(float(out_sum))
                expected_amount_normalized = str(float(expected_amount))
                add_log(f"💰 Нормализованные суммы: полученная '{received_amount_normalized}' vs ожидаемая '{expected_amount_normalized}'")
            except ValueError as e:
                add_log(f"⚠️  Предупреждение: ошибка нормализации сумм: {str(e)}")
                received_amount_normalized = out_sum
                expected_amount_normalized = expected_amount

            if received_amount_normalized != expected_amount_normalized:
                add_log(f"⚠️  Предупреждение: несовпадение сумм для заказа #{inv_id}")
                add_log(f"   Получено: {received_amount_normalized}")
                add_log(f"   Ожидалось: {expected_amount_normalized}")
                # В тестовом режиме можем пропустить, в боевом - нужно проверять строго
                if not getattr(settings, 'ROBOKASSA_TEST_MODE', True) and is_test != '1':
                    add_log("❌ ОШИБКА: Несовпадение сумм в боевом режиме")
                    return HttpResponse('ERROR: Amount mismatch', status=400)
                else:
                    add_log("✅ Несовпадение сумм проигнорировано (тестовый режим)")

            # Обновляем статус покупки
            add_log(f"🔄 Обновление статуса покупки на 'paid'")
            purchase.status = 'paid'
            purchase.save()
            add_log(f"✅ Статус покупки обновлен")

            add_log(f"🎉 Заказ #{inv_id} успешно обработан и помечен как оплаченный")

            # СОХРАНЯЕМ ЛОГ В ФАЙЛ
            try:
                with open('/tmp/robokassa_payment_log.txt', 'a', encoding='utf-8') as f:
                    f.write("\n".join(log_lines) + "\n" + "="*50 + "\n")
            except Exception as e:
                add_log(f"⚠️  Не удалось сохранить лог в файл: {str(e)}")

            # Robokassa ожидает ответ в формате OK{InvId}
            response_text = f'OK{inv_id}'
            add_log(f"📤 Отправляем ответ Robokassa: {response_text}")
            return HttpResponse(response_text, content_type='text/plain')

        except UserPurchase.DoesNotExist:
            add_log(f"❌ ОШИБКА: Заказ не найден в базе: #{inv_id_int}")
            # Логируем все существующие заказы для отладки
            try:
                all_orders = UserPurchase.objects.values('id', 'order_number', 'status')[:10]
                add_log(f"📋 Последние 10 заказов в базе: {list(all_orders)}")
            except Exception as e:
                add_log(f"⚠️  Не удалось получить список заказов: {str(e)}")

            return HttpResponse('ERROR: Order not found', status=404)

        except Exception as e:
            add_log(f"❌ ОШИБКА при обработке заказа #{inv_id}: {str(e)}")
            import traceback
            add_log(f"TRACEBACK: {traceback.format_exc()}")
            return HttpResponse(f'ERROR: {str(e)}', status=500)

    except Exception as e:
        add_log(f"❌ НЕОЖИДАННАЯ ОШИБКА в payment_result: {str(e)}")
        import traceback
        add_log(f"TRACEBACK: {traceback.format_exc()}")

        # Сохраняем лог при ошибке
        try:
            with open('/tmp/robokassa_payment_errors.txt', 'a', encoding='utf-8') as f:
                f.write("\n".join(log_lines) + "\n" + "="*50 + "\n")
        except:
            pass

        return HttpResponse('ERROR: Internal server error', status=500)


@api_view(["GET", "POST"])
def payment_success(request):
    """
    Обработка успешного платежа (SuccessURL)
    """
    try:
        inv_id = request.GET.get("InvId") or request.POST.get("InvId")

        if not inv_id:
            return Response({"error": "Missing InvId parameter"}, status=400)

        # ИСПРАВЛЕНО: ищем по order_number
        try:
            inv_id_int = int(inv_id)
        except (TypeError, ValueError):
            return Response({"error": "Invalid InvId format"}, status=400)

        try:
            purchase = UserPurchase.objects.get(order_number=inv_id_int)

            if purchase.status != "paid":
                return Response(
                    {
                        "success": False,
                        "message": "Платеж еще не подтвержден",
                        "purchase_id": str(purchase.id),  # UUID
                        "order_number": purchase.order_number,  # Число
                        "status": purchase.status,
                    }
                )

            return Response(
                {
                    "success": True,
                    "purchase_id": str(purchase.id),  # UUID
                    "order_number": purchase.order_number,  # Число
                    "menu_name": purchase.premium_meal_plan.name,
                    "status": purchase.status,
                }
            )

        except UserPurchase.DoesNotExist:
            return Response({"error": "Order not found"}, status=404)

    except Exception as e:
        logger.error(f"Error in payment_success: {str(e)}")
        return Response({"error": "Internal server error"}, status=500)


@api_view(["GET", "POST"])
def payment_fail(request):
    """
    Обработка неудачного платежа (FailURL)
    """
    try:
        inv_id = request.GET.get("InvId") or request.POST.get("InvId")

        if not inv_id:
            return Response({"error": "Missing InvId parameter"}, status=400)

        # ИСПРАВЛЕНО: ищем по order_number
        try:
            inv_id_int = int(inv_id)
        except (TypeError, ValueError):
            return Response({"error": "Invalid InvId format"}, status=400)

        try:
            purchase = UserPurchase.objects.get(order_number=inv_id_int)

            if purchase.status != "paid":
                purchase.status = "cancelled"
                purchase.save()

            return Response(
                {
                    "success": False,
                    "purchase_id": str(purchase.id),  # UUID
                    "order_number": purchase.order_number,  # Число
                    "menu_name": purchase.premium_meal_plan.name,
                    "status": purchase.status,
                }
            )

        except UserPurchase.DoesNotExist:
            return Response({"error": "Order not found"}, status=404)

    except Exception as e:
        logger.error(f"Error in payment_fail: {str(e)}")
        return Response({"error": "Internal server error"}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment(request):
    """
    Создание платежа в Robokassa
    """
    premium_meal_plan_id = request.data.get('premium_meal_plan_id')

    try:
        premium_meal_plan = PremiumMealPlan.objects.get(id=premium_meal_plan_id, is_active=True)
    except PremiumMealPlan.DoesNotExist:
        return Response({'error': 'Меню не найдено'}, status=404)

    # ИСПРАВЛЕНИЕ: Проверяем, есть ли уже активная покупка (paid или processing)
    active_purchase = UserPurchase.objects.filter(
        user=request.user,
        premium_meal_plan=premium_meal_plan,
        status__in=['paid', 'processing']
    ).first()

    if active_purchase:
        if active_purchase.status == 'paid':
            return Response({'error': 'Меню уже куплено'}, status=400)
        elif active_purchase.status == 'processing':
            return Response({'error': 'Платеж уже в обработке'}, status=400)

    # ИСПРАВЛЕНИЕ: Всегда создаем новую покупку, даже если есть отмененные
    purchase = UserPurchase.objects.create(
        user=request.user,
        premium_meal_plan=premium_meal_plan,
        price_paid=premium_meal_plan.price,
        status='processing'
    )

    # Получаем пароли в зависимости от режима
    password1, password2 = get_robokassa_passwords()

    # Формируем параметры для Robokassa
    merchant_login = settings.ROBOKASSA_MERCHANT_LOGIN
    out_sum = str(purchase.price_paid) if purchase.price_paid else '0'

    if not settings.ROBOKASSA_TEST_MODE:
        try:
            out_sum = f"{float(out_sum):.6f}"
        except ValueError:
            pass

    inv_id = purchase.order_number

    description = f'Оплата меню: {premium_meal_plan.name}'[:100]
    culture = 'ru'
    encoding = 'utf-8'
    is_test = '1' if settings.ROBOKASSA_TEST_MODE else '0'

    shp_params = {
        'Shp_user': str(request.user.id),
        'Shp_menu': str(premium_meal_plan.id),
        'Shp_purchase': str(purchase.id),
    }

    signature_base = f'{merchant_login}:{out_sum}:{inv_id}:{password1}'

    sorted_shp_params = sorted(shp_params.items())
    for key, value in sorted_shp_params:
        signature_base += f':{key}={value}'

    signature_value = hashlib.md5(signature_base.encode(encoding)).hexdigest().lower()

    settings_param = {
        'PaymentMethods': ['BankCard', 'SBP'],
        'Mode': 'modal'
    }

    payment_params = {
        'MerchantLogin': merchant_login,
        'OutSum': out_sum,
        'InvId': inv_id,
        'Description': description,
        'Culture': culture,
        'Encoding': encoding,
        'IsTest': is_test,
        'SignatureValue': signature_value,
        'Settings': json.dumps(settings_param),
    }

    payment_params.update(shp_params)

    logger.info(f"Created NEW payment for menu {premium_meal_plan.name}, Order: #{inv_id}, test mode: {settings.ROBOKASSA_TEST_MODE}")

    return Response({
        'payment_params': payment_params,
        'purchase_id': str(purchase.id),
        'order_number': purchase.order_number,
        'menu_name': premium_meal_plan.name,
        'is_test': settings.ROBOKASSA_TEST_MODE
    })
